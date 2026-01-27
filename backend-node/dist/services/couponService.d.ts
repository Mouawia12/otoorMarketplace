import type { Coupon, Prisma } from "@prisma/client";
type CouponLine = {
    productId: number;
    quantity: number;
    sellerId: number;
    unitPrice: number;
};
export declare const validateCoupon: (input: unknown) => Promise<{
    coupons: {
        coupon: {
            id: number;
            code: string;
            discount_type: string;
            discount_value: number;
            expires_at: Date | null;
            max_usage: number | null;
            usage_count: number;
            is_active: boolean;
            seller_id: number | null;
            seller_email: string | null;
            seller_name: string | null;
            created_at: Date;
            updated_at: Date;
        };
        discount_amount: number;
        per_seller_discounts: Record<string, number>;
    }[];
    total_discount: number;
    per_seller_discounts: Record<string, number>;
}>;
export declare const redeemCoupon: (input: unknown) => Promise<{
    coupon: {
        id: number;
        code: string;
        discount_type: string;
        discount_value: number;
        expires_at: Date | null;
        max_usage: number | null;
        usage_count: number;
        is_active: boolean;
        seller_id: number | null;
        seller_email: string | null;
        seller_name: string | null;
        created_at: Date;
        updated_at: Date;
    };
}>;
export declare const listCoupons: (options?: {
    sellerId?: number;
    includeSeller?: boolean;
}) => Promise<{
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    expires_at: Date | null;
    max_usage: number | null;
    usage_count: number;
    is_active: boolean;
    seller_id: number | null;
    seller_email: string | null;
    seller_name: string | null;
    created_at: Date;
    updated_at: Date;
}[]>;
export declare const createCoupon: (input: unknown, options?: {
    sellerId?: number;
}) => Promise<{
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    expires_at: Date | null;
    max_usage: number | null;
    usage_count: number;
    is_active: boolean;
    seller_id: number | null;
    seller_email: string | null;
    seller_name: string | null;
    created_at: Date;
    updated_at: Date;
}>;
export declare const updateCoupon: (id: number, input: unknown, options?: {
    sellerId?: number;
}) => Promise<{
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    expires_at: Date | null;
    max_usage: number | null;
    usage_count: number;
    is_active: boolean;
    seller_id: number | null;
    seller_email: string | null;
    seller_name: string | null;
    created_at: Date;
    updated_at: Date;
}>;
export declare const deleteCoupon: (id: number, options?: {
    sellerId?: number;
}) => Promise<void>;
export declare const prepareCouponForOrder: (tx: Prisma.TransactionClient, code: string, items: CouponLine[]) => Promise<{
    coupon: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        sellerId: number | null;
        code: string;
        discountType: import(".prisma/client").$Enums.CouponDiscountType;
        discountValue: Prisma.Decimal;
        maxUsage: number | null;
        usageCount: number;
        isActive: boolean;
    };
    discountAmount: number;
    perSellerDiscounts: Record<string, number>;
}>;
export declare const prepareCouponsForOrder: (tx: Prisma.TransactionClient, codes: string[], items: CouponLine[]) => Promise<{
    coupons: {
        coupon: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date | null;
            sellerId: number | null;
            code: string;
            discountType: import(".prisma/client").$Enums.CouponDiscountType;
            discountValue: Prisma.Decimal;
            maxUsage: number | null;
            usageCount: number;
            isActive: boolean;
        };
        eligibleSubtotal: number;
        discountAmount: number;
        perSellerDiscounts: Record<string, number>;
    }[];
    totalDiscount: number;
    perSellerDiscounts: Record<string, number>;
}>;
export declare const finalizeCouponUsage: (tx: Prisma.TransactionClient, coupon: Coupon) => Promise<void>;
export declare const finalizeCouponsUsage: (tx: Prisma.TransactionClient, coupons: Coupon[]) => Promise<void>;
export {};
//# sourceMappingURL=couponService.d.ts.map