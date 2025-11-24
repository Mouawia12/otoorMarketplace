import { z } from "zod";
declare const createReviewSchema: z.ZodObject<{
    userId: z.ZodNumber;
    productId: z.ZodNumber;
    orderId: z.ZodNumber;
    rating: z.ZodNumber;
    comment: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createProductReview: (input: z.infer<typeof createReviewSchema>) => Promise<{
    id: any;
    rating: any;
    comment: any;
    created_at: any;
    user: {
        id: any;
        full_name: any;
    } | undefined;
}>;
export declare const listProductReviews: (productId: number) => Promise<{
    average: number;
    count: number;
    reviews: {
        id: any;
        rating: any;
        comment: any;
        created_at: any;
        user: {
            id: any;
            full_name: any;
        } | undefined;
    }[];
}>;
export declare const getProductRatingSummary: (productId: number) => Promise<{
    rating_avg: number;
    rating_count: number;
}>;
export {};
//# sourceMappingURL=reviewService.d.ts.map