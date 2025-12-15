"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.authenticateUser = exports.resetPassword = exports.requestPasswordReset = exports.authenticateWithGoogle = exports.registerUser = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.googleLoginSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const crypto_1 = __importDefault(require("crypto"));
const google_auth_library_1 = require("google-auth-library");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const password_1 = require("../utils/password");
const errors_1 = require("../utils/errors");
const jwt_1 = require("../utils/jwt");
const env_1 = require("../config/env");
const mailer_1 = require("../utils/mailer");
const notificationService_1 = require("./notificationService");
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
        requires_password_reset: user.requiresPasswordReset,
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
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.resetPasswordSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(10),
    password: zod_1.z.string().min(8),
    confirmPassword: zod_1.z.string().min(8),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
const PASSWORD_RESET_EXPIRY_MINUTES = 15;
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
    await (0, notificationService_1.notifyAdmins)({
        type: client_1.NotificationType.USER_REGISTERED,
        title: "تسجيل مستخدم جديد",
        message: `${user.fullName} (${user.email}) انضم إلى المنصة.`,
        data: { userId: user.id, email: user.email },
        fallbackToSupport: true,
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
const requestPasswordReset = async (input) => {
    const data = exports.forgotPasswordSchema.parse(input);
    const user = await client_2.prisma.user.findUnique({
        where: { email: data.email },
    });
    if (!user) {
        throw errors_1.AppError.notFound("الحساب غير موجود");
    }
    await client_2.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
    });
    const rawToken = crypto_1.default.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
    await client_2.prisma.passwordResetToken.create({
        data: {
            token: rawToken,
            userId: user.id,
            expiresAt,
        },
    });
    const resetUrl = `${env_1.config.auth.passwordResetUrl}?token=${encodeURIComponent(rawToken)}`;
    const brandSignature = "FragraWorld | عالم العطور";
    const contactEmail = "fragreworld@gmail.com";
    const plainText = [
        `مرحباً ${user.fullName ?? ''}`.trim(),
        "",
        `تم إرسال هذه الرسالة من ${brandSignature} لتأكيد طلب إعادة تعيين كلمة المرور الخاص بك على منصتنا.`,
        `اضغط على الرابط التالي لإعادة التعيين (صالح لمدة ${PASSWORD_RESET_EXPIRY_MINUTES} دقيقة):`,
        resetUrl,
        "",
        `إذا لم تطلب هذه العملية فتجاهل الرسالة أو راسلنا على ${contactEmail} للمساعدة.`,
        "",
        brandSignature,
    ].join("\n");
    const html = `
    <div style="background:#f7f4ef;padding:32px;font-family:'Cairo','Inter','Segoe UI',sans-serif;direction:rtl;text-align:center;color:#2c2a29;">
      <table role="presentation" style="margin:0 auto;max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
        <tr>
          <td style="padding:28px 28px 8px;">
            <div style="font-size:18px;font-weight:700;color:#a67c52;margin-bottom:4px;">${brandSignature}</div>
            <div style="font-size:24px;font-weight:800;margin:0 0 12px;">إعادة تعيين كلمة المرور</div>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#4d463f;">مرحباً ${user.fullName ?? ""}،</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4d463f;">
              استلمنا طلباً لإعادة تعيين كلمة المرور الخاصة بك على منصتنا. اضغط الزر أدناه لإكمال العملية.
            </p>
            <div style="margin:24px 0;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 22px;background:#caa56a;color:#2c2a29;font-weight:800;text-decoration:none;border-radius:999px;box-shadow:0 8px 20px rgba(202,165,106,0.35);">
                إعادة تعيين كلمة المرور
              </a>
            </div>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6a635b;">
              الرابط صالح لمدة ${PASSWORD_RESET_EXPIRY_MINUTES} دقيقة واحدة فقط.
            </p>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6a635b;">
              إذا لم تطلب هذه العملية يمكنك تجاهل الرسالة أو مراسلة الدعم عبر
              <a href="mailto:${contactEmail}" style="color:#a67c52;font-weight:700;text-decoration:none;">${contactEmail}</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f2e9dc;padding:14px 20px;text-align:center;font-size:13px;color:#655b50;">
            فريق ${brandSignature}
          </td>
        </tr>
      </table>
    </div>
  `;
    await (0, mailer_1.sendMail)({
        to: user.email,
        subject: "إعادة تعيين كلمة المرور",
        html,
        text: plainText,
    });
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (input) => {
    const data = exports.resetPasswordSchema.parse(input);
    const tokenRecord = await client_2.prisma.passwordResetToken.findUnique({
        where: { token: data.token },
    });
    if (!tokenRecord) {
        throw errors_1.AppError.badRequest("الرابط غير صالح أو منتهي");
    }
    if (tokenRecord.usedAt) {
        throw errors_1.AppError.badRequest("تم استخدام رابط إعادة التعيين مسبقاً");
    }
    if (tokenRecord.expiresAt.getTime() < Date.now()) {
        throw errors_1.AppError.badRequest("انتهت صلاحية رابط إعادة التعيين");
    }
    const passwordHash = await (0, password_1.hashPassword)(data.password);
    await client_2.prisma.$transaction([
        client_2.prisma.user.update({
            where: { id: tokenRecord.userId },
            data: { passwordHash },
        }),
        client_2.prisma.passwordResetToken.update({
            where: { id: tokenRecord.id },
            data: { usedAt: new Date() },
        }),
        client_2.prisma.passwordResetToken.deleteMany({
            where: { userId: tokenRecord.userId, id: { not: tokenRecord.id } },
        }),
    ]);
};
exports.resetPassword = resetPassword;
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
        throw errors_1.AppError.forbidden(`Your account is suspended. Please contact support at fragreworld@gmail.com`);
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
            requiresPasswordReset: false,
        },
    });
    return { success: true };
};
exports.changePassword = changePassword;
//# sourceMappingURL=authService.js.map