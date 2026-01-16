"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderTracking = exports.getOrderLabel = exports.updateOrderStatus = exports.confirmOrderDelivery = exports.listOrdersForSeller = exports.listAllOrders = exports.listOrdersWithPagination = exports.listOrdersByUser = exports.syncMyFatoorahPayment = exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const productService_1 = require("./productService");
const env_1 = require("../config/env");
const couponService_1 = require("./couponService");
const torodService_1 = require("./torodService");
const myFatoorahService_1 = require("./myFatoorahService");
const orderItemSchema = zod_1.z.object({
    productId: zod_1.z.coerce.number().int().positive(),
    quantity: zod_1.z.coerce.number().int().positive(),
    unitPrice: zod_1.z.coerce.number().positive().optional(),
});
const listOrdersSchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1).optional(),
    page_size: zod_1.z.coerce.number().int().min(1).max(200).default(25).optional(),
    search: zod_1.z.string().optional(),
    sellerId: zod_1.z.coerce.number().optional(),
});
const normalizeShippingType = (value) => {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "redbox" || normalized === "omni") {
        return "torod";
    }
    if (["standard", "express", "torod"].includes(normalized)) {
        return normalized;
    }
    return undefined;
};
const shippingDetailsSchema = zod_1.z.preprocess((value) => {
    if (value && typeof value === "object") {
        const shipping = value;
        const normalizedType = normalizeShippingType(shipping.type) ??
            normalizeShippingType(shipping.shipping_method) ??
            normalizeShippingType(shipping.shippingMethod);
        return {
            name: shipping.name,
            phone: shipping.phone,
            city: shipping.city,
            region: shipping.region ?? shipping.city,
            address: shipping.address,
            type: normalizedType ?? shipping.type,
            customerCityCode: shipping.customerCityCode ??
                shipping.customer_city_code ??
                shipping.city,
            customerCountry: shipping.customerCountry ?? shipping.customer_country ?? "SA",
            codAmount: shipping.codAmount ?? shipping.cod_amount,
            codCurrency: shipping.codCurrency ?? shipping.cod_currency,
            torodShippingCompanyId: shipping.torodShippingCompanyId ??
                shipping.torod_shipping_company_id ??
                shipping.shippingCompanyId ??
                shipping.shipping_company_id,
            torodWarehouseId: shipping.torodWarehouseId ??
                shipping.torod_warehouse_id ??
                shipping.warehouseId ??
                shipping.warehouse_id,
            torodCountryId: shipping.torodCountryId ??
                shipping.torod_country_id ??
                shipping.countryId ??
                shipping.country_id,
            torodRegionId: shipping.torodRegionId ??
                shipping.torod_region_id ??
                shipping.regionId ??
                shipping.region_id,
            torodCityId: shipping.torodCityId ??
                shipping.torod_city_id ??
                shipping.cityId ??
                shipping.city_id,
            torodDistrictId: shipping.torodDistrictId ??
                shipping.torod_district_id ??
                shipping.districtId ??
                shipping.district_id,
            torodMetadata: shipping.torodMetadata ?? shipping.torod_metadata ?? shipping.metadata,
        };
    }
    return value;
}, zod_1.z.object({
    name: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(6),
    city: zod_1.z.string().min(2),
    region: zod_1.z.string().min(2),
    address: zod_1.z.string().min(3),
    type: zod_1.z.enum(["standard", "express", "torod"]).default("standard"),
    customerCityCode: zod_1.z.string().optional(),
    customerCountry: zod_1.z.string().default("SA"),
    codAmount: zod_1.z.coerce.number().nonnegative().optional(),
    codCurrency: zod_1.z.string().default("SAR"),
    torodShippingCompanyId: zod_1.z.string().optional(),
    torodWarehouseId: zod_1.z.string().optional(),
    torodCountryId: zod_1.z.string().optional(),
    torodRegionId: zod_1.z.string().optional(),
    torodCityId: zod_1.z.string().optional(),
    torodDistrictId: zod_1.z.string().optional(),
    torodMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
}));
const createOrderSchema = zod_1.z.object({
    buyerId: zod_1.z.number().int().positive(),
    paymentMethod: zod_1.z.string().min(2),
    paymentMethodId: zod_1.z.coerce.number().int().optional(),
    paymentMethodCode: zod_1.z.string().min(1).optional(),
    shipping: shippingDetailsSchema.optional(),
    items: zod_1.z.array(orderItemSchema).min(1),
    couponCode: zod_1.z.string().min(3).optional(),
    couponCodes: zod_1.z.array(zod_1.z.string().min(3)).max(5).optional(),
});
const createOrder = async (input) => {
    const data = createOrderSchema.parse(input);
    if (!data.shipping) {
        throw errors_1.AppError.badRequest("Shipping details are required");
    }
    const itemMap = new Map();
    for (const item of data.items) {
        const existing = itemMap.get(item.productId);
        if (existing) {
            existing.quantity += item.quantity;
        }
        else {
            itemMap.set(item.productId, {
                productId: item.productId,
                quantity: item.quantity,
            });
        }
    }
    const aggregatedItems = Array.from(itemMap.values());
    if (aggregatedItems.length === 0) {
        throw errors_1.AppError.badRequest("Order items are required");
    }
    const shipping = data.shipping;
    const normalizedPaymentMethod = data.paymentMethod.trim().toLowerCase();
    const isCodPayment = normalizedPaymentMethod === "cod";
    const isMyFatoorahPayment = normalizedPaymentMethod === "myfatoorah";
    const paymentMethodId = data.paymentMethodId;
    const shippingMethod = normalizeShippingType(shipping.type) ?? "standard";
    const requiresTorodShipment = shippingMethod === "torod";
    const shippingOption = shippingMethod === "express" ? "express" : "standard";
    if (requiresTorodShipment) {
        if (!shipping.torodCountryId) {
            throw errors_1.AppError.badRequest("Torod country is required");
        }
        if (!shipping.torodRegionId) {
            throw errors_1.AppError.badRequest("Torod region is required");
        }
        if (!shipping.torodCityId) {
            throw errors_1.AppError.badRequest("Torod city is required");
        }
        if (!shipping.torodDistrictId) {
            throw errors_1.AppError.badRequest("Torod district is required");
        }
    }
    const shippingFeeValue = shippingOption === "express"
        ? env_1.config.shipping.express
        : env_1.config.shipping.standard;
    // validate products and stock
    const products = await client_2.prisma.product.findMany({
        where: {
            id: { in: aggregatedItems.map((item) => item.productId) },
        },
        select: {
            id: true,
            nameAr: true,
            nameEn: true,
            stockQuantity: true,
            status: true,
            basePrice: true,
            sellerId: true,
        },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    if (productMap.size !== aggregatedItems.length) {
        throw errors_1.AppError.badRequest("One or more products are unavailable");
    }
    const subtotal = aggregatedItems.reduce((total, item) => {
        const product = productMap.get(item.productId);
        if (!product) {
            throw errors_1.AppError.badRequest(`Product ${item.productId} not found`);
        }
        return total + product.basePrice.toNumber() * item.quantity;
    }, 0);
    if (subtotal <= 0) {
        throw errors_1.AppError.badRequest("Order subtotal must be greater than zero");
    }
    for (const item of aggregatedItems) {
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
    const normalizedItems = aggregatedItems.map((item) => {
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
    const couponLines = aggregatedItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
            productId: item.productId,
            quantity: item.quantity,
            sellerId: product.sellerId,
            unitPrice: product.basePrice.toNumber(),
        };
    });
    let appliedCoupon = null;
    let appliedCoupons = [];
    let appliedCouponCodes = [];
    if (data.couponCodes && data.couponCodes.length > 0) {
        const prepared = await client_2.prisma.$transaction((tx) => (0, couponService_1.prepareCouponsForOrder)(tx, data.couponCodes, couponLines));
        appliedCoupons = prepared.coupons.map((entry) => ({
            coupon: entry.coupon,
            discountAmount: entry.discountAmount,
        }));
        appliedCouponCodes = appliedCoupons.map((entry) => entry.coupon.code);
    }
    else if (data.couponCode) {
        appliedCoupon = await client_2.prisma.$transaction((tx) => (0, couponService_1.prepareCouponForOrder)(tx, data.couponCode, couponLines));
        if (appliedCoupon) {
            appliedCoupons = [appliedCoupon];
            appliedCouponCodes = [appliedCoupon.coupon.code];
        }
    }
    const discountAmount = appliedCoupons.reduce((total, entry) => total + entry.discountAmount, 0);
    const totalBeforeShipping = Math.max(0, subtotal - discountAmount);
    const totalAmount = totalBeforeShipping + shippingFeeValue;
    const platformFee = totalAmount * env_1.config.platformCommissionRate;
    const shouldRecordCod = shipping.codAmount !== undefined || isCodPayment;
    const codAmount = shipping.codAmount !== undefined
        ? shipping.codAmount
        : shouldRecordCod
            ? totalAmount
            : undefined;
    const codCurrency = shipping.codCurrency ?? "SAR";
    const customerCityCode = shipping.customerCityCode ?? shipping.city;
    const customerCountry = shipping.customerCountry ?? "SA";
    const torodShippingCompanyId = shipping.torodShippingCompanyId;
    const torodWarehouseId = shipping.torodWarehouseId;
    const torodCountryId = shipping.torodCountryId;
    const torodRegionId = shipping.torodRegionId;
    const torodCityId = shipping.torodCityId;
    const torodDistrictId = shipping.torodDistrictId;
    const torodMetadata = shipping.torodMetadata;
    const order = await client_2.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
            data: {
                buyerId: data.buyerId,
                status: client_1.OrderStatus.PENDING,
                paymentMethod: data.paymentMethod,
                myfatoorahMethodId: isMyFatoorahPayment ? paymentMethodId ?? null : null,
                myfatoorahMethodCode: isMyFatoorahPayment
                    ? data.paymentMethodCode ?? null
                    : null,
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
                couponId: appliedCoupon && appliedCoupons.length === 1
                    ? appliedCoupon.coupon.id
                    : null,
                couponCode: appliedCouponCodes.length > 0 ? appliedCouponCodes.join(",") : null,
                codAmount: codAmount !== undefined
                    ? new client_1.Prisma.Decimal(codAmount)
                    : null,
                codCurrency: codAmount !== undefined ? codCurrency : null,
                redboxPointId: null,
                redboxStatus: requiresTorodShipment ? "pending" : null,
                items: {
                    create: normalizedItems,
                },
            },
            include: {
                items: true,
            },
        });
        for (const item of normalizedItems) {
            const updateResult = await tx.product.updateMany({
                where: {
                    id: item.productId,
                    stockQuantity: { gte: item.quantity },
                    status: "PUBLISHED",
                },
                data: {
                    stockQuantity: {
                        decrement: item.quantity,
                    },
                },
            });
            if (updateResult.count === 0) {
                throw errors_1.AppError.badRequest(`Insufficient stock for product ${item.productId}`);
            }
        }
        return created;
    });
    let shipment;
    let torodOrder;
    if (requiresTorodShipment) {
        try {
            const baseMetadata = {
                orderId: order.id,
                buyerId: data.buyerId,
            };
            const metadata = torodMetadata && typeof torodMetadata === "object"
                ? { ...baseMetadata, ...torodMetadata }
                : baseMetadata;
            const torodOrderPayload = {
                reference: `order-${order.id}`,
                customer_name: shipping.name,
                customer_phone: shipping.phone,
                customer_address: shipping.address,
                customer_city: shipping.city,
                customer_region: shipping.region,
                customer_country: customerCountry,
                country_id: torodCountryId,
                region_id: torodRegionId,
                city_id: torodCityId,
                district_id: torodDistrictId,
                payment_method: isCodPayment ? "COD" : "PREPAID",
                cod_amount: codAmount ?? 0,
                cod_currency: codCurrency,
                metadata,
                items: normalizedItems.map((item) => ({
                    name: `Item-${item.productId}`,
                    quantity: item.quantity,
                    price: Number(item.unitPrice),
                    sku: String(item.productId),
                })),
            };
            torodOrder = await (0, torodService_1.createOrder)(torodOrderPayload);
            const shipmentPayload = {};
            if (torodShippingCompanyId) {
                shipmentPayload.shipping_company_id = torodShippingCompanyId;
            }
            if (torodWarehouseId) {
                shipmentPayload.warehouse_id = torodWarehouseId;
            }
            shipment = await (0, torodService_1.shipOrder)(torodOrder.id, Object.keys(shipmentPayload).length > 0 ? shipmentPayload : undefined);
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
    }
    if (appliedCoupons.length > 0) {
        await client_2.prisma.$transaction((tx) => (0, couponService_1.finalizeCouponsUsage)(tx, appliedCoupons.map((entry) => entry.coupon)));
    }
    let paymentUrl = null;
    if (isMyFatoorahPayment) {
        if (!paymentMethodId) {
            throw errors_1.AppError.badRequest("payment_method_id is required");
        }
        const buyer = await client_2.prisma.user.findUnique({
            where: { id: data.buyerId },
            select: { fullName: true, email: true, phone: true },
        });
        const rawInvoiceItems = normalizedItems.map((item) => {
            const product = productMap.get(item.productId);
            const name = product?.nameEn ?? product?.nameAr ?? `Item-${item.productId}`;
            return {
                name,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
            };
        });
        const itemsTotal = rawInvoiceItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const invoiceItems = Math.abs(itemsTotal - totalAmount) <= 0.01 ? rawInvoiceItems : undefined;
        try {
            const paymentInput = {
                paymentMethodId,
                invoiceValue: totalAmount,
                customerName: buyer?.fullName ?? shipping.name,
                customerMobile: buyer?.phone ?? shipping.phone,
                customerReference: `order-${order.id}`,
            };
            if (buyer?.email) {
                paymentInput.customerEmail = buyer.email;
            }
            if (invoiceItems) {
                paymentInput.items = invoiceItems;
            }
            const payment = await (0, myFatoorahService_1.executePayment)(paymentInput);
            paymentUrl = payment.paymentUrl;
            await client_2.prisma.order.update({
                where: { id: order.id },
                data: {
                    myfatoorahInvoiceId: payment.invoiceId,
                    myfatoorahPaymentId: payment.paymentId ?? null,
                    myfatoorahPaymentUrl: payment.paymentUrl,
                    myfatoorahStatus: "initiated",
                },
            });
        }
        catch (error) {
            await client_2.prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: client_1.OrderStatus.CANCELLED, myfatoorahStatus: "failed" },
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
            const friendlyMessage = "تعذر بدء عملية الدفع عبر MyFatoorah، حاول مرة أخرى.";
            if (error instanceof errors_1.AppError) {
                throw new errors_1.AppError(friendlyMessage, error.statusCode, error.details ?? error);
            }
            throw errors_1.AppError.internal(friendlyMessage, error);
        }
    }
    const shipmentId = shipment?.id ?? torodOrder?.id;
    const trackingNumber = shipment?.trackingNumber ?? torodOrder?.trackingNumber ?? order.redboxTrackingNumber;
    const labelUrl = shipment?.labelUrl ?? order.redboxLabelUrl;
    const shipmentStatus = shipment?.status ?? torodOrder?.status ?? "created";
    const updatedOrder = shipment || torodOrder
        ? await client_2.prisma.order.update({
            where: { id: order.id },
            data: {
                redboxShipmentId: shipmentId ?? order.redboxShipmentId,
                redboxTrackingNumber: trackingNumber ?? order.redboxTrackingNumber,
                redboxLabelUrl: labelUrl ?? order.redboxLabelUrl,
                redboxStatus: shipmentStatus ?? "created",
            },
            include: orderInclude,
        })
        : await client_2.prisma.order.findUniqueOrThrow({
            where: { id: order.id },
            include: orderInclude,
        });
    const mapped = mapOrderToDto(updatedOrder);
    if (paymentUrl) {
        mapped.payment_url = paymentUrl;
    }
    return mapped;
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
        torod_shipment_id: order.redboxShipmentId ?? null,
        torod_tracking_number: order.redboxTrackingNumber ?? null,
        torod_label_url: order.redboxLabelUrl ?? null,
        torod_status: order.redboxStatus ?? null,
        payment_method_id: order.myfatoorahMethodId ?? null,
        payment_method_code: order.myfatoorahMethodCode ?? null,
        payment_status: order.myfatoorahStatus ?? null,
        payment_url: order.myfatoorahPaymentUrl ?? null,
        product: summaryItem?.product,
        items,
    };
};
const parseOrderIdFromReference = (reference) => {
    if (!reference)
        return null;
    const trimmed = reference.trim();
    if (!trimmed)
        return null;
    if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
    }
    const match = trimmed.match(/(\d+)/g);
    if (!match)
        return null;
    const last = match[match.length - 1];
    const parsed = Number(last);
    return Number.isFinite(parsed) ? parsed : null;
};
const normalizeStatusValue = (value) => value?.trim().toLowerCase() ?? "";
const isPaidStatus = (invoiceStatus, transactionStatus) => {
    const normalized = normalizeStatusValue(transactionStatus) || normalizeStatusValue(invoiceStatus);
    return ["paid", "success", "successful", "succss", "completed"].includes(normalized);
};
const isFailedStatus = (invoiceStatus, transactionStatus) => {
    const normalized = normalizeStatusValue(transactionStatus) || normalizeStatusValue(invoiceStatus);
    return ["failed", "error", "declined", "expired", "cancelled", "canceled"].includes(normalized);
};
const syncMyFatoorahPayment = async (payload) => {
    const orderIdFromReference = parseOrderIdFromReference(payload.customerReference);
    let order = orderIdFromReference
        ? await client_2.prisma.order.findUnique({
            where: { id: orderIdFromReference },
            include: orderInclude,
        })
        : null;
    if (!order && payload.invoiceId) {
        order = await client_2.prisma.order.findFirst({
            where: { myfatoorahInvoiceId: payload.invoiceId },
            include: orderInclude,
        });
    }
    if (!order && payload.paymentId) {
        order = await client_2.prisma.order.findFirst({
            where: { myfatoorahPaymentId: payload.paymentId },
            include: orderInclude,
        });
    }
    if (!order) {
        throw errors_1.AppError.notFound("Order not found");
    }
    const paid = isPaidStatus(payload.invoiceStatus, payload.transactionStatus);
    const failed = isFailedStatus(payload.invoiceStatus, payload.transactionStatus);
    const statusText = payload.invoiceStatus ?? payload.transactionStatus ?? order.myfatoorahStatus ?? "pending";
    const updateData = {
        myfatoorahStatus: statusText,
        ...(payload.invoiceId ? { myfatoorahInvoiceId: payload.invoiceId } : {}),
        ...(payload.paymentId ? { myfatoorahPaymentId: payload.paymentId } : {}),
    };
    if (paid && order.status === client_1.OrderStatus.PENDING) {
        updateData.status = client_1.OrderStatus.PROCESSING;
    }
    if (failed && order.status === client_1.OrderStatus.PENDING) {
        updateData.status = client_1.OrderStatus.CANCELLED;
    }
    const updated = await client_2.prisma.order.update({
        where: { id: order.id },
        data: updateData,
        include: orderInclude,
    });
    return {
        order: mapOrderToDto(updated),
        payment_status: paid ? "paid" : failed ? "failed" : "pending",
        raw: payload.raw ?? null,
    };
};
exports.syncMyFatoorahPayment = syncMyFatoorahPayment;
const listOrdersByUser = async (userId) => {
    const orders = await client_2.prisma.order.findMany({
        where: { buyerId: userId },
        include: orderInclude,
        orderBy: { createdAt: "desc" },
    });
    return orders.map(mapOrderToDto);
};
exports.listOrdersByUser = listOrdersByUser;
const buildOrdersSearchWhere = (search) => {
    if (!search) {
        return undefined;
    }
    const term = search.trim();
    if (!term) {
        return undefined;
    }
    const maybeId = Number(term);
    const numericFilters = Number.isNaN(maybeId)
        ? []
        : [
            { id: maybeId },
            { buyerId: maybeId },
        ];
    return {
        OR: [
            { shippingName: { contains: term } },
            { shippingPhone: { contains: term } },
            { couponCode: { contains: term } },
            {
                items: {
                    some: {
                        product: {
                            OR: [
                                { nameEn: { contains: term } },
                                { nameAr: { contains: term } },
                                { brand: { contains: term } },
                            ],
                        },
                    },
                },
            },
            ...numericFilters,
        ],
    };
};
const mapOrdersForSeller = (orders, sellerId) => orders.map((order) => {
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
const listOrdersWithPagination = async (options = {}) => {
    const { status, page = 1, page_size = 25, search, sellerId } = listOrdersSchema.parse(options ?? {});
    const where = {};
    if (status) {
        where.status = friendlyToStatus(status);
    }
    if (sellerId) {
        where.items = {
            some: {
                product: { sellerId },
            },
        };
    }
    const searchWhere = buildOrdersSearchWhere(search);
    if (searchWhere) {
        Object.assign(where, searchWhere);
    }
    const countsWhere = {
        ...(sellerId
            ? {
                items: {
                    some: {
                        product: { sellerId },
                    },
                },
            }
            : {}),
        ...(searchWhere ?? {}),
    };
    const [total, orders, statusCounts] = await client_2.prisma.$transaction([
        client_2.prisma.order.count({ where }),
        client_2.prisma.order.findMany({
            where,
            include: orderInclude,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * page_size,
            take: page_size,
        }),
        client_2.prisma.order.groupBy({
            by: ["status"],
            where: countsWhere,
            _count: { status: true },
            orderBy: { status: "asc" },
        }),
    ]);
    const mapped = sellerId ? mapOrdersForSeller(orders, sellerId) : orders.map(mapOrderToDto);
    const status_counts = statusCounts.reduce((acc, row) => {
        const count = typeof row._count === "object" && row._count ? row._count.status ?? 0 : 0;
        acc[statusToFriendly(row.status)] = count;
        return acc;
    }, {});
    return {
        orders: mapped,
        total,
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
        status_counts,
    };
};
exports.listOrdersWithPagination = listOrdersWithPagination;
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
    return mapOrdersForSeller(orders, sellerId);
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
    if (!order.redboxTrackingNumber || order.shippingMethod?.toLowerCase() !== "torod") {
        throw errors_1.AppError.badRequest("لا توجد شحنة طُرُد مرتبطة بهذا الطلب");
    }
    const shipment = await (0, torodService_1.trackShipment)(order.redboxTrackingNumber);
    const labelUrl = shipment.labelUrl || order.redboxLabelUrl || "";
    const updated = await client_2.prisma.order.update({
        where: { id: order.id },
        data: {
            redboxLabelUrl: labelUrl || order.redboxLabelUrl,
            redboxTrackingNumber: shipment.trackingNumber ?? order.redboxTrackingNumber,
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
    if (!order.redboxTrackingNumber) {
        throw errors_1.AppError.badRequest("No Torod tracking number for this order");
    }
    const shipmentStatus = await (0, torodService_1.trackShipment)(order.redboxTrackingNumber);
    const raw = shipmentStatus.raw;
    const activities = (Array.isArray(raw?.activities) && raw?.activities) ||
        (Array.isArray(raw?.events) && raw?.events) ||
        (Array.isArray(raw?.history) && raw?.history) ||
        [];
    const statusValue = shipmentStatus.status ?? order.redboxStatus ?? statusToFriendly(order.status);
    const trackingNumber = shipmentStatus.trackingNumber ??
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