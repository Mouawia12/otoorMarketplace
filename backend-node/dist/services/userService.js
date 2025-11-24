"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = exports.getUserProfile = void 0;
const client_1 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const serializer_1 = require("../utils/serializer");
const getUserProfile = async (userId) => {
    const user = (await client_1.prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                include: { role: true },
            },
            sellerProfile: true,
        },
    }));
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
        seller_status: user.sellerStatus?.toLowerCase?.() ?? "pending",
        seller_profile: user.sellerProfile
            ? {
                full_name: user.sellerProfile.fullName,
                phone: user.sellerProfile.phone,
                city: user.sellerProfile.city,
                address: user.sellerProfile.address,
                national_id: user.sellerProfile.nationalId,
                iban: user.sellerProfile.iban,
                bank_name: user.sellerProfile.bankName,
                status: user.sellerProfile.status?.toLowerCase?.() ?? user.sellerProfile.status,
            }
            : null,
    });
};
exports.getUserProfile = getUserProfile;
const updateUserProfile = async (userId, data) => {
    const updateData = {};
    if (data.full_name !== undefined)
        updateData.fullName = data.full_name;
    if (data.phone !== undefined)
        updateData.phone = data.phone;
    if (data.avatar_url !== undefined)
        updateData.avatarUrl = data.avatar_url;
    const user = (await client_1.prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
            roles: {
                include: { role: true },
            },
        },
    }));
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
exports.updateUserProfile = updateUserProfile;
//# sourceMappingURL=userService.js.map