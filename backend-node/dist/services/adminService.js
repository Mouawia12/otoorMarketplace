"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminModerationQueue = exports.updateProductStatusAsAdmin = exports.listProductsForAdmin = exports.listPendingProducts = exports.deleteUserByAdmin = exports.updateUserStatus = exports.listUsersForAdmin = exports.getAdminDashboardStats = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const productService_1 = require("./productService");
const env_1 = require("../config/env");
const notificationService_1 = require("./notificationService");
const getAdminDashboardStats = async () => {
    const [totalUsers, totalProducts, pendingProducts, totalOrders, pendingOrders, runningAuctions] = await client_2.prisma.$transaction([
        client_2.prisma.user.count(),
        client_2.prisma.product.count(),
        client_2.prisma.product.count({
            where: { status: client_1.ProductStatus.PENDING_REVIEW },
        }),
        client_2.prisma.order.count(),
        client_2.prisma.order.count({
            where: { status: client_1.OrderStatus.PENDING },
        }),
        client_2.prisma.auction.count({
            where: { status: client_1.AuctionStatus.ACTIVE },
        }),
    ]);
    return {
        total_users: totalUsers,
        total_products: totalProducts,
        pending_products: pendingProducts,
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        running_auctions: runningAuctions,
    };
};
exports.getAdminDashboardStats = getAdminDashboardStats;
const listUsersForAdmin = async () => {
    const users = (await client_2.prisma.user.findMany({
        include: {
            roles: {
                include: { role: true },
            },
            sellerProfile: {
                select: { status: true },
            },
        },
        orderBy: { createdAt: "desc" },
    }));
    return users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        status: user.status,
        roles: user.roles.map((relation) => relation.role.name.toLowerCase()),
        created_at: user.createdAt.toISOString(),
        seller_status: user.sellerStatus?.toLowerCase?.() ?? "pending",
        seller_profile_status: user.sellerProfile?.status?.toLowerCase?.(),
        verified_seller: user.verifiedSeller,
    }));
};
exports.listUsersForAdmin = listUsersForAdmin;
const updateUserStatus = async (userId, updates, allowedRoles) => {
    if (!allowedRoles.some((role) => role === client_1.RoleName.ADMIN || role === client_1.RoleName.SUPER_ADMIN)) {
        throw errors_1.AppError.forbidden();
    }
    const updateData = {};
    if (updates.status) {
        const normalizedStatus = updates.status.toUpperCase();
        if (!Object.values(client_1.UserStatus).includes(normalizedStatus)) {
            throw errors_1.AppError.badRequest("Invalid status value");
        }
        updateData.status = normalizedStatus;
    }
    if (updates.seller_status) {
        const normalizedSellerStatus = updates.seller_status.toUpperCase();
        if (!Object.values(client_1.SellerStatus).includes(normalizedSellerStatus)) {
            throw errors_1.AppError.badRequest("Invalid seller status value");
        }
        updateData.sellerStatus = normalizedSellerStatus;
    }
    const result = await client_2.prisma.$transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
            await tx.user.update({
                where: { id: userId },
                data: updateData,
            });
        }
        else {
            const exists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
            if (!exists) {
                throw errors_1.AppError.notFound("User not found");
            }
        }
        if (updates.roles) {
            if (!Array.isArray(updates.roles) || updates.roles.length === 0) {
                throw errors_1.AppError.badRequest("Roles must be a non-empty array");
            }
            const normalizedRoles = Array.from(new Set(updates.roles.map((role) => role.trim().toUpperCase()).filter((role) => role.length > 0)));
            const invalidRoles = normalizedRoles.filter((role) => !Object.values(client_1.RoleName).includes(role));
            if (invalidRoles.length > 0) {
                throw errors_1.AppError.badRequest(`Invalid roles: ${invalidRoles.join(", ")}`);
            }
            if (normalizedRoles.includes(client_1.RoleName.SUPER_ADMIN) &&
                !allowedRoles.includes(client_1.RoleName.SUPER_ADMIN)) {
                throw errors_1.AppError.forbidden("Only super admins can assign super admin role");
            }
            if (!normalizedRoles.includes(client_1.RoleName.BUYER)) {
                normalizedRoles.push(client_1.RoleName.BUYER);
            }
            const roleRecords = await tx.role.findMany({
                where: { name: { in: normalizedRoles } },
            });
            if (roleRecords.length !== normalizedRoles.length) {
                throw errors_1.AppError.badRequest("Some roles were not found");
            }
            await tx.userRole.deleteMany({ where: { userId } });
            await tx.userRole.createMany({
                data: roleRecords.map((role) => ({ userId, roleId: role.id })),
                skipDuplicates: true,
            });
        }
        const refreshed = await tx.user.findUnique({
            where: { id: userId },
            include: {
                roles: { include: { role: true } },
                sellerProfile: { select: { status: true } },
            },
        });
        if (!refreshed) {
            throw errors_1.AppError.notFound("User not found");
        }
        return refreshed;
    });
    return {
        id: result.id,
        email: result.email,
        full_name: result.fullName,
        status: result.status,
        roles: result.roles.map((relation) => relation.role.name.toLowerCase()),
        seller_status: result.sellerStatus?.toLowerCase?.() ?? "pending",
        seller_profile_status: result.sellerProfile?.status?.toLowerCase?.(),
    };
};
exports.updateUserStatus = updateUserStatus;
const deleteUserByAdmin = async (userId, actorRoles, actorId) => {
    const isAdmin = actorRoles.includes(client_1.RoleName.ADMIN) || actorRoles.includes(client_1.RoleName.SUPER_ADMIN);
    if (!isAdmin) {
        throw errors_1.AppError.forbidden();
    }
    if (actorId && userId === actorId) {
        throw errors_1.AppError.badRequest("You cannot delete your own account");
    }
    const targetUser = await client_2.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
    });
    if (!targetUser) {
        throw errors_1.AppError.notFound("User not found");
    }
    if (targetUser.email.toLowerCase() ===
        env_1.config.accounts.protectedAdminEmail.toLowerCase()) {
        throw errors_1.AppError.forbidden("Cannot delete protected admin account");
    }
    const targetRoles = targetUser.roles.map((r) => r.role.name);
    if (targetRoles.includes(client_1.RoleName.SUPER_ADMIN) &&
        !actorRoles.includes(client_1.RoleName.SUPER_ADMIN)) {
        throw errors_1.AppError.forbidden("Cannot delete a super admin");
    }
    await client_2.prisma.sellerProfile.deleteMany({
        where: { userId },
    });
    await client_2.prisma.user.delete({
        where: { id: userId },
    });
    return { success: true };
};
exports.deleteUserByAdmin = deleteUserByAdmin;
const listPendingProducts = async () => {
    const products = await client_2.prisma.product.findMany({
        where: { status: client_1.ProductStatus.PENDING_REVIEW },
        include: {
            images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "desc" },
    });
    return products.map((product) => (0, productService_1.normalizeProduct)(product));
};
exports.listPendingProducts = listPendingProducts;
const friendlyToProductStatus = (status) => {
    const normalized = status.toLowerCase();
    switch (normalized) {
        case "pending":
        case "pending_review":
            return client_1.ProductStatus.PENDING_REVIEW;
        case "approved":
        case "published":
            return client_1.ProductStatus.PUBLISHED;
        case "draft":
            return client_1.ProductStatus.DRAFT;
        case "rejected":
            return client_1.ProductStatus.REJECTED;
        case "hidden":
        case "archived":
            return client_1.ProductStatus.ARCHIVED;
        default:
            throw errors_1.AppError.badRequest("Unsupported product status value");
    }
};
const listProductsForAdmin = async (status) => {
    const where = {};
    if (status) {
        where.status = friendlyToProductStatus(status);
    }
    else {
        where.status = { not: client_1.ProductStatus.DRAFT };
    }
    const products = await client_2.prisma.product.findMany({
        where,
        include: {
            images: { orderBy: { sortOrder: "asc" } },
            seller: {
                select: {
                    id: true,
                    fullName: true,
                    verifiedSeller: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
    return products.map((product) => (0, productService_1.normalizeProduct)(product));
};
exports.listProductsForAdmin = listProductsForAdmin;
const updateProductStatusAsAdmin = async (productId, status) => {
    const targetStatus = friendlyToProductStatus(status);
    const product = await client_2.prisma.product.update({
        where: { id: productId },
        data: { status: targetStatus },
        include: {
            images: { orderBy: { sortOrder: "asc" } },
            seller: {
                select: {
                    id: true,
                    fullName: true,
                    verifiedSeller: true,
                },
            },
        },
    });
    if (product.sellerId) {
        let notificationType = null;
        let title = "";
        let message = "";
        if (targetStatus === client_1.ProductStatus.PUBLISHED) {
            notificationType = client_1.NotificationType.PRODUCT_APPROVED;
            title = "تم نشر المنتج";
            message = `${product.nameEn ?? "منتجك"} أصبح متاحًا الآن في المتجر.`;
        }
        else if (targetStatus === client_1.ProductStatus.REJECTED) {
            notificationType = client_1.NotificationType.PRODUCT_REJECTED;
            title = "تم رفض المنتج";
            message = `نأسف، لم يتم قبول ${product.nameEn ?? "المنتج"}. يمكنك مراجعة المتطلبات وإعادة الإرسال.`;
        }
        if (notificationType) {
            await (0, notificationService_1.createNotificationForUser)({
                userId: product.sellerId,
                type: notificationType,
                title,
                message,
                data: {
                    productId: product.id,
                    status: targetStatus,
                },
            });
        }
    }
    return (0, productService_1.normalizeProduct)(product);
};
exports.updateProductStatusAsAdmin = updateProductStatusAsAdmin;
const buildModerationItems = (products, orders, auctions) => {
    const productItems = products.map((product) => ({
        id: `product-${product.id}`,
        item_id: product.id,
        type: "product",
        title_en: product.name_en,
        title_ar: product.name_ar,
        created_at: new Date(product.created_at).toISOString(),
        priority: "high",
    }));
    const orderItems = orders.map((order) => {
        const [firstItem] = order.items;
        const product = firstItem?.product;
        return {
            id: `order-${order.id}`,
            item_id: order.id,
            type: "order",
            title_en: product?.name_en ?? `Order #${order.id}`,
            title_ar: product?.name_ar ?? `طلب #${order.id}`,
            created_at: order.createdAt.toISOString(),
            priority: "medium",
        };
    });
    const auctionItems = auctions.map((auction) => {
        const product = auction.product;
        const endTime = new Date(auction.endTime);
        const isEndingSoon = endTime.getTime() - Date.now() < 12 * 60 * 60 * 1000;
        const priority = auction.status === client_1.AuctionStatus.ACTIVE && isEndingSoon ? "high" : "low";
        return {
            id: `auction-${auction.id}`,
            item_id: auction.id,
            type: "auction",
            title_en: product?.name_en ?? `Auction #${auction.id}`,
            title_ar: product?.name_ar ?? `مزاد #${auction.id}`,
            created_at: new Date(auction.startTime).toISOString(),
            priority,
        };
    });
    return [...productItems, ...orderItems, ...auctionItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};
const getAdminModerationQueue = async () => {
    const [rawProducts, rawOrders, rawAuctions] = await client_2.prisma.$transaction([
        client_2.prisma.product.findMany({
            where: { status: client_1.ProductStatus.PENDING_REVIEW },
            include: {
                images: { orderBy: { sortOrder: "asc" } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),
        client_2.prisma.order.findMany({
            where: { status: client_1.OrderStatus.PENDING },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                images: { orderBy: { sortOrder: "asc" } },
                                seller: {
                                    select: {
                                        id: true,
                                        fullName: true,
                                        verifiedSeller: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),
        client_2.prisma.auction.findMany({
            where: { status: { in: [client_1.AuctionStatus.ACTIVE, client_1.AuctionStatus.SCHEDULED] } },
            include: {
                product: {
                    include: {
                        images: { orderBy: { sortOrder: "asc" } },
                        seller: {
                            select: {
                                id: true,
                                fullName: true,
                                verifiedSeller: true,
                            },
                        },
                    },
                },
            },
            orderBy: { endTime: "asc" },
            take: 5,
        }),
    ]);
    const pendingProducts = rawProducts.map((product) => (0, productService_1.normalizeProduct)(product));
    const pendingOrders = rawOrders.map((order) => ({
        id: order.id,
        createdAt: order.createdAt,
        items: order.items.map((item) => {
            const entry = {};
            if (item.product) {
                entry.product = (0, productService_1.normalizeProduct)(item.product);
            }
            return entry;
        }),
    }));
    const activeAuctions = rawAuctions.map((auction) => {
        const entry = {
            id: auction.id,
            startTime: auction.startTime,
            endTime: auction.endTime,
            status: auction.status,
        };
        if (auction.product) {
            entry.product = (0, productService_1.normalizeProduct)(auction.product);
        }
        return entry;
    });
    return buildModerationItems(pendingProducts, pendingOrders, activeAuctions).slice(0, 12);
};
exports.getAdminModerationQueue = getAdminModerationQueue;
//# sourceMappingURL=adminService.js.map