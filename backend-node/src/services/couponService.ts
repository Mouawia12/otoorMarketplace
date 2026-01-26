import type { Coupon, Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";

const couponLineSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
});

const validateRequestSchema = z
  .object({
    code: z.string().min(3).max(64).optional(),
    codes: z.array(z.string().min(3).max(64)).min(1).max(5).optional(),
    items: z.array(couponLineSchema).min(1),
  })
  .refine((data) => data.code || (data.codes && data.codes.length > 0), {
    message: "Coupon code is required",
    path: ["code"],
  });

const redeemRequestSchema = z.object({
  code: z.string().min(3).max(64),
});

const couponPayloadSchema = z.object({
  code: z.string().min(3).max(64),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().positive(),
  expires_at: z
    .union([z.string(), z.coerce.date()])
    .optional()
    .nullable(),
  max_usage: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional(),
  is_active: z.boolean().optional(),
  seller_id: z.coerce.number().int().positive().optional().nullable(),
});

const updateCouponSchema = couponPayloadSchema
  .partial()
  .extend({ code: z.string().min(3).max(64).optional() });

const normalizeCode = (code: string) => code.trim().toUpperCase();
const normalizeCodes = (codes: string[]) =>
  Array.from(new Set(codes.map((code) => normalizeCode(code)))).filter(Boolean);

const parseDateInput = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw AppError.badRequest("تاريخ انتهاء غير صالح");
    }
    return value;
  }

  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    throw AppError.badRequest("تاريخ انتهاء غير صالح");
  }
  return parsed;
};

const assertCouponIsValid = (coupon: Coupon) => {
  if (!coupon.isActive) {
    throw AppError.badRequest("الكوبون غير مفعّل حالياً");
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest("انتهت صلاحية هذا الكوبون");
  }
  if (coupon.maxUsage !== null && coupon.maxUsage !== undefined) {
    if (coupon.usageCount >= coupon.maxUsage) {
      throw AppError.badRequest("تم الوصول إلى الحد الأقصى لاستخدام هذا الكوبون");
    }
  }
};

