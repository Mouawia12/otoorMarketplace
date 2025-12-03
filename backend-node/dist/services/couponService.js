"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeCouponUsage = exports.prepareCouponForOrder = exports.deleteCoupon = exports.updateCoupon = exports.createCoupon = exports.listCoupons = exports.redeemCoupon = exports.validateCoupon = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const couponLineSchema = zod_1.z.object({
    product_id: zod_1.z.coerce.number().int().positive(),
    quantity: zod_1.z.coerce.number().int().positive(),
});
const validateRequestSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(64),
    items: zod_1.z.array(couponLineSchema).min(1),
});
const redeemRequestSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(64),
});
const couponPayloadSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(64),
    discount_type: zod_1.z.enum(["percentage", "fixed"]),
    discount_value: zod_1.z.coerce.number().positive(),
    expires_at: zod_1.z
        .union([zod_1.z.string(), zod_1.z.coerce.date()])
        .optional()
        .nullable(),
    max_usage: zod_1.z
        .union([zod_1.z.coerce.number().int().positive(), zod_1.z.null()])
        .optional(),
    is_active: zod_1.z.boolean().optional(),
    seller_id: zod_1.z.coerce.number().int().positive().optional().nullable(),
});
const updateCouponSchema = couponPayloadSchema
    .partial()
    .extend({ code: zod_1.z.string().min(3).max(64).optional() });
