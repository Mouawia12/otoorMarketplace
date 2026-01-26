import { describe, expect, it, vi } from "vitest";
import type { Coupon } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prepareCouponsForOrder } from "./couponService";

type CouponLine = {
  productId: number;
  quantity: number;
  sellerId: number;
  unitPrice: number;
};

const createCoupon = (overrides: Partial<Coupon> & { code: string }): Coupon => ({
  id: overrides.id ?? Math.floor(Math.random() * 10_000),
  code: overrides.code,
  discountType: overrides.discountType ?? "PERCENTAGE",
  discountValue: overrides.discountValue ?? new Prisma.Decimal(10),
  expiresAt: overrides.expiresAt ?? null,
  maxUsage: overrides.maxUsage ?? null,
  usageCount: overrides.usageCount ?? 0,
  isActive: overrides.isActive ?? true,
  sellerId: overrides.sellerId ?? null,
  createdAt: overrides.createdAt ?? new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: overrides.updatedAt ?? new Date("2025-01-01T00:00:00.000Z"),
});

describe("couponService per-seller discounts", () => {
  it("allocates seller coupons to their seller and global coupons to uncovered sellers", async () => {
    const couponsByCode: Record<string, Coupon> = {
      SELLER10: createCoupon({ code: "SELLER10", sellerId: 1, discountType: "PERCENTAGE", discountValue: new Prisma.Decimal(10) }),
      GLOBAL10: createCoupon({ code: "GLOBAL10", sellerId: null, discountType: "PERCENTAGE", discountValue: new Prisma.Decimal(10) }),
    };

    const tx = {
      coupon: {
        findUnique: vi.fn(({ where }: { where: { code: string } }) => couponsByCode[where.code] ?? null),
      },
    } as any;

    const lines: CouponLine[] = [
      { productId: 101, quantity: 1, sellerId: 1, unitPrice: 100 },
      { productId: 202, quantity: 1, sellerId: 2, unitPrice: 200 },
    ];

    const result = await prepareCouponsForOrder(tx, ["seller10", "global10"], lines);

    expect(result.totalDiscount).toBe(30);
    expect(result.perSellerDiscounts).toEqual({
      "1": 10,
      "2": 20,
    });

    const sellerCouponEntry = result.coupons.find((entry) => entry.coupon.code === "SELLER10");
    expect(sellerCouponEntry?.perSellerDiscounts).toEqual({ "1": 10 });

    const globalCouponEntry = result.coupons.find((entry) => entry.coupon.code === "GLOBAL10");
    expect(globalCouponEntry?.perSellerDiscounts).toEqual({ "2": 20 });
  });
});