const serializeCoupon = (coupon: Coupon & { seller?: { id: number; fullName: string; email: string } | null }) => ({
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

const findCouponOrThrow = async (
  code: string,
  tx: Prisma.TransactionClient | typeof prisma,
) => {
  const record = await tx.coupon.findUnique({
    where: { code: normalizeCode(code) },
  });
  if (!record) {
    throw AppError.badRequest("الكوبون غير موجود");
  }
  assertCouponIsValid(record);
  return record;
};

const calculateDiscountAmount = (coupon: Coupon, subtotal: number) => {
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

type CouponLine = {
  productId: number;
  quantity: number;
  sellerId: number;
  unitPrice: number;
};

type SellerSubtotalMap = Map<number, number>;

const toCents = (value: number) => Math.max(0, Math.round(value * 100));
const fromCents = (value: number) => value / 100;

const computeSellerSubtotals = (lines: CouponLine[]): SellerSubtotalMap => {
  const subtotals = new Map<number, number>();
  for (const line of lines) {
    const lineSubtotal = line.unitPrice * line.quantity;
    subtotals.set(line.sellerId, (subtotals.get(line.sellerId) ?? 0) + lineSubtotal);
  }
  return subtotals;
};

const computeSellerSubtotalsForCoupon = (coupon: Coupon, lines: CouponLine[]): SellerSubtotalMap => {
  const targetSellerId = coupon.sellerId ?? null;
  const eligibleLines =
    targetSellerId !== null
      ? lines.filter((line) => line.sellerId === targetSellerId)
      : lines;
  return computeSellerSubtotals(eligibleLines);
};

const mapToRecord = (map: SellerSubtotalMap) =>
  Array.from(map.entries()).reduce<Record<string, number>>((acc, [sellerId, amount]) => {
    acc[String(sellerId)] = amount;
    return acc;
  }, {});

const allocateDiscountAcrossSellers = (
  discountAmount: number,
  sellerSubtotals: SellerSubtotalMap,
) => {
  const entries = Array.from(sellerSubtotals.entries()).filter(([, subtotal]) => subtotal > 0);
  if (entries.length === 0 || discountAmount <= 0) {
    return {} as Record<string, number>;
  }

  const totalSubtotalCents = entries.reduce((sum, [, subtotal]) => sum + toCents(subtotal), 0);
  if (totalSubtotalCents <= 0) {
    return {} as Record<string, number>;
  }

  const discountCents = Math.min(toCents(discountAmount), totalSubtotalCents);
  let remainingDiscountCents = discountCents;
  const allocations = new Map<number, number>();

  entries.forEach(([sellerId, subtotal], index) => {
    const subtotalCents = toCents(subtotal);
    if (subtotalCents <= 0 || remainingDiscountCents <= 0) {
      allocations.set(sellerId, 0);
      return;
    }

    const isLast = index === entries.length - 1;
    const shareCents = isLast
      ? remainingDiscountCents
      : Math.min(
          remainingDiscountCents,
          Math.floor((discountCents * subtotalCents) / totalSubtotalCents),
        );

    allocations.set(sellerId, shareCents);
    remainingDiscountCents -= shareCents;
  });

  return Array.from(allocations.entries()).reduce<Record<string, number>>((acc, [sellerId, cents]) => {
    if (cents > 0) {
      acc[String(sellerId)] = fromCents(cents);
    }
    return acc;
  }, {});
};

const computeEligibleSubtotal = (coupon: Coupon, lines: CouponLine[]) => {
  const targetSellerId = coupon.sellerId ?? null;
  return lines.reduce((total, line) => {
    if (targetSellerId && line.sellerId !== targetSellerId) {
      return total;
    }
    return total + line.unitPrice * line.quantity;
  }, 0);
};

const normalizeLinesFromProducts = (
  items: Array<{ product_id: number; quantity: number }>,
  products: Array<{ id: number; basePrice: PrismaNamespace.Decimal; sellerId: number }>,
) => {
  const productMap = new Map(products.map((product) => [product.id, product]));
  return items.map((item) => {
    const product = productMap.get(item.product_id);
    if (!product) {
      throw AppError.badRequest("أحد المنتجات غير متوفر حالياً");
    }
    return {
      productId: product.id,
      quantity: item.quantity,
      sellerId: product.sellerId,
      unitPrice: Number(product.basePrice),
    };
  });
};

export const validateCoupon = async (input: unknown) => {
  const data = validateRequestSchema.parse(input);
  const codes = normalizeCodes(
    data.codes ?? (data.code ? [data.code] : []),
  );

  if (codes.length === 0) {
    throw AppError.badRequest("Coupon code is required");
  }

  const productIds = Array.from(
    new Set(data.items.map((item) => item.product_id)),
  );

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, basePrice: true, sellerId: true },
  });

  if (products.length === 0) {
    throw AppError.badRequest("لا يمكن إيجاد المنتجات المحددة");
  }

  const lines = normalizeLinesFromProducts(data.items, products);
  const prepared = await prepareCouponsForOrder(prisma, codes, lines);

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

export const redeemCoupon = async (input: unknown) => {
  const data = redeemRequestSchema.parse(input);
  const coupon = await findCouponOrThrow(data.code, prisma);
  await incrementUsageCount(prisma, coupon);
  return {
    coupon: serializeCoupon({
      ...coupon,
      usageCount: coupon.usageCount + 1,
    } as Coupon),
  };
};

const ensureSellerOwnership = (coupon: Coupon, sellerId?: number) => {
  if (!sellerId) {
    return;
  }
  if (coupon.sellerId !== sellerId) {
    throw AppError.forbidden("لا تملك صلاحية الوصول لهذا الكوبون");
  }
};

export const listCoupons = async (options?: { sellerId?: number; includeSeller?: boolean }) => {
  const where: Prisma.CouponWhereInput = {};
  if (options?.sellerId) {
    where.sellerId = options.sellerId;
  }
  const coupons = await prisma.coupon.findMany({
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

export const createCoupon = async (
  input: unknown,
  options?: { sellerId?: number },
) => {
  const data = couponPayloadSchema.parse(input);
  const expiresAt = parseDateInput(data.expires_at);
  const sellerId = options?.sellerId ?? data.seller_id ?? null;

  const coupon = await prisma.coupon.create({
    data: {
      code: normalizeCode(data.code),
      discountType: data.discount_type === "percentage" ? "PERCENTAGE" : "FIXED",
      discountValue: new PrismaNamespace.Decimal(data.discount_value),
      expiresAt,
      maxUsage: data.max_usage ?? null,
      isActive: data.is_active ?? true,
      ...(sellerId ? { seller: { connect: { id: sellerId } } } : {}),
    },
  });
  return serializeCoupon(coupon);
};

export const updateCoupon = async (
  id: number,
  input: unknown,
  options?: { sellerId?: number },
) => {
  const data = updateCouponSchema.parse(input);
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("الكوبون غير موجود");
  }
  ensureSellerOwnership(existing, options?.sellerId);

  const updateData: Prisma.CouponUpdateInput = {};
  if (data.code) {
    updateData.code = normalizeCode(data.code);
  }
  if (data.discount_type) {
    updateData.discountType =
      data.discount_type === "percentage" ? "PERCENTAGE" : "FIXED";
  }
  if (typeof data.discount_value === "number") {
    updateData.discountValue = new PrismaNamespace.Decimal(data.discount_value);
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
  } else if (data.seller_id !== undefined) {
    updateData.seller = data.seller_id
      ? { connect: { id: data.seller_id } }
      : { disconnect: true };
  }

  const coupon = await prisma.coupon.update({
    where: { id },
    data: updateData,
  });
  return serializeCoupon(coupon);
};

export const deleteCoupon = async (
  id: number,
  options?: { sellerId?: number },
) => {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("الكوبون غير موجود");
  }
  ensureSellerOwnership(existing, options?.sellerId);

  try {
    await prisma.coupon.delete({
      where: { id },
    });
  } catch {
    throw AppError.badRequest("تعذر حذف الكوبون، ربما مرتبط بطلبات");
  }
};

const incrementUsageCount = async (
  tx: Prisma.TransactionClient | typeof prisma,
  coupon: Coupon,
) => {
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
    throw AppError.badRequest("الكوبون غير صالح للاستخدام");
  }
};

export const prepareCouponForOrder = async (
  tx: Prisma.TransactionClient,
  code: string,
  items: CouponLine[],
) => {
  const coupon = await findCouponOrThrow(code, tx);
  const eligibleSubtotal = computeEligibleSubtotal(coupon, items);
  if (eligibleSubtotal <= 0) {
    throw AppError.badRequest("لا يمكن تطبيق هذا الكوبون على الطلب الحالي");
  }
  const discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal);
  const sellerSubtotals = computeSellerSubtotalsForCoupon(coupon, items);
  const perSellerDiscounts =
    coupon.sellerId && sellerSubtotals.has(coupon.sellerId)
      ? { [String(coupon.sellerId)]: discountAmount }
      : allocateDiscountAcrossSellers(discountAmount, sellerSubtotals);
  return { coupon, discountAmount, perSellerDiscounts };
};