const normalizeCode = (code) => code.trim().toUpperCase();
const parseDateInput = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            throw errors_1.AppError.badRequest("تاريخ انتهاء غير صالح");
        }
        return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw errors_1.AppError.badRequest("تاريخ انتهاء غير صالح");
    }
    return parsed;
};
const assertCouponIsValid = (coupon) => {
    if (!coupon.isActive) {
        throw errors_1.AppError.badRequest("الكوبون غير مفعّل حالياً");
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
        throw errors_1.AppError.badRequest("انتهت صلاحية هذا الكوبون");
    }
    if (coupon.maxUsage !== null && coupon.maxUsage !== undefined) {
        if (coupon.usageCount >= coupon.maxUsage) {
            throw errors_1.AppError.badRequest("تم الوصول إلى الحد الأقصى لاستخدام هذا الكوبون");
        }
    }
};
const serializeCoupon = (coupon) => ({
    id: coupon.id,
    code: coupon.code,
    discount_type: coupon.discountType.toLowerCase(),
    discount_value: Number(coupon.discountValue),
    expires_at: coupon.expiresAt,
    max_usage: coupon.maxUsage,
    usage_count: coupon.usageCount,
    is_active: coupon.isActive,
    seller_id: coupon.sellerId,
    created_at: coupon.createdAt,
    updated_at: coupon.updatedAt,
});
const findCouponOrThrow = async (code, tx) => {
    const record = await tx.coupon.findUnique({
        where: { code: normalizeCode(code) },
    });
    if (!record) {
        throw errors_1.AppError.badRequest("الكوبون غير موجود");
    }
    assertCouponIsValid(record);
    return record;
};
const calculateDiscountAmount = (coupon, subtotal) => {
    if (subtotal <= 0) {
        return 0;
    }
    const value = Number(coupon.discountValue);
    if (coupon.discountType === "PERCENTAGE") {
        const percentageAmount = (subtotal * value) / 100;
        return Math.min(subtotal, percentageAmount);
    }
    return Math.min(subtotal, value);
};
const computeEligibleSubtotal = (coupon, lines) => {
    const targetSellerId = coupon.sellerId ?? null;
    return lines.reduce((total, line) => {
        if (targetSellerId && line.sellerId !== targetSellerId) {
            return total;
        }
        return total + line.unitPrice * line.quantity;
    }, 0);
};
const normalizeLinesFromProducts = (items, products) => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return items.map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) {
            throw errors_1.AppError.badRequest("أحد المنتجات غير متوفر حالياً");
        }
        return {
            productId: product.id,
            quantity: item.quantity,
            sellerId: product.sellerId,
            unitPrice: Number(product.basePrice),
        };
    });
};
const validateCoupon = async (input) => {
    const data = validateRequestSchema.parse(input);
    const coupon = await findCouponOrThrow(data.code, client_2.prisma);
    const productIds = Array.from(new Set(data.items.map((item) => item.product_id)));
    const products = await client_2.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, basePrice: true, sellerId: true },
    });
    if (products.length === 0) {
        throw errors_1.AppError.badRequest("لا يمكن إيجاد المنتجات المحددة");
    }
    const lines = normalizeLinesFromProducts(data.items, products);
    const eligibleSubtotal = computeEligibleSubtotal(coupon, lines);
    if (eligibleSubtotal <= 0) {
        throw errors_1.AppError.badRequest("لا يمكن تطبيق هذا الكوبون على المنتجات المحددة");
    }
    const discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal);
    return {
        coupon: serializeCoupon(coupon),
        discount_amount: discountAmount,
    };
};
exports.validateCoupon = validateCoupon;
const redeemCoupon = async (input) => {
    const data = redeemRequestSchema.parse(input);
    const coupon = await findCouponOrThrow(data.code, client_2.prisma);
    await incrementUsageCount(client_2.prisma, coupon);
    return {
        coupon: serializeCoupon({
            ...coupon,
            usageCount: coupon.usageCount + 1,
        }),
    };
};
exports.redeemCoupon = redeemCoupon;
const ensureSellerOwnership = (coupon, sellerId) => {
    if (!sellerId) {
        return;
    }
    if (coupon.sellerId !== sellerId) {
        throw errors_1.AppError.forbidden("لا تملك صلاحية الوصول لهذا الكوبون");
    }
};
const listCoupons = async (options) => {
    const where = {};
    if (options?.sellerId) {
        where.sellerId = options.sellerId;
    }
    const coupons = await client_2.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });
    return coupons.map(serializeCoupon);
};
exports.listCoupons = listCoupons;
const createCoupon = async (input, options) => {
    const data = couponPayloadSchema.parse(input);
    const expiresAt = parseDateInput(data.expires_at);
    const sellerId = options?.sellerId ?? data.seller_id ?? null;
    const coupon = await client_2.prisma.coupon.create({
        data: {
            code: normalizeCode(data.code),
            discountType: data.discount_type === "percentage" ? "PERCENTAGE" : "FIXED",
            discountValue: new client_1.Prisma.Decimal(data.discount_value),
            expiresAt,
            maxUsage: data.max_usage ?? null,
            isActive: data.is_active ?? true,
            ...(sellerId ? { seller: { connect: { id: sellerId } } } : {}),
        },
    });
    return serializeCoupon(coupon);
};
exports.createCoupon = createCoupon;
const updateCoupon = async (id, input, options) => {
    const data = updateCouponSchema.parse(input);
    const existing = await client_2.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
        throw errors_1.AppError.notFound("الكوبون غير موجود");
    }
    ensureSellerOwnership(existing, options?.sellerId);
    const updateData = {};
    if (data.code) {
        updateData.code = normalizeCode(data.code);
    }
    if (data.discount_type) {
        updateData.discountType =
            data.discount_type === "percentage" ? "PERCENTAGE" : "FIXED";
    }
    if (typeof data.discount_value === "number") {
        updateData.discountValue = new client_1.Prisma.Decimal(data.discount_value);
    }
    if (data.expires_at !== undefined) {
        updateData.expiresAt = parseDateInput(data.expires_at);
    }
    if (data.max_usage !== undefined) {
        updateData.maxUsage = data.max_usage ?? null;
    }
    if (typeof data.is_active === "boolean") {
        updateData.isActive = data.is_active;
    }
    if (options?.sellerId) {
        updateData.seller = { connect: { id: options.sellerId } };
    }
    else if (data.seller_id !== undefined) {
        updateData.seller = data.seller_id
            ? { connect: { id: data.seller_id } }
            : { disconnect: true };
    }
    const coupon = await client_2.prisma.coupon.update({
        where: { id },
        data: updateData,
    });
    return serializeCoupon(coupon);
};
exports.updateCoupon = updateCoupon;
const deleteCoupon = async (id, options) => {
    const existing = await client_2.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
        throw errors_1.AppError.notFound("الكوبون غير موجود");
    }
    ensureSellerOwnership(existing, options?.sellerId);
    try {
        await client_2.prisma.coupon.delete({
            where: { id },
        });
    }
    catch {
        throw errors_1.AppError.badRequest("تعذر حذف الكوبون، ربما مرتبط بطلبات");
    }
};
exports.deleteCoupon = deleteCoupon;
const incrementUsageCount = async (tx, coupon) => {
    if (coupon.maxUsage === null || coupon.maxUsage === undefined) {
        await tx.coupon.update({
            where: { id: coupon.id },
            data: { usageCount: { increment: 1 } },
        });
        return;
    }
    const updated = await tx.coupon.updateMany({
        where: {
            id: coupon.id,
            usageCount: { lt: coupon.maxUsage },
        },
        data: {
            usageCount: { increment: 1 },
        },
    });
    if (updated.count === 0) {
        throw errors_1.AppError.badRequest("تم الوصول إلى الحد الأقصى لاستخدام هذا الكوبون");
    }
};
const prepareCouponForOrder = async (tx, code, items) => {
    const coupon = await findCouponOrThrow(code, tx);
    const eligibleSubtotal = computeEligibleSubtotal(coupon, items);
    if (eligibleSubtotal <= 0) {
        throw errors_1.AppError.badRequest("لا يمكن تطبيق هذا الكوبون على الطلب الحالي");
    }
    const discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal);
    return { coupon, discountAmount };
};
exports.prepareCouponForOrder = prepareCouponForOrder;
const finalizeCouponUsage = async (tx, coupon) => {
    await incrementUsageCount(tx, coupon);
};
exports.finalizeCouponUsage = finalizeCouponUsage;
//# sourceMappingURL=couponService.js.map