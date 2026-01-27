"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeCouponsUsage = exports.finalizeCouponUsage = exports.prepareCouponsForOrder = exports.prepareCouponForOrder = exports.deleteCoupon = exports.updateCoupon = exports.createCoupon = exports.listCoupons = exports.redeemCoupon = exports.validateCoupon = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const couponLineSchema = zod_1.z.object({
    product_id: zod_1.z.coerce.number().int().positive(),
    quantity: zod_1.z.coerce.number().int().positive(),
});
const validateRequestSchema = zod_1.z
    .object({
    code: zod_1.z.string().min(3).max(64).optional(),
    codes: zod_1.z.array(zod_1.z.string().min(3).max(64)).min(1).max(5).optional(),
    items: zod_1.z.array(couponLineSchema).min(1),
})
    .refine((data) => data.code || (data.codes && data.codes.length > 0), {
    message: "Coupon code is required",
    path: ["code"],
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
const normalizeCodes = (codes) => Array.from(new Set(codes.map((code) => normalizeCode(code)))).filter(Boolean);
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
    seller_email: coupon.seller?.email ?? null,
    seller_name: coupon.seller?.fullName ?? null,
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
const toCents = (value) => Math.max(0, Math.round(value * 100));
const fromCents = (value) => value / 100;
const computeSellerSubtotals = (lines) => {
    const subtotals = new Map();
    for (const line of lines) {
        const lineSubtotal = line.unitPrice * line.quantity;
        subtotals.set(line.sellerId, (subtotals.get(line.sellerId) ?? 0) + lineSubtotal);
    }
    return subtotals;
};
const computeSellerSubtotalsForCoupon = (coupon, lines) => {
    const targetSellerId = coupon.sellerId ?? null;
    const eligibleLines = targetSellerId !== null
        ? lines.filter((line) => line.sellerId === targetSellerId)
        : lines;
    return computeSellerSubtotals(eligibleLines);
};
const mapToRecord = (map) => Array.from(map.entries()).reduce((acc, [sellerId, amount]) => {
    acc[String(sellerId)] = amount;
    return acc;
}, {});
const allocateDiscountAcrossSellers = (discountAmount, sellerSubtotals) => {
    const entries = Array.from(sellerSubtotals.entries()).filter(([, subtotal]) => subtotal > 0);
    if (entries.length === 0 || discountAmount <= 0) {
        return {};
    }
    const totalSubtotalCents = entries.reduce((sum, [, subtotal]) => sum + toCents(subtotal), 0);
    if (totalSubtotalCents <= 0) {
        return {};
    }
    const discountCents = Math.min(toCents(discountAmount), totalSubtotalCents);
    let remainingDiscountCents = discountCents;
    const allocations = new Map();
    entries.forEach(([sellerId, subtotal], index) => {
        const subtotalCents = toCents(subtotal);
        if (subtotalCents <= 0 || remainingDiscountCents <= 0) {
            allocations.set(sellerId, 0);
            return;
        }
        const isLast = index === entries.length - 1;
        const shareCents = isLast
            ? remainingDiscountCents
            : Math.min(remainingDiscountCents, Math.floor((discountCents * subtotalCents) / totalSubtotalCents));
        allocations.set(sellerId, shareCents);
        remainingDiscountCents -= shareCents;
    });
    return Array.from(allocations.entries()).reduce((acc, [sellerId, cents]) => {
        if (cents > 0) {
            acc[String(sellerId)] = fromCents(cents);
        }
        return acc;
    }, {});
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
    const codes = normalizeCodes(data.codes ?? (data.code ? [data.code] : []));
    if (codes.length === 0) {
        throw errors_1.AppError.badRequest("Coupon code is required");
    }
    const productIds = Array.from(new Set(data.items.map((item) => item.product_id)));
    const products = await client_2.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, basePrice: true, sellerId: true },
    });
    if (products.length === 0) {
        throw errors_1.AppError.badRequest("لا يمكن إيجاد المنتجات المحددة");
    }
    const lines = normalizeLinesFromProducts(data.items, products);
    const prepared = await (0, exports.prepareCouponsForOrder)(client_2.prisma, codes, lines);
    return {
        coupons: prepared.coupons.map((entry) => ({
            coupon: serializeCoupon(entry.coupon),
            discount_amount: entry.discountAmount,
            per_seller_discounts: entry.perSellerDiscounts,
        })),
        total_discount: prepared.totalDiscount,
        per_seller_discounts: prepared.perSellerDiscounts,
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
        ...(options?.includeSeller
            ? {
                include: {
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                        },
                    },
                },
            }
            : {}),
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
        throw errors_1.AppError.badRequest("الكوبون غير صالح للاستخدام");
    }
};
const prepareCouponForOrder = async (tx, code, items) => {
    const coupon = await findCouponOrThrow(code, tx);
    const eligibleSubtotal = computeEligibleSubtotal(coupon, items);
    if (eligibleSubtotal <= 0) {
        throw errors_1.AppError.badRequest("لا يمكن تطبيق هذا الكوبون على الطلب الحالي");
    }
    const discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal);
    const sellerSubtotals = computeSellerSubtotalsForCoupon(coupon, items);
    const perSellerDiscounts = coupon.sellerId && sellerSubtotals.has(coupon.sellerId)
        ? { [String(coupon.sellerId)]: discountAmount }
        : allocateDiscountAcrossSellers(discountAmount, sellerSubtotals);
    return { coupon, discountAmount, perSellerDiscounts };
};
exports.prepareCouponForOrder = prepareCouponForOrder;
const prepareCouponsForOrder = async (tx, codes, items) => {
    const normalized = normalizeCodes(codes);
    if (normalized.length === 0) {
        throw errors_1.AppError.badRequest("Coupon code is required");
    }
    const coupons = [];
    let globalCoupon = null;
    const sellerCoupons = new Map();
    for (const code of normalized) {
        const coupon = await findCouponOrThrow(code, tx);
        if (coupon.sellerId) {
            if (sellerCoupons.has(coupon.sellerId)) {
                throw errors_1.AppError.badRequest("لا يمكن استخدام أكثر من كوبون للبائع نفسه");
            }
            sellerCoupons.set(coupon.sellerId, coupon);
        }
        else {
            if (globalCoupon) {
                throw errors_1.AppError.badRequest("يمكن استخدام كوبون عام واحد فقط");
            }
            globalCoupon = coupon;
        }
        coupons.push(coupon);
    }
    const allSellerSubtotals = computeSellerSubtotals(items);
    const coveredSellerIds = new Set(sellerCoupons.keys());
    const perSellerDiscountTotals = new Map();
    const prepared = Array.from(sellerCoupons.values()).map((coupon) => {
        const sellerSubtotals = computeSellerSubtotalsForCoupon(coupon, items);
        const eligibleSubtotal = computeEligibleSubtotal(coupon, items);
        if (eligibleSubtotal <= 0) {
            throw errors_1.AppError.badRequest("لا يمكن تطبيق هذا الكوبون على الطلب الحالي");
        }
        const discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal);
        const perSellerDiscounts = coupon.sellerId && sellerSubtotals.has(coupon.sellerId)
            ? { [String(coupon.sellerId)]: discountAmount }
            : allocateDiscountAcrossSellers(discountAmount, sellerSubtotals);
        Object.entries(perSellerDiscounts).forEach(([sellerId, amount]) => {
            const numericSellerId = Number(sellerId);
            perSellerDiscountTotals.set(numericSellerId, (perSellerDiscountTotals.get(numericSellerId) ?? 0) + amount);
        });
        return {
            coupon,
            eligibleSubtotal,
            discountAmount,
            perSellerDiscounts,
        };
    });
    if (globalCoupon) {
        const remainingSellerSubtotals = new Map();
        allSellerSubtotals.forEach((subtotal, sellerId) => {
            if (!coveredSellerIds.has(sellerId)) {
                remainingSellerSubtotals.set(sellerId, subtotal);
            }
        });
        const remainingSubtotal = Array.from(remainingSellerSubtotals.values()).reduce((total, subtotal) => total + subtotal, 0);
        if (remainingSubtotal <= 0) {
            throw errors_1.AppError.badRequest("لا يمكن تطبيق الكوبون العام على الطلب الحالي");
        }
        const discountAmount = calculateDiscountAmount(globalCoupon, remainingSubtotal);
        const perSellerDiscounts = allocateDiscountAcrossSellers(discountAmount, remainingSellerSubtotals);
        Object.entries(perSellerDiscounts).forEach(([sellerId, amount]) => {
            const numericSellerId = Number(sellerId);
            perSellerDiscountTotals.set(numericSellerId, (perSellerDiscountTotals.get(numericSellerId) ?? 0) + amount);
        });
        prepared.push({
            coupon: globalCoupon,
            eligibleSubtotal: remainingSubtotal,
            discountAmount,
            perSellerDiscounts,
        });
    }
    const totalDiscount = prepared.reduce((total, entry) => total + entry.discountAmount, 0);
    return {
        coupons: prepared,
        totalDiscount,
        perSellerDiscounts: mapToRecord(perSellerDiscountTotals),
    };
};
exports.prepareCouponsForOrder = prepareCouponsForOrder;
const finalizeCouponUsage = async (tx, coupon) => {
    await incrementUsageCount(tx, coupon);
};
exports.finalizeCouponUsage = finalizeCouponUsage;
const finalizeCouponsUsage = async (tx, coupons) => {
    for (const coupon of coupons) {
        await incrementUsageCount(tx, coupon);
    }
};
exports.finalizeCouponsUsage = finalizeCouponsUsage;
//# sourceMappingURL=couponService.js.map