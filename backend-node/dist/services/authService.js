"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = exports.registerUser = exports.loginSchema = exports.registerSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const password_1 = require("../utils/password");
const errors_1 = require("../utils/errors");
const jwt_1 = require("../utils/jwt");
const serializeUser = (user) => ({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    roles: user.roles.map((roleRelation) => roleRelation.role.name.toLowerCase()),
});
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
        include: {
            roles: {
                include: { role: true },
            },
        },
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
const authenticateUser = async (input) => {
    const data = exports.loginSchema.parse(input);
    const user = await client_2.prisma.user.findUnique({
        where: { email: data.email },
        include: {
            roles: {
                include: { role: true },
            },
        },
    });
    if (!user) {
        throw errors_1.AppError.unauthorized("Invalid credentials");
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
//# sourceMappingURL=authService.js.map