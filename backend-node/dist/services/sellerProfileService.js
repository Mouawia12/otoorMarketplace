"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSellerProfileStatus = exports.listSellerProfiles = exports.getSellerProfile = exports.upsertSellerProfile = void 0;
const zod_1 = require("zod");
const client_1 = require("../prisma/client");
const serializer_1 = require("../utils/serializer");
const client_2 = require("@prisma/client");
const notificationService_1 = require("./notificationService");
const profileSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(3),
    phone: zod_1.z.string().min(8),
    city: zod_1.z.string().min(2),
    address: zod_1.z.string().min(5),
    national_id: zod_1.z.string().min(8),
    iban: zod_1.z.string().min(10),
    bank_name: zod_1.z.string().min(2),
    torod_warehouse_id: zod_1.z.string().trim().min(1).optional(),
});
const upsertSellerProfile = async (userId, input) => {
    const data = profileSchema.parse(input);
    const profile = await client_1.prisma.sellerProfile.upsert({
        where: { userId },
        update: {
            fullName: data.full_name,
            phone: data.phone,
            city: data.city,
            address: data.address,
            nationalId: data.national_id,
            iban: data.iban,
            bankName: data.bank_name,
            torodWarehouseId: data.torod_warehouse_id ?? null,
            status: client_2.SellerStatus.PENDING,
        },
        create: {
            userId,
            fullName: data.full_name,
            phone: data.phone,
            city: data.city,
            address: data.address,
            nationalId: data.national_id,
            iban: data.iban,
            bankName: data.bank_name,
            torodWarehouseId: data.torod_warehouse_id ?? null,
            status: client_2.SellerStatus.PENDING,
        },
        include: {
            user: { select: { id: true, fullName: true, email: true } },
        },
    });
    await client_1.prisma.user.update({
        where: { id: userId },
        data: {
            sellerStatus: client_2.SellerStatus.PENDING,
            roles: {
                connectOrCreate: {
                    where: {
                        userId_roleId: {
                            userId,
                            roleId: (await ensureSellerRole()).id,
                        },
                    },
                    create: {
                        role: { connect: { name: client_2.RoleName.SELLER } },
                    },
                },
            },
        },
    });
    await (0, notificationService_1.createNotificationForUser)({
        userId,
        type: client_2.NotificationType.SELLER_APPLICATION_SUBMITTED,
        title: "تم استلام طلب التاجر",
        message: "جارٍ مراجعة بياناتك، سيتم إعلامك فور اتخاذ القرار.",
        data: { sellerProfileId: profile.id },
    });
    await (0, notificationService_1.notifyAdmins)({
        type: client_2.NotificationType.SELLER_APPLICATION_SUBMITTED,
        title: "طلب تاجر جديد",
        message: `${profile.user?.fullName ?? "مستخدم"} قدّم طلب بائع.`,
        data: { userId, sellerProfileId: profile.id },
        fallbackToSupport: true,
    });
    return mapProfile(profile);
};
exports.upsertSellerProfile = upsertSellerProfile;
const getSellerProfile = async (userId) => {
    const profile = await client_1.prisma.sellerProfile.findUnique({
        where: { userId },
        include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    if (!profile) {
        return null;
    }
    return mapProfile(profile);
};
exports.getSellerProfile = getSellerProfile;
const listSellerProfiles = async (status) => {
    const profiles = await client_1.prisma.sellerProfile.findMany({
        where: status ? { status } : {},
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
    });
    return profiles.map(mapProfile);
};
exports.listSellerProfiles = listSellerProfiles;
const updateSellerProfileStatus = async (userId, status) => {
    const profile = await client_1.prisma.sellerProfile.update({
        where: { userId },
        data: { status },
        include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    await client_1.prisma.user.update({
        where: { id: userId },
        data: {
            sellerStatus: status,
            verifiedSeller: status === client_2.SellerStatus.APPROVED,
            ...(status === client_2.SellerStatus.APPROVED
                ? {
                    roles: {
                        connectOrCreate: {
                            where: {
                                userId_roleId: {
                                    userId,
                                    roleId: (await ensureSellerRole()).id,
                                },
                            },
                            create: {
                                role: { connect: { name: client_2.RoleName.SELLER } },
                            },
                        },
                    },
                }
                : {}),
        },
    });
    await (0, notificationService_1.createNotificationForUser)({
        userId,
        type: status === client_2.SellerStatus.APPROVED
            ? client_2.NotificationType.SELLER_APPLICATION_APPROVED
            : client_2.NotificationType.SELLER_APPLICATION_REJECTED,
        title: status === client_2.SellerStatus.APPROVED
            ? "مبروك! تمت الموافقة على حساب التاجر"
            : "تحديث حالة طلب التاجر",
        message: status === client_2.SellerStatus.APPROVED
            ? "يمكنك الآن البدء بعرض منتجاتك وبيعها عبر اللوحة."
            : "نأسف، لم يتم اعتماد الطلب. راجع البيانات وأعد الإرسال.",
        data: { sellerProfileId: profile.id, status },
    });
    return mapProfile(profile);
};
exports.updateSellerProfileStatus = updateSellerProfileStatus;
const ensureSellerRole = async () => {
    // Ensure seller role exists, create if missing
    const role = await client_1.prisma.role.upsert({
        where: { name: client_2.RoleName.SELLER },
        update: {},
        create: { name: client_2.RoleName.SELLER },
    });
    return role;
};
const mapProfile = (profile) => {
    const plain = (0, serializer_1.toPlainObject)(profile);
    return {
        id: plain.id,
        user_id: plain.userId,
        full_name: plain.fullName,
        phone: plain.phone,
        city: plain.city,
        address: plain.address,
        national_id: plain.nationalId,
        iban: plain.iban,
        bank_name: plain.bankName,
        torod_warehouse_id: plain.torodWarehouseId ?? null,
        status: plain.status?.toLowerCase?.() ?? plain.status,
        created_at: plain.createdAt,
        updated_at: plain.updatedAt,
        user: plain.user
            ? {
                id: plain.user.id,
                full_name: plain.user.fullName,
                email: plain.user.email,
            }
            : undefined,
    };
};
//# sourceMappingURL=sellerProfileService.js.map