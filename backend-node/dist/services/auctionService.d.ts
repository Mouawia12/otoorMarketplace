import { z } from "zod";
export declare const listAuctions: (query: unknown) => Promise<{
    id: any;
    product_id: any;
    seller_id: any;
    starting_price: any;
    current_price: any;
    minimum_increment: any;
    start_time: any;
    end_time: any;
    status: any;
    created_at: any;
    updated_at: any;
    total_bids: any;
    product: {
        id: any;
        seller_id: any;
        name_ar: any;
        name_en: any;
        description_ar: any;
        description_en: any;
        product_type: any;
        brand: any;
        category: any;
        base_price: any;
        size_ml: any;
        concentration: any;
        condition: any;
        stock_quantity: any;
        image_urls: string[];
        status: string;
        created_at: any;
        updated_at: any;
        seller: {
            id: any;
            full_name: any;
            verified_seller: any;
        } | undefined;
    } | undefined;
    seller: {
        id: number;
        full_name: string;
        verified_seller: boolean;
    } | undefined;
}[]>;
export declare const getAuctionById: (id: number) => Promise<{
    bids: {
        id: any;
        auction_id: any;
        bidder_id: any;
        amount: any;
        created_at: any;
        bidder: {
            id: any;
            full_name: any;
            email: any;
        } | undefined;
    }[];
    id: any;
    product_id: any;
    seller_id: any;
    starting_price: any;
    current_price: any;
    minimum_increment: any;
    start_time: any;
    end_time: any;
    status: any;
    created_at: any;
    updated_at: any;
    total_bids: any;
    product: {
        id: any;
        seller_id: any;
        name_ar: any;
        name_en: any;
        description_ar: any;
        description_en: any;
        product_type: any;
        brand: any;
        category: any;
        base_price: any;
        size_ml: any;
        concentration: any;
        condition: any;
        stock_quantity: any;
        image_urls: string[];
        status: string;
        created_at: any;
        updated_at: any;
        seller: {
            id: any;
            full_name: any;
            verified_seller: any;
        } | undefined;
    } | undefined;
    seller: {
        id: number;
        full_name: string;
        verified_seller: boolean;
    } | undefined;
}>;
export declare const getAuctionByProductId: (productId: number) => Promise<{
    id: any;
    product_id: any;
    seller_id: any;
    starting_price: any;
    current_price: any;
    minimum_increment: any;
    start_time: any;
    end_time: any;
    status: any;
    created_at: any;
    updated_at: any;
    total_bids: any;
    product: {
        id: any;
        seller_id: any;
        name_ar: any;
        name_en: any;
        description_ar: any;
        description_en: any;
        product_type: any;
        brand: any;
        category: any;
        base_price: any;
        size_ml: any;
        concentration: any;
        condition: any;
        stock_quantity: any;
        image_urls: string[];
        status: string;
        created_at: any;
        updated_at: any;
        seller: {
            id: any;
            full_name: any;
            verified_seller: any;
        } | undefined;
    } | undefined;
    seller: {
        id: number;
        full_name: string;
        verified_seller: boolean;
    } | undefined;
} | null>;
declare const placeBidSchema: z.ZodObject<{
    auctionId: z.ZodNumber;
    bidderId: z.ZodNumber;
    amount: z.ZodNumber;
}, z.core.$strip>;
export declare const placeBid: (input: z.infer<typeof placeBidSchema>) => Promise<{
    id: any;
    auction_id: any;
    bidder_id: any;
    amount: any;
    created_at: any;
    bidder: {
        id: any;
        full_name: any;
        email: any;
    } | undefined;
}>;
export declare const getAuctionBids: (auctionId: number) => Promise<{
    id: any;
    auction_id: any;
    bidder_id: any;
    amount: any;
    created_at: any;
    bidder: {
        id: any;
        full_name: any;
        email: any;
    } | undefined;
}[]>;
declare const createAuctionSchema: z.ZodObject<{
    sellerId: z.ZodNumber;
    productId: z.ZodNumber;
    startingPrice: z.ZodNumber;
    minimumIncrement: z.ZodNumber;
    startTime: z.ZodCoercedDate<unknown>;
    endTime: z.ZodCoercedDate<unknown>;
}, z.core.$strip>;
export declare const createAuction: (input: z.infer<typeof createAuctionSchema>) => Promise<{
    id: any;
    product_id: any;
    seller_id: any;
    starting_price: any;
    current_price: any;
    minimum_increment: any;
    start_time: any;
    end_time: any;
    status: any;
    created_at: any;
    updated_at: any;
    total_bids: any;
    product: {
        id: any;
        seller_id: any;
        name_ar: any;
        name_en: any;
        description_ar: any;
        description_en: any;
        product_type: any;
        brand: any;
        category: any;
        base_price: any;
        size_ml: any;
        concentration: any;
        condition: any;
        stock_quantity: any;
        image_urls: string[];
        status: string;
        created_at: any;
        updated_at: any;
        seller: {
            id: any;
            full_name: any;
            verified_seller: any;
        } | undefined;
    } | undefined;
    seller: {
        id: number;
        full_name: string;
        verified_seller: boolean;
    } | undefined;
}>;
export declare const updateAuction: (auctionId: number, payload: unknown) => Promise<{
    id: any;
    product_id: any;
    seller_id: any;
    starting_price: any;
    current_price: any;
    minimum_increment: any;
    start_time: any;
    end_time: any;
    status: any;
    created_at: any;
    updated_at: any;
    total_bids: any;
    product: {
        id: any;
        seller_id: any;
        name_ar: any;
        name_en: any;
        description_ar: any;
        description_en: any;
        product_type: any;
        brand: any;
        category: any;
        base_price: any;
        size_ml: any;
        concentration: any;
        condition: any;
        stock_quantity: any;
        image_urls: string[];
        status: string;
        created_at: any;
        updated_at: any;
        seller: {
            id: any;
            full_name: any;
            verified_seller: any;
        } | undefined;
    } | undefined;
    seller: {
        id: number;
        full_name: string;
        verified_seller: boolean;
    } | undefined;
}>;
export {};
//# sourceMappingURL=auctionService.d.ts.map