"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductRatingSummary = exports.listProductReviews = exports.createProductReview = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const serializer_1 = require("../utils/serializer");
const createReviewSchema = zod_1.z.object({
    userId: zod_1.z.number().int().positive(),
    productId: zod_1.z.number().int().positive(),
    orderId: zod_1.z.number().int().positive(),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().trim().max(500).optional(),
});
const createProductReview = async (input) => {
    const data = createReviewSchema.parse(input);
    const order = await client_2.prisma.order.findFirst({
        where: { id: data.orderId, buyerId: data.userId },
        include: { items: true },
    });
    if (!order) {
        throw errors_1.AppError.notFound("Order not found");
    }
    const allowedStatuses = [
        client_1.OrderStatus.DELIVERED,
        client_1.OrderStatus.SHIPPED,
        client_1.OrderStatus.PROCESSING,
    ];
    if (!allowedStatuses.includes(order.status)) {
        throw errors_1.AppError.badRequest("Order must be delivered before leaving a review");
    }
    const hasProduct = order.items.some((item) => item.productId === data.productId);
    if (!hasProduct) {
        throw errors_1.AppError.badRequest("This product is not part of the selected order");
    }
    const existing = await client_2.prisma.productReview.findFirst({
        where: {
            userId: data.userId,
            productId: data.productId,
            orderId: data.orderId,
        },
    });
    if (existing) {
        throw errors_1.AppError.badRequest("You already reviewed this product for this order");
    }
    const review = await client_2.prisma.productReview.create({
        data: {
            userId: data.userId,
            productId: data.productId,
            orderId: data.orderId,
            rating: data.rating,
            comment: data.comment ?? null,
        },
        include: {
            user: { select: { id: true, fullName: true } },
        },
    });
    return mapReview(review);
};
exports.createProductReview = createProductReview;
const listProductReviews = async (productId) => {
    if (!Number.isFinite(productId)) {
        throw errors_1.AppError.badRequest("Invalid product id");
    }
    const [stats, reviews] = await client_2.prisma.$transaction([
        client_2.prisma.productReview.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: { rating: true },
        }),
        client_2.prisma.productReview.findMany({
            where: { productId },
            orderBy: { createdAt: "desc" },
            take: 30,
            include: {
                user: { select: { id: true, fullName: true } },
            },
        }),
    ]);
    return {
        average: Number(stats._avg.rating ?? 0),
        count: stats._count.rating ?? 0,
        reviews: reviews.map(mapReview),
    };
};
exports.listProductReviews = listProductReviews;
const getProductRatingSummary = async (productId) => {
    const stats = await client_2.prisma.productReview.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
    });
    return {
        rating_avg: Number(stats._avg.rating ?? 0),
        rating_count: stats._count.rating ?? 0,
    };
};
exports.getProductRatingSummary = getProductRatingSummary;
const mapReview = (review) => {
    const plain = (0, serializer_1.toPlainObject)(review);
    return {
        id: plain.id,
        rating: plain.rating,
        comment: plain.comment ?? "",
        created_at: plain.createdAt,
        user: plain.user
            ? {
                id: plain.user.id,
                full_name: plain.user.fullName,
            }
            : undefined,
    };
};
//# sourceMappingURL=reviewService.js.map