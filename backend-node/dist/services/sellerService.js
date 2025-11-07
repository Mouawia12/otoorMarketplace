"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSellerOrders = exports.listSellerProductsWithFilters = exports.getSellerDashboardStats = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../prisma/client");
const productService_1 = require("./productService");
const orderService_1 = require("./orderService");
const getSellerDashboardStats = async (sellerId) => {
    const [activeProducts, activeAuctions, pendingOrdersCount, totals] = await client_2.prisma.$transaction([
        client_2.prisma.product.count({
            where: { sellerId, status: "PUBLISHED" },
        }),
        client_2.prisma.auction.count({
            where: { sellerId, status: "ACTIVE" },
        }),
        client_2.prisma.order.count({
            where: {
                status: client_1.OrderStatus.PENDING,
                items: { some: { product: { sellerId } } },
            },
        }),
        client_2.prisma.orderItem.aggregate({
            where: {
                product: { sellerId },
                order: {
                    status: { in: [client_1.OrderStatus.SHIPPED, client_1.OrderStatus.DELIVERED, client_1.OrderStatus.PROCESSING] },
                },
            },
            _sum: {
                totalPrice: true,
            },
        }),
    ]);
    const monthlyEarnings = await client_2.prisma.orderItem.aggregate({
        where: {
            product: { sellerId },
            order: {
                status: client_1.OrderStatus.DELIVERED,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
        },
        _sum: {
            totalPrice: true,
        },
    });
    return {
        totalSales: activeProducts + activeAuctions,
        activeProducts,
        activeAuctions,
        pendingOrders: pendingOrdersCount,
        totalEarnings: Number(totals._sum.totalPrice ?? 0),
        monthlyEarnings: Number(monthlyEarnings._sum.totalPrice ?? 0),
    };
};
exports.getSellerDashboardStats = getSellerDashboardStats;
const listSellerProductsWithFilters = async (sellerId, filters = {}) => {
    const where = {
        sellerId,
    };
    if (filters.status) {
        const normalized = filters.status.toLowerCase();
        if (normalized === "pending") {
            where.status = client_1.ProductStatus.PENDING_REVIEW;
        }
        else {
            const match = Object.values(client_1.ProductStatus).find((status) => status.toLowerCase() === normalized);
            if (match) {
                where.status = match;
            }
        }
    }
    const products = await client_2.prisma.product.findMany({
        where,
        include: {
            images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "desc" },
    });
    return products.map((product) => (0, productService_1.normalizeProduct)(product));
};
exports.listSellerProductsWithFilters = listSellerProductsWithFilters;
const listSellerOrders = async (sellerId, status) => {
    return (0, orderService_1.listOrdersForSeller)(sellerId, status);
};
exports.listSellerOrders = listSellerOrders;
//# sourceMappingURL=sellerService.js.map