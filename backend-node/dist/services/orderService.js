"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderTracking = exports.getOrderLabel = exports.updateOrderStatus = exports.confirmOrderDelivery = exports.listOrdersForSeller = exports.listAllOrders = exports.listOrdersByUser = exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const productService_1 = require("./productService");
const env_1 = require("../config/env");
const couponService_1 = require("./couponService");
const redboxService_1 = require("./redboxService");
const orderItemSchema = zod_1.z.object({
    productId: zod_1.z.coerce.number().int().positive(),
    quantity: zod_1.z.coerce.number().int().positive(),
    unitPrice: zod_1.z.coerce.number().positive().optional(),
});
const shippingDetailsSchema = zod_1.z.preprocess((value) => {
    if (value && typeof value === "object") {
        const shipping = value;
        return {
            name: shipping.name,
            phone: shipping.phone,
            city: shipping.city,
            region: shipping.region,
            address: shipping.address,
            type: shipping.type,
            redboxPointId: shipping.redboxPointId ??
                shipping.redbox_point_id ??
                shipping.point_id,
            customerCityCode: shipping.customerCityCode ?? shipping.customer_city_code ?? shipping.city,
            customerCountry: shipping.customerCountry ?? shipping.customer_country ?? "SA",
            codAmount: shipping.codAmount ?? shipping.cod_amount,
            codCurrency: shipping.codCurrency ?? shipping.cod_currency,
            redboxType: shipping.redboxType ??
                shipping.redbox_type ??
                (shipping.type === "omni" ? "omni" : undefined),
            shipmentType: shipping.shipmentType ??
                shipping.shipment_type ??
                (shipping.type === "omni" ? "omni" : undefined),
        };
    }
    return value;
}, zod_1.z.object({
    name: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(6),
    city: zod_1.z.string().min(2),
    region: zod_1.z.string().min(2),
    address: zod_1.z.string().min(3),
    type: zod_1.z.enum(["standard", "express", "redbox", "omni"]).default("standard"),
    redboxPointId: zod_1.z.string().min(1, "RedBox point_id is required").optional(),
    customerCityCode: zod_1.z.string().optional(),
    customerCountry: zod_1.z.string().default("SA"),
    codAmount: zod_1.z.coerce.number().nonnegative().optional(),
    codCurrency: zod_1.z.string().default("SAR"),
    redboxType: zod_1.z.enum(["redbox", "omni"]).default("redbox"),
    shipmentType: zod_1.z.enum(["direct", "agency", "omni"]).default("direct"),
}));
const createOrderSchema = zod_1.z.object({
    buyerId: zod_1.z.number().int().positive(),
    paymentMethod: zod_1.z.string().min(2),
    shipping: shippingDetailsSchema.optional(),
    items: zod_1.z.array(orderItemSchema).min(1),
    couponCode: zod_1.z.string().min(3).optional(),
});
const createOrder = async (input) => {
    const data = createOrderSchema.parse(input);
    if (!data.shipping) {
        throw errors_1.AppError.badRequest("Shipping details are required");
    }
    const shipping = data.shipping;
    const redboxPointId = shipping.redboxPointId;
    if (!redboxPointId) {
        throw errors_1.AppError.badRequest("RedBox point selection is required");
    }
    const shippingMethod = shipping.type ?? "standard";
    const shippingOption = shippingMethod === "express" ? "express" : "standard";
    const shippingFeeValue = shippingOption === "express"
        ? env_1.config.shipping.express
        : env_1.config.shipping.standard;
    // validate products and stock
    const products = await client_2.prisma.product.findMany({
        where: {
            id: { in: data.items.map((item) => item.productId) },
        },
        select: {
            id: true,
            stockQuantity: true,
            status: true,
            basePrice: true,
            sellerId: true,
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
        const basePriceNumber = product.basePrice.toNumber();
        const unitPrice = new client_1.Prisma.Decimal(basePriceNumber);
        return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            totalPrice: unitPrice.mul(item.quantity),
        };
    });
    const couponLines = data.items.map((item) => {
        const product = productMap.get(item.productId);
        return {
            productId: item.productId,
            quantity: item.quantity,
            sellerId: product.sellerId,
            unitPrice: product.basePrice.toNumber(),
        };
    });
    let appliedCoupon = null;
    if (data.couponCode) {
        appliedCoupon = await client_2.prisma.$transaction((tx) => (0, couponService_1.prepareCouponForOrder)(tx, data.couponCode, couponLines));
    }
    const discountAmount = appliedCoupon?.discountAmount ?? 0;
    const totalBeforeShipping = Math.max(0, subtotal - discountAmount);
    const totalAmount = totalBeforeShipping + shippingFeeValue;
    const platformFee = totalAmount * env_1.config.platformCommissionRate;
    const shouldRecordCod = shipping.codAmount !== undefined ||
        data.paymentMethod.toLowerCase() === "cod";
    const codAmount = shipping.codAmount !== undefined
        ? shipping.codAmount
        : shouldRecordCod
            ? totalAmount
            : undefined;
    const codCurrency = shipping.codCurrency ?? "SAR";
    const customerCityCode = shipping.customerCityCode ?? shipping.city;
    const customerCountry = shipping.customerCountry ?? "SA";
    const redboxShipmentType = shipping.shipmentType ?? "direct";
    const redboxType = shipping.redboxType ??
        (shippingMethod === "omni" ? "omni" : "redbox");
    const order = await client_2.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
            data: {
                buyerId: data.buyerId,
                status: client_1.OrderStatus.PENDING,
                paymentMethod: data.paymentMethod,
                shippingMethod,
                shippingName: shipping.name,
                shippingPhone: shipping.phone,
                shippingCity: shipping.city,
                shippingRegion: shipping.region,
                shippingAddress: shipping.address,
                customerCityCode,
                customerCountry,
                subtotalAmount: new client_1.Prisma.Decimal(subtotal),
                discountAmount: new client_1.Prisma.Decimal(discountAmount),
                shippingFee: new client_1.Prisma.Decimal(shippingFeeValue),
                totalAmount: new client_1.Prisma.Decimal(totalAmount),
                platformFee: new client_1.Prisma.Decimal(platformFee),
                couponId: appliedCoupon?.coupon.id ?? null,
                couponCode: appliedCoupon?.coupon.code ?? null,
                codAmount: codAmount !== undefined
                    ? new client_1.Prisma.Decimal(codAmount)
                    : null,
                codCurrency: codAmount !== undefined ? codCurrency : null,
                redboxPointId,
                redboxStatus: "pending",
                items: {
                    create: normalizedItems,
                },
            },
            include: {
                items: true,
            },
        });
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
        return created;
    });
    let shipment;
    try {
        const shipmentPayload = {
            pointId: redboxPointId,
            reference: `order-${order.id}`,
            type: redboxType,
            customerCityCode,
            customerCountry,
            codAmount: codAmount ?? 0,
            codCurrency,
            metadata: {
                orderId: order.id,
                buyerId: data.buyerId,
            },
            receiver: {
                name: shipping.name,
                phone: shipping.phone,
                cityCode: customerCityCode,
                country: customerCountry,
                address: shipping.address,
            },
            items: normalizedItems.map((item) => ({
                name: `Item-${item.productId}`,
                quantity: item.quantity,
                price: Number(item.unitPrice),
            })),
        };
        if (redboxShipmentType === "agency") {
            shipment = await (0, redboxService_1.createShipmentAgency)(shipmentPayload);
        }
        else if (redboxShipmentType === "omni" || redboxType === "omni") {
            shipment = await (0, redboxService_1.createOmniOrder)(shipmentPayload);
        }
        else {
            shipment = await (0, redboxService_1.createShipmentDirect)(shipmentPayload);
        }
    }
    catch (error) {
        await client_2.prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: order.id },
                data: { status: client_1.OrderStatus.CANCELLED, redboxStatus: "failed" },
            });
            for (const item of normalizedItems) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQuantity: {
                            increment: item.quantity,
                        },
                    },
                });
            }
        });
        const friendlyMessage = "تعذر إنشاء الشحنة مع شركة التوصيل، حاول مرة أخرى أو اختر طريقة شحن أخرى.";
        if (error instanceof errors_1.AppError) {
            throw new errors_1.AppError(friendlyMessage, error.statusCode, error.details ?? error);
        }
        throw errors_1.AppError.internal(friendlyMessage, error);
    }
    if (appliedCoupon) {
        await client_2.prisma.$transaction((tx) => (0, couponService_1.finalizeCouponUsage)(tx, appliedCoupon.coupon));
    }
    const updatedOrder = await client_2.prisma.order.update({
        where: { id: order.id },
        data: {
            redboxShipmentId: shipment.id,
            redboxTrackingNumber: shipment.trackingNumber ?? order.redboxTrackingNumber,
            redboxLabelUrl: shipment.labelUrl ?? order.redboxLabelUrl,
            redboxStatus: shipment.status ?? "created",
        },
        include: orderInclude,
    });
    return mapOrderToDto(updatedOrder);
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
const assertOrderAccess = (order, userId, roles) => {
    const normalizedRoles = roles.map((role) => role.toUpperCase());
    const isAdmin = normalizedRoles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role));
    const isBuyer = order.buyerId === userId;
    const isSeller = order.items.some((item) => item.product?.sellerId === userId);
    if (!isAdmin && !isBuyer && !isSeller) {
        throw errors_1.AppError.forbidden();
    }
};
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
    const items = order.items.map((item) => ({
        id: item.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        total_price: Number(item.totalPrice),
        product: item.product ? (0, productService_1.normalizeProduct)(item.product) : undefined,
    }));
    const [summaryItem] = items;
    return {
        id: order.id,
        buyer_id: order.buyerId,
        product_id: summaryItem?.product_id ?? null,
        quantity: summaryItem?.quantity ?? 0,
        unit_price: summaryItem?.unit_price ?? 0,
        total_amount: Number(order.totalAmount ?? summaryItem?.total_price ?? 0),
        payment_method: order.paymentMethod,
        shipping_address: order.shippingAddress,
        shipping_name: order.shippingName,
        shipping_phone: order.shippingPhone,
        shipping_city: order.shippingCity,
        shipping_region: order.shippingRegion,
        shipping_method: order.shippingMethod,
        shipping_fee: Number(order.shippingFee),
        discount_amount: Number(order.discountAmount ?? 0),
        coupon_code: order.couponCode ?? null,
        status: statusToFriendly(order.status),
        created_at: order.createdAt.toISOString(),
        platform_fee: Number(order.platformFee ?? 0),
        cod_amount: order.codAmount ? Number(order.codAmount) : null,
        cod_currency: order.codCurrency ?? null,
        customer_city_code: order.customerCityCode ?? null,
        customer_country: order.customerCountry ?? null,
        redbox_point_id: order.redboxPointId ?? null,
        redbox_shipment_id: order.redboxShipmentId ?? null,
        redbox_tracking_number: order.redboxTrackingNumber ?? null,
        redbox_label_url: order.redboxLabelUrl ?? null,
        redbox_status: order.redboxStatus ?? null,
        product: summaryItem?.product,
        items,
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
    return orders.map((order) => {
        const dto = mapOrderToDto(order);
        const sellerItems = dto.items?.filter((item) => item.product?.seller_id === sellerId);
        if (!sellerItems || sellerItems.length === 0) {
            return dto;
        }
        const [primary] = sellerItems;
        return {
            ...dto,
            product: primary?.product ?? dto.product,
            product_id: primary?.product_id ?? dto.product_id,
            quantity: sellerItems.reduce((total, item) => total + item.quantity, 0),
            unit_price: primary?.unit_price ?? dto.unit_price,
            items: sellerItems,
        };
    });
};
exports.listOrdersForSeller = listOrdersForSeller;
const confirmOrderDelivery = async (orderId, buyerId) => {
    const order = await client_2.prisma.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
    });
    if (!order || order.buyerId !== buyerId) {
        throw errors_1.AppError.notFound("Order not found");
    }
    if (order.status === client_1.OrderStatus.DELIVERED) {
        return mapOrderToDto(order);
    }
    if (order.status !== client_1.OrderStatus.SHIPPED) {
        throw errors_1.AppError.badRequest("Order is not ready to be confirmed");
    }
    const updated = await client_2.prisma.order.update({
        where: { id: orderId },
        data: { status: client_1.OrderStatus.DELIVERED },
        include: orderInclude,
    });
    return mapOrderToDto(updated);
};
exports.confirmOrderDelivery = confirmOrderDelivery;
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
const getOrderLabel = async (orderId, actorId, actorRoles) => {
    const order = await client_2.prisma.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
    });
    if (!order) {
        throw errors_1.AppError.notFound("Order not found");
    }
    assertOrderAccess(order, actorId, actorRoles);
    if (!order.redboxShipmentId) {
        throw errors_1.AppError.badRequest("No RedBox shipment for this order");
    }
    const label = await (0, redboxService_1.getLabel)(order.redboxShipmentId);
    const labelUrl = label.url ||
        label.labelUrl ||
        label.label_url ||
        label.link ||
        order.redboxLabelUrl ||
        "";
    const updated = await client_2.prisma.order.update({
        where: { id: order.id },
        data: {
            redboxLabelUrl: labelUrl || order.redboxLabelUrl,
        },
        include: orderInclude,
    });
    return {
        label_url: labelUrl || updated.redboxLabelUrl || null,
        tracking_number: updated.redboxTrackingNumber ?? null,
        order: mapOrderToDto(updated),
    };
};
exports.getOrderLabel = getOrderLabel;
const getOrderTracking = async (orderId, actorId, actorRoles) => {
    const order = await client_2.prisma.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
    });
    if (!order) {
        throw errors_1.AppError.notFound("Order not found");
    }
    assertOrderAccess(order, actorId, actorRoles);
    if (!order.redboxShipmentId) {
        throw errors_1.AppError.badRequest("No RedBox shipment for this order");
    }
    const shipmentStatus = await (0, redboxService_1.getStatus)(order.redboxShipmentId);
    let activities = [];
    try {
        const activityResponse = await (0, redboxService_1.getActivities)(order.redboxShipmentId);
        activities = Array.isArray(activityResponse)
            ? activityResponse
            : activityResponse?.activities ?? [];
    }
    catch (error) {
        activities = [];
    }
    const statusValue = shipmentStatus.status ?? order.redboxStatus ?? statusToFriendly(order.status);
    const trackingNumber = shipmentStatus.trackingNumber ??
        shipmentStatus.raw?.tracking_number ??
        order.redboxTrackingNumber;
    const updated = await client_2.prisma.order.update({
        where: { id: order.id },
        data: {
            redboxStatus: statusValue,
            redboxTrackingNumber: trackingNumber,
        },
        include: orderInclude,
    });
    return {
        order_id: updated.id,
        shipment_id: updated.redboxShipmentId,
        tracking_number: trackingNumber,
        status: statusValue,
        activities,
        order: mapOrderToDto(updated),
    };
};
exports.getOrderTracking = getOrderTracking;
//# sourceMappingURL=orderService.js.map