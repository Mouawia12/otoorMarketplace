"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.listOrdersForSeller = exports.listAllOrders = exports.listOrdersByUser = exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const productService_1 = require("./productService");
const env_1 = require("../config/env");
const orderItemSchema = zod_1.z.object({
    productId: zod_1.z.coerce.number().int().positive(),
    quantity: zod_1.z.coerce.number().int().positive(),
    unitPrice: zod_1.z.coerce.number().positive().optional(),
});
const createOrderSchema = zod_1.z.object({
    buyerId: zod_1.z.number().int().positive(),
    paymentMethod: zod_1.z.string().min(2),
    shipping: zod_1.z
        .object({
        name: zod_1.z.string().min(2),
        phone: zod_1.z.string().min(6),
        city: zod_1.z.string().min(2),
        region: zod_1.z.string().min(2),
        address: zod_1.z.string().min(3),
    })
        .optional(),
    items: zod_1.z.array(orderItemSchema).min(1),
    discountAmount: zod_1.z.coerce.number().nonnegative().default(0),
    shippingFee: zod_1.z.coerce.number().nonnegative().default(0),
});
const createOrder = async (input) => {
    const data = createOrderSchema.parse(input);
    const shipping = data.shipping ?? {
        name: "Pending",
        phone: "0000000000",
        city: "Unknown",
        region: "Unknown",
        address: "Pending",
    };
    return client_2.prisma.$transaction(async (tx) => {
        // validate products and stock
        const products = await tx.product.findMany({
            where: {
                id: { in: data.items.map((item) => item.productId) },
            },
            select: {
                id: true,
                stockQuantity: true,
                status: true,
                basePrice: true,
            },
        });
        const productMap = new Map(products.map((product) => [product.id, product]));
        if (productMap.size !== data.items.length) {
            throw errors_1.AppError.badRequest("One or more products are unavailable");
        }
        const subtotal = data.items.reduce((total, item) => {
            const product = productMap.get(item.productId);
            if (!product) {
                throw errors_1.AppError.badRequest(`Product ${item.productId} not found`);
            }
            return total + product.basePrice.toNumber() * item.quantity;
        }, 0);
        if (subtotal <= 0) {
            throw errors_1.AppError.badRequest("Order subtotal must be greater than zero");
        }
        for (const item of data.items) {
            const product = productMap.get(item.productId);
            if (!product) {
                throw errors_1.AppError.badRequest(`Product ${item.productId} not found`);
            }
            if (product.status !== "PUBLISHED") {
                throw errors_1.AppError.badRequest(`Product ${item.productId} is not available`);
            }
            if (product.stockQuantity < item.quantity) {
                throw errors_1.AppError.badRequest(`Insufficient stock for product ${item.productId}`);
            }
        }
        const normalizedItems = data.items.map((item) => {
            const product = productMap.get(item.productId);
            const unitPrice = new client_1.Prisma.Decimal(product.basePrice.toNumber());
            return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice,
                totalPrice: unitPrice.mul(item.quantity),
            };
        });
        const order = await tx.order.create({
            data: {
                buyerId: data.buyerId,
                status: client_1.OrderStatus.PENDING,
                paymentMethod: data.paymentMethod,
                shippingName: shipping.name,
                shippingPhone: shipping.phone,
                shippingCity: shipping.city,
                shippingRegion: shipping.region,
                shippingAddress: shipping.address,
                subtotalAmount: new client_1.Prisma.Decimal(subtotal),
                discountAmount: new client_1.Prisma.Decimal(data.discountAmount),
                shippingFee: new client_1.Prisma.Decimal(data.shippingFee),
                totalAmount: new client_1.Prisma.Decimal(subtotal - data.discountAmount + data.shippingFee),
                platformFee: new client_1.Prisma.Decimal((subtotal - data.discountAmount + data.shippingFee) *
                    env_1.config.platformCommissionRate),
                items: {
                    create: normalizedItems,
                },
            },
            include: {
                items: true,
            },
        });
        // decrement stock
        for (const item of normalizedItems) {
            await tx.product.update({
                where: { id: item.productId },
                data: {
                    stockQuantity: {
                        decrement: item.quantity,
                    },
                },
            });
        }
        return mapOrderToDto(await tx.order.findUniqueOrThrow({
            where: { id: order.id },
            include: orderInclude,
        }));
    });
};
exports.createOrder = createOrder;
const orderInclude = client_1.Prisma.validator()({
    items: {
        include: {
            product: {
                include: {
                    images: {
                        orderBy: { sortOrder: "asc" },
                    },
                },
            },
        },
    },
});
const statusToFriendly = (status) => {
    switch (status) {
        case client_1.OrderStatus.PENDING:
            return "pending";
        case client_1.OrderStatus.PROCESSING:
            return "seller_confirmed";
        case client_1.OrderStatus.SHIPPED:
            return "shipped";
        case client_1.OrderStatus.DELIVERED:
            return "completed";
        case client_1.OrderStatus.CANCELLED:
            return "canceled";
        case client_1.OrderStatus.REFUNDED:
            return "refunded";
        default:
            return status.toLowerCase();
    }
};
const friendlyToStatus = (status) => {
    const normalized = status.toLowerCase();
    switch (normalized) {
        case "pending":
            return client_1.OrderStatus.PENDING;
        case "seller_confirmed":
        case "processing":
            return client_1.OrderStatus.PROCESSING;
        case "shipped":
            return client_1.OrderStatus.SHIPPED;
        case "completed":
        case "delivered":
            return client_1.OrderStatus.DELIVERED;
        case "canceled":
        case "cancelled":
            return client_1.OrderStatus.CANCELLED;
        case "refunded":
            return client_1.OrderStatus.REFUNDED;
        default:
            throw errors_1.AppError.badRequest("Unsupported status value");
    }
};
const mapOrderToDto = (order) => {
    const [item] = order.items;
    const product = item?.product ? (0, productService_1.normalizeProduct)(item.product) : undefined;
    return {
        id: order.id,
        buyer_id: order.buyerId,
        product_id: item?.productId ?? null,
        quantity: item?.quantity ?? 0,
        unit_price: item ? Number(item.unitPrice) : 0,
        total_amount: Number(order.totalAmount ?? item?.totalPrice ?? 0),
        payment_method: order.paymentMethod,
        shipping_address: order.shippingAddress,
        status: statusToFriendly(order.status),
        created_at: order.createdAt.toISOString(),
        platform_fee: Number(order.platformFee ?? 0),
        product,
    };
};
const listOrdersByUser = async (userId) => {
    const orders = await client_2.prisma.order.findMany({
        where: { buyerId: userId },
        include: orderInclude,
        orderBy: { createdAt: "desc" },
    });
    return orders.map(mapOrderToDto);
};
exports.listOrdersByUser = listOrdersByUser;
const listAllOrders = async (status) => {
    const where = {};
    if (status) {
        where.status = friendlyToStatus(status);
    }
    const orders = await client_2.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
    });
    return orders.map(mapOrderToDto);
};
exports.listAllOrders = listAllOrders;
const listOrdersForSeller = async (sellerId, status) => {
    const where = {
        items: {
            some: {
                product: {
                    sellerId,
                },
            },
        },
    };
    if (status) {
        where.status = friendlyToStatus(status);
    }
    const orders = await client_2.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
    });
    return orders
        .map(mapOrderToDto)
        .map((order) => ({
        ...order,
        product: order.product && order.product.seller_id === sellerId
            ? order.product
            : order.product,
    }));
};
exports.listOrdersForSeller = listOrdersForSeller;
const updateOrderStatus = async (orderId, status, actorRoles) => {
    const allowedStatuses = [
        { from: [client_1.OrderStatus.PENDING], to: client_1.OrderStatus.PROCESSING },
        { from: [client_1.OrderStatus.PROCESSING], to: client_1.OrderStatus.SHIPPED },
        { from: [client_1.OrderStatus.SHIPPED], to: client_1.OrderStatus.DELIVERED },
        { from: [client_1.OrderStatus.PENDING, client_1.OrderStatus.PROCESSING], to: client_1.OrderStatus.CANCELLED },
    ];
    const nextStatus = friendlyToStatus(status);
    const order = await client_2.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
        throw errors_1.AppError.notFound("Order not found");
    }
    const canUpdate = allowedStatuses.some((rule) => rule.to === nextStatus && rule.from.includes(order.status));
    if (!canUpdate && nextStatus !== client_1.OrderStatus.CANCELLED) {
        throw errors_1.AppError.badRequest("Invalid status transition");
    }
    const isAdmin = actorRoles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role.toUpperCase()));
    const isSeller = actorRoles.some((role) => role.toUpperCase() === "SELLER");
    if (!isAdmin && nextStatus === client_1.OrderStatus.CANCELLED) {
        throw errors_1.AppError.forbidden();
    }
    if (!isAdmin && !isSeller && nextStatus !== client_1.OrderStatus.DELIVERED) {
        throw errors_1.AppError.forbidden();
    }
    const updated = await client_2.prisma.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: orderInclude,
    });
    return mapOrderToDto(updated);
};
exports.updateOrderStatus = updateOrderStatus;
//# sourceMappingURL=orderService.js.map