export const prepareCouponsForOrder = async (
  tx: Prisma.TransactionClient,
  codes: string[],
  items: CouponLine[],
) => {
  const normalized = normalizeCodes(codes);
  if (normalized.length === 0) {
    throw AppError.badRequest("Coupon code is required");
  }

  const coupons: Coupon[] = [];
  let globalCoupon: Coupon | null = null;
  const sellerCoupons = new Map<number, Coupon>();

  for (const code of normalized) {
    const coupon = await findCouponOrThrow(code, tx);
    if (coupon.sellerId) {
      if (sellerCoupons.has(coupon.sellerId)) {
        throw AppError.badRequest("لا يمكن استخدام أكثر من كوبون للبائع نفسه");
      }
      sellerCoupons.set(coupon.sellerId, coupon);
    } else {
      if (globalCoupon) {
        throw AppError.badRequest("يمكن استخدام كوبون عام واحد فقط");
      }
      globalCoupon = coupon;
    }
    coupons.push(coupon);
  }

  const allSellerSubtotals = computeSellerSubtotals(items);
  const coveredSellerIds = new Set(sellerCoupons.keys());
  const perSellerDiscountTotals = new Map<number, number>();

  const prepared = Array.from(sellerCoupons.values()).map((coupon) => {
    const sellerSubtotals = computeSellerSubtotalsForCoupon(coupon, items);
    const eligibleSubtotal = computeEligibleSubtotal(coupon, items);
    if (eligibleSubtotal <= 0) {
      throw AppError.badRequest("لا يمكن تطبيق هذا الكوبون على الطلب الحالي");
    }
    const discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal);
    const perSellerDiscounts =
      coupon.sellerId && sellerSubtotals.has(coupon.sellerId)
        ? { [String(coupon.sellerId)]: discountAmount }
        : allocateDiscountAcrossSellers(discountAmount, sellerSubtotals);

    Object.entries(perSellerDiscounts).forEach(([sellerId, amount]) => {
      const numericSellerId = Number(sellerId);
      perSellerDiscountTotals.set(
        numericSellerId,
        (perSellerDiscountTotals.get(numericSellerId) ?? 0) + amount,
      );
    });

    return {
      coupon,
      eligibleSubtotal,
      discountAmount,
      perSellerDiscounts,
    };
  });

  if (globalCoupon) {
    const remainingSellerSubtotals = new Map<number, number>();
    allSellerSubtotals.forEach((subtotal, sellerId) => {
      if (!coveredSellerIds.has(sellerId)) {
        remainingSellerSubtotals.set(sellerId, subtotal);
      }
    });
    const remainingSubtotal = Array.from(remainingSellerSubtotals.values()).reduce(
      (total, subtotal) => total + subtotal,
      0,
    );
    if (remainingSubtotal <= 0) {
      throw AppError.badRequest("لا يمكن تطبيق الكوبون العام على الطلب الحالي");
    }
    const discountAmount = calculateDiscountAmount(globalCoupon, remainingSubtotal);
    const perSellerDiscounts = allocateDiscountAcrossSellers(
      discountAmount,
      remainingSellerSubtotals,
    );

    Object.entries(perSellerDiscounts).forEach(([sellerId, amount]) => {
      const numericSellerId = Number(sellerId);
      perSellerDiscountTotals.set(
        numericSellerId,
        (perSellerDiscountTotals.get(numericSellerId) ?? 0) + amount,
      );
    });

    prepared.push({
      coupon: globalCoupon,
      eligibleSubtotal: remainingSubtotal,
      discountAmount,
      perSellerDiscounts,
    });
  }

  const totalDiscount = prepared.reduce(
    (total, entry) => total + entry.discountAmount,
    0,
  );

  return {
    coupons: prepared,
    totalDiscount,
    perSellerDiscounts: mapToRecord(perSellerDiscountTotals),
  };
};

export const finalizeCouponUsage = async (
  tx: Prisma.TransactionClient,
  coupon: Coupon,
) => {
  await incrementUsageCount(tx, coupon);
};

export const finalizeCouponsUsage = async (
  tx: Prisma.TransactionClient,
  coupons: Coupon[],
) => {
  for (const coupon of coupons) {
    await incrementUsageCount(tx, coupon);
  }
};
