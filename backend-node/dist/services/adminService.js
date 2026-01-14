"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminModerationQueue = exports.updateProductStatusAsAdmin = exports.listProductsForAdmin = exports.listPendingProducts = exports.deleteUserByAdmin = exports.updateUserStatus = exports.listUsersForAdmin = exports.getAdminDashboardStats = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const productService_1 = require("./productService");
const env_1 = require("../config/env");
const notificationService_1 = require("./notificationService");
const auditLogService_1 = require("./auditLogService");
const getAdminDashboardStats = async () => {
    const [totalUsers, totalProducts, pendingProducts, totalOrders, pendingOrders, runningAuctions] = await client_2.prisma.$transaction([
        client_2.prisma.user.count({
            where: { status: client_1.UserStatus.ACTIVE },
        }),
        client_2.prisma.product.count({
            where: { status: client_1.ProductStatus.PUBLISHED },
        }),
        client_2.prisma.product.count({
            where: { status: client_1.ProductStatus.PENDING_REVIEW },
        }),
        client_2.prisma.order.count({
            where: { status: { notIn: [client_1.OrderStatus.CANCELLED, client_1.OrderStatus.REFUNDED] } },
        }),
        client_2.prisma.order.count({
            where: { status: client_1.OrderStatus.PENDING },
        }),
        client_2.prisma.auction.count({
            where: {
                status: { in: [client_1.AuctionStatus.ACTIVE, client_1.AuctionStatus.SCHEDULED] },
            },
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
const listUsersSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1).optional(),
    page_size: zod_1.z.coerce.number().int().min(1).max(200).default(25).optional(),
    search: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    seller_status: zod_1.z.string().optional(),
});
const listUsersForAdmin = async (query) => {
    const { page = 1, page_size = 25, search, status, role, seller_status } = listUsersSchema.parse(query ?? {});
    const where = {};
    if (status) {
        const normalized = status.toUpperCase();
        if (Object.values(client_1.UserStatus).includes(normalized)) {
            where.status = normalized;
        }
    }
    if (seller_status) {
        const normalized = seller_status.toUpperCase();
        if (Object.values(client_1.SellerStatus).includes(normalized)) {
            where.sellerStatus = normalized;
        }
    }
    if (role) {
        const normalized = role.toUpperCase();
        if (Object.values(client_1.RoleName).includes(normalized)) {
            where.roles = {
                some: {
                    role: { name: normalized },
                },
            };
        }
    }
    if (search) {
        const term = search.trim();
        if (term) {
            const maybeId = Number(term);
            where.OR = [
                { email: { contains: term } },
                { fullName: { contains: term } },
                ...(Number.isNaN(maybeId) ? [] : [{ id: maybeId }]),
            ];
        }
    }
    const [total, users] = await client_2.prisma.$transaction([
        client_2.prisma.user.count({ where }),
        client_2.prisma.user.findMany({
            where,
            include: {
                roles: {
                    include: { role: true },
                },
                sellerProfile: {
                    select: { status: true },
                },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * page_size,
            take: page_size,
        }),
    ]);
    const items = users.map((user) => ({
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
    return {
        users: items,
        total,
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
    };
};
exports.listUsersForAdmin = listUsersForAdmin;
const updateUserStatus = async (userId, updates, allowedRoles, auditContext) => {
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
    const { updatedUser, changes } = await client_2.prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({
            where: { id: userId },
            include: {
                roles: { include: { role: true } },
                sellerProfile: { select: { status: true } },
            },
        });
        if (!existing) {
            throw errors_1.AppError.notFound("User not found");
        }
        const changeDetails = {};
        const previousRoles = existing.roles.map((relation) => relation.role.name);
        if (Object.keys(updateData).length === 0 && !updates.roles) {
            return { updatedUser: existing, changes: changeDetails };
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
            const sortedPrevRoles = [...previousRoles].sort();
            const sortedNewRoles = [...normalizedRoles].sort();
            const rolesChanged = sortedPrevRoles.length !== sortedNewRoles.length ||
                sortedNewRoles.some((role, idx) => sortedPrevRoles[idx] !== role);
            if (rolesChanged) {
                changeDetails.roles = {
                    from: previousRoles.map((role) => role.toLowerCase()),
                    to: normalizedRoles.map((role) => role.toLowerCase()),
                };
            }
        }
        if (Object.keys(updateData).length > 0) {
            await tx.user.update({
                where: { id: userId },
                data: updateData,
            });
            if (updateData.status && existing.status !== updateData.status) {
                changeDetails.status = {
                    from: existing.status.toLowerCase(),
                    to: updateData.status.toLowerCase(),
                };
            }
            if (updateData.sellerStatus && existing.sellerStatus !== updateData.sellerStatus) {
                changeDetails.seller_status = {
                    from: existing.sellerStatus?.toLowerCase(),
                    to: updateData.sellerStatus.toLowerCase(),
                };
            }
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
        return { updatedUser: refreshed, changes: changeDetails };
    });
    if (auditContext?.actorId) {
        const entries = Object.entries(changes).map(([field, diff]) => ({
            field: field,
            from: diff.from,
            to: diff.to,
        }));
        const auditBase = {
            actorId: auditContext.actorId,
        };
        const withIp = (payload) => auditContext.ipAddress
            ? { ...payload, ipAddress: auditContext.ipAddress }
            : payload;
        if (entries.length === 0) {
            await (0, auditLogService_1.safeRecordAdminAuditLog)(withIp({
                ...auditBase,
                action: "user.update",
                targetType: "user",
                targetId: userId,
                description: `Updated user ${userId} (no field changes detected)`,
                metadata: { submitted: updates },
            }));
        }
        else {
            const actionsMap = {
                status: "user.status",
                seller_status: "user.seller_status",
                roles: "user.roles",
            };
            await Promise.all(entries.map((entry) => (0, auditLogService_1.safeRecordAdminAuditLog)(withIp({
                ...auditBase,
                action: actionsMap[entry.field],
                targetType: "user",
                targetId: userId,
                description: `Updated ${entry.field} for user ${userId}: ${entry.from ?? "-"} -> ${entry.to ?? "-"}`,
                metadata: { field: entry.field, from: entry.from, to: entry.to },
            }))));
        }
    }
    return {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.fullName,
        status: updatedUser.status,
        roles: updatedUser.roles.map((relation) => relation.role.name.toLowerCase()),
        seller_status: updatedUser.sellerStatus?.toLowerCase?.() ?? "pending",
        seller_profile_status: updatedUser.sellerProfile?.status?.toLowerCase?.(),
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
const listProductsSchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    seller_id: zod_1.z.coerce.number().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1).optional(),
    page_size: zod_1.z.coerce.number().int().min(1).max(200).default(25).optional(),
});
const listProductsForAdmin = async (query) => {
    const { status, search, seller_id, page = 1, page_size = 25 } = listProductsSchema.parse(query ?? {});
    const where = {};
    if (status) {
        where.status = friendlyToProductStatus(status);
    }
    else {
        where.status = { not: client_1.ProductStatus.DRAFT };
    }
    if (seller_id) {
        where.sellerId = seller_id;
    }
    if (search) {
        const term = search.trim();
        if (term) {
            const maybeId = Number(term);
            where.OR = [
                { nameEn: { contains: term } },
                { nameAr: { contains: term } },
                { brand: { contains: term } },
                { slug: { contains: term } },
                ...(Number.isNaN(maybeId) ? [] : [{ id: maybeId }]),
            ];
        }
    }
    const [total, products, statusCounts] = await client_2.prisma.$transaction([
        client_2.prisma.product.count({ where }),
        client_2.prisma.product.findMany({
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
            skip: (page - 1) * page_size,
            take: page_size,
        }),
        client_2.prisma.product.groupBy({
            by: ["status"],
            _count: { status: true },
            orderBy: { status: "asc" },
            ...(seller_id ? { where: { sellerId: seller_id } } : {}),
        }),
    ]);
    const counts = statusCounts.reduce((acc, row) => {
        const count = typeof row._count === "object" && row._count ? row._count.status ?? 0 : 0;
        acc[row.status] = count;
        return acc;
    }, {});
    return {
        products: products.map((product) => (0, productService_1.normalizeProduct)(product)),
        total,
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
        status_counts: counts,
    };
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
        const priority = auction.status === client_1.AuctionStatus.PENDING_REVIEW
            ? "high"
            : auction.status === client_1.AuctionStatus.ACTIVE && isEndingSoon
                ? "high"
                : "low";
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
            where: {
                status: {
                    in: [
                        client_1.AuctionStatus.PENDING_REVIEW,
                        client_1.AuctionStatus.ACTIVE,
                        client_1.AuctionStatus.SCHEDULED,
                    ],
                },
            },
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