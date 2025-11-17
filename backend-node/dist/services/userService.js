"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = void 0;
const client_1 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const serializer_1 = require("../utils/serializer");
const getUserProfile = async (userId) => {
    const user = await client_1.prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                include: { role: true },
            },
        },
    });
    if (!user) {
        throw errors_1.AppError.notFound("User not found");
    }
    return (0, serializer_1.toPlainObject)({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        created_at: user.createdAt,
        phone: user.phone,
        avatar_url: user.avatarUrl,
        verified_seller: user.verifiedSeller,
        status: user.status,
        roles: user.roles.map((r) => r.role.name.toLowerCase()),
    });
};
exports.getUserProfile = getUserProfile;
//# sourceMappingURL=userService.js.map