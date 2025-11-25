"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.authenticateUser = exports.authenticateWithGoogle = exports.registerUser = exports.googleLoginSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const crypto_1 = __importDefault(require("crypto"));
const google_auth_library_1 = require("google-auth-library");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const password_1 = require("../utils/password");
const errors_1 = require("../utils/errors");
const jwt_1 = require("../utils/jwt");
const env_1 = require("../config/env");
const userWithRolesInclude = client_1.Prisma.validator()({
    roles: { include: { role: true } },
    sellerProfile: true,
});
const mapSellerProfile = (profile) => {
    if (!profile) {
        return null;
    }
    return {
        id: profile.id,
        full_name: profile.fullName,
        phone: profile.phone,
        city: profile.city,
        address: profile.address,
        national_id: profile.nationalId,
        iban: profile.iban,
        bank_name: profile.bankName,
        status: profile.status?.toLowerCase?.() ?? profile.status,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
    };
};
const serializeUser = (user) => {
    const sellerProfile = mapSellerProfile(user.sellerProfile);
    return {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        avatar_url: user.avatarUrl,
        created_at: user.createdAt,
        status: user.status,
        roles: user.roles.map((roleRelation) => roleRelation.role.name.toLowerCase()),
        seller_status: user.sellerStatus?.toLowerCase?.() ?? "pending",
        seller_profile_status: sellerProfile?.status,
        seller_profile: sellerProfile,
        seller_profile_submitted: Boolean(sellerProfile),
        verified_seller: user.verifiedSeller,
    };
};
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    fullName: zod_1.z.string().min(3),
    phone: zod_1.z.string().min(6).max(20).optional(),
    roles: zod_1.z.array(zod_1.z.nativeEnum(client_1.RoleName)).default([client_1.RoleName.BUYER]).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(6, "Old password is required"),
    newPassword: zod_1.z.string().min(8, "New password must be at least 8 characters"),
});
exports.googleLoginSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(10, "Invalid Google token"),
    role: zod_1.z
        .enum(["buyer", "seller"])
        .optional()
        .describe("requested role for new accounts (default buyer)"),
});
const registerUser = async (input) => {
    const data = exports.registerSchema.parse(input);
    const roles = data.roles && data.roles.length > 0 ? data.roles : [client_1.RoleName.BUYER];
    const existing = await client_2.prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existing) {
        throw errors_1.AppError.badRequest("Email already registered");
    }
    const passwordHash = await (0, password_1.hashPassword)(data.password);
    const user = await client_2.prisma.user.create({
        data: {
            email: data.email,
            passwordHash,
            fullName: data.fullName,
            phone: data.phone ?? null,
            roles: {
                create: roles.map((roleName) => ({
                    role: {
                        connect: { name: roleName },
                    },
                })),
            },
        },
        include: userWithRolesInclude,
    });
    const token = (0, jwt_1.signAccessToken)({
        sub: user.id,
        roles: user.roles.map((role) => role.role.name),
    });
    return {
        token,
        user: serializeUser(user),
    };
};
exports.registerUser = registerUser;
const getGoogleClient = () => {
    const clientId = env_1.config.google.clientId;
    if (!clientId) {
        throw errors_1.AppError.badRequest("GOOGLE_CLIENT_ID is not configured");
    }
    return { client: new google_auth_library_1.OAuth2Client(clientId), clientId };
};
const authenticateWithGoogle = async (input) => {
    const { client, clientId } = getGoogleClient();
    const data = exports.googleLoginSchema.parse(input);
    let payload;
    try {
        const ticket = await client.verifyIdToken({
            idToken: data.idToken,
            audience: clientId,
        });
        payload = ticket.getPayload();
    }
    catch (error) {
        throw errors_1.AppError.unauthorized("Invalid Google token");
    }
    if (!payload || !payload.email || !payload.email_verified) {
        throw errors_1.AppError.unauthorized("Google account email is not verified");
    }
    const email = payload.email;
    const fullNameFromParts = `${payload.given_name ?? ""} ${payload.family_name ?? ""}`.trim();
    const fullName = payload.name ?? (fullNameFromParts ? fullNameFromParts : undefined);
    const picture = payload.picture ?? undefined;
    const user = (await client_2.prisma.user.findUnique({
        where: { email },
        include: userWithRolesInclude,
    }));
    if (user && user.status === "SUSPENDED") {
        throw errors_1.AppError.forbidden(`Your account is suspended. Please contact support at ${env_1.config.support.email}`);
    }
    let ensuredUser = user;
    if (!ensuredUser) {
        const passwordHash = await (0, password_1.hashPassword)(crypto_1.default.randomBytes(32).toString("hex"));
        const normalizedFullName = (fullName ?? "").trim();
        const createFullName = (normalizedFullName.length > 0 ? normalizedFullName : email.split("@")[0]);
        const requestedRole = data.role === "seller" ? client_1.RoleName.SELLER : client_1.RoleName.BUYER;
        ensuredUser = (await client_2.prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName: createFullName,
                avatarUrl: picture ?? null,
                roles: {
                    create: [{ role: { connect: { name: requestedRole } } }],
                },
            },
            include: userWithRolesInclude,
        }));
    }
    if (!ensuredUser) {
        throw errors_1.AppError.unauthorized("Unable to authenticate with Google");
    }
    const finalUser = ensuredUser;
    const token = (0, jwt_1.signAccessToken)({
        sub: finalUser.id,
        roles: finalUser.roles.map((role) => role.role.name),
    });
    return {
        token,
        user: serializeUser(finalUser),
    };
};
exports.authenticateWithGoogle = authenticateWithGoogle;
const authenticateUser = async (input) => {
    const data = exports.loginSchema.parse(input);
    const user = (await client_2.prisma.user.findUnique({
        where: { email: data.email },
        include: userWithRolesInclude,
    }));
    if (!user) {
        throw errors_1.AppError.unauthorized("Invalid credentials");
    }
    if (user.status === "SUSPENDED") {
        throw errors_1.AppError.forbidden(`Your account is suspended. Please contact support at ${env_1.config.support.email}`);
    }
    const valid = await (0, password_1.verifyPassword)(data.password, user.passwordHash);
    if (!valid) {
        throw errors_1.AppError.unauthorized("Invalid credentials");
    }
    const token = (0, jwt_1.signAccessToken)({
        sub: user.id,
        roles: user.roles.map((role) => role.role.name),
    });
    return {
        token,
        user: serializeUser(user),
    };
};
exports.authenticateUser = authenticateUser;
const changePassword = async (userId, payload) => {
    const data = exports.changePasswordSchema.parse(payload);
    const user = await client_2.prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw errors_1.AppError.unauthorized("User not found");
    }
    const valid = await (0, password_1.verifyPassword)(data.oldPassword, user.passwordHash);
    if (!valid) {
        throw errors_1.AppError.unauthorized("Current password is incorrect");
    }
    const newHash = await (0, password_1.hashPassword)(data.newPassword);
    await client_2.prisma.user.update({
        where: { id: userId },
        data: {
            passwordHash: newHash,
        },
    });
    return { success: true };
};
exports.changePassword = changePassword;
//# sourceMappingURL=authService.js.map