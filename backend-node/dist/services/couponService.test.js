"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("@prisma/client");
const couponService_1 = require("./couponService");
const createCoupon = (overrides) => ({
    id: overrides.id ?? Math.floor(Math.random() * 10000),
    code: overrides.code,
    discountType: overrides.discountType ?? "PERCENTAGE",
    discountValue: overrides.discountValue ?? new client_1.Prisma.Decimal(10),
    expiresAt: overrides.expiresAt ?? null,
    maxUsage: overrides.maxUsage ?? null,
    usageCount: overrides.usageCount ?? 0,
    isActive: overrides.isActive ?? true,
    sellerId: overrides.sellerId ?? null,
    createdAt: overrides.createdAt ?? new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2025-01-01T00:00:00.000Z"),
});
(0, vitest_1.describe)("couponService per-seller discounts", () => {
    (0, vitest_1.it)("allocates seller coupons to their seller and global coupons to uncovered sellers", async () => {
        const couponsByCode = {
            SELLER10: createCoupon({ code: "SELLER10", sellerId: 1, discountType: "PERCENTAGE", discountValue: new client_1.Prisma.Decimal(10) }),
            GLOBAL10: createCoupon({ code: "GLOBAL10", sellerId: null, discountType: "PERCENTAGE", discountValue: new client_1.Prisma.Decimal(10) }),
        };
        const tx = {
            coupon: {
                findUnique: vitest_1.vi.fn(({ where }) => couponsByCode[where.code] ?? null),
            },
        };
        const lines = [
            { productId: 101, quantity: 1, sellerId: 1, unitPrice: 100 },
            { productId: 202, quantity: 1, sellerId: 2, unitPrice: 200 },
        ];
        const result = await (0, couponService_1.prepareCouponsForOrder)(tx, ["seller10", "global10"], lines);
        (0, vitest_1.expect)(result.totalDiscount).toBe(30);
        (0, vitest_1.expect)(result.perSellerDiscounts).toEqual({
            "1": 10,
            "2": 20,
        });
        const sellerCouponEntry = result.coupons.find((entry) => entry.coupon.code === "SELLER10");
        (0, vitest_1.expect)(sellerCouponEntry?.perSellerDiscounts).toEqual({ "1": 10 });
        const globalCouponEntry = result.coupons.find((entry) => entry.coupon.code === "GLOBAL10");
        (0, vitest_1.expect)(globalCouponEntry?.perSellerDiscounts).toEqual({ "2": 20 });
    });
});
//# sourceMappingURL=couponService.test.js.map