import { z } from "zod";
declare const wishlistInputSchema: z.ZodObject<{
    userId: z.ZodNumber;
    productId: z.ZodNumber;
}, z.core.$strip>;
export declare const addToWishlist: (input: z.infer<typeof wishlistInputSchema>) => Promise<{
    product: {
        image_urls: string[];
        images: {
            createdAt: Date;
            id: number;
            sortOrder: number;
            productId: number;
            url: string;
            altText: string | null;
        }[];
        status: import(".prisma/client").$Enums.ProductStatus;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        brand: string;
        category: string;
        condition: import(".prisma/client").$Enums.ProductCondition;
        sellerId: number;
        nameAr: string;
        nameEn: string;
        descriptionAr: string;
        descriptionEn: string;
        productType: string;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        sizeMl: number;
        concentration: string;
        stockQuantity: number;
        slug: string;
    };
    createdAt: Date;
    id: number;
    userId: number;
    productId: number;
}>;
export declare const removeFromWishlist: (input: z.infer<typeof wishlistInputSchema>) => Promise<void>;
export declare const listWishlist: (userId: number) => Promise<{
    product: {
        image_urls: string[];
        images: {
            createdAt: Date;
            id: number;
            sortOrder: number;
            productId: number;
            url: string;
            altText: string | null;
        }[];
        status: import(".prisma/client").$Enums.ProductStatus;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        brand: string;
        category: string;
        condition: import(".prisma/client").$Enums.ProductCondition;
        sellerId: number;
        nameAr: string;
        nameEn: string;
        descriptionAr: string;
        descriptionEn: string;
        productType: string;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        sizeMl: number;
        concentration: string;
        stockQuantity: number;
        slug: string;
    };
    createdAt: Date;
    id: number;
    userId: number;
    productId: number;
}[]>;
export {};
//# sourceMappingURL=wishlistService.d.ts.map