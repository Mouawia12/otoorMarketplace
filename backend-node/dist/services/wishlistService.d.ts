import { z } from "zod";
declare const wishlistInputSchema: z.ZodObject<{
    userId: z.ZodNumber;
    productId: z.ZodNumber;
}, z.core.$strip>;
export declare const addToWishlist: (input: z.infer<typeof wishlistInputSchema>) => Promise<{
    product: {
        image_urls: string[];
        images: {
            url: string;
            id: number;
            createdAt: Date;
            productId: number;
            sortOrder: number;
            altText: string | null;
        }[];
        id: number;
        status: import(".prisma/client").$Enums.ProductStatus;
        createdAt: Date;
        updatedAt: Date;
        nameAr: string;
        nameEn: string;
        slug: string;
        descriptionAr: string;
        descriptionEn: string;
        productType: string;
        brand: string;
        category: string;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        sizeMl: number;
        concentration: string;
        condition: import(".prisma/client").$Enums.ProductCondition;
        stockQuantity: number;
        sellerId: number;
    };
    id: number;
    createdAt: Date;
    userId: number;
    productId: number;
}>;
export declare const removeFromWishlist: (input: z.infer<typeof wishlistInputSchema>) => Promise<void>;
export declare const listWishlist: (userId: number) => Promise<{
    product: {
        image_urls: string[];
        images: {
            url: string;
            id: number;
            createdAt: Date;
            productId: number;
            sortOrder: number;
            altText: string | null;
        }[];
        id: number;
        status: import(".prisma/client").$Enums.ProductStatus;
        createdAt: Date;
        updatedAt: Date;
        nameAr: string;
        nameEn: string;
        slug: string;
        descriptionAr: string;
        descriptionEn: string;
        productType: string;
        brand: string;
        category: string;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        sizeMl: number;
        concentration: string;
        condition: import(".prisma/client").$Enums.ProductCondition;
        stockQuantity: number;
        sellerId: number;
    };
    id: number;
    createdAt: Date;
    userId: number;
    productId: number;
}[]>;
export {};
//# sourceMappingURL=wishlistService.d.ts.map