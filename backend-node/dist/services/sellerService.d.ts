export declare const getSellerDashboardStats: (sellerId: number) => Promise<{
    totalSales: number;
    activeProducts: number;
    activeAuctions: number;
    pendingOrders: number;
    totalEarnings: number;
    monthlyEarnings: number;
}>;
export declare const listSellerProductsWithFilters: (sellerId: number, filters?: {
    status?: string;
}) => Promise<{
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
    rating_avg: number;
    rating_count: any;
    seller: {
        id: any;
        full_name: any;
        verified_seller: any;
    } | undefined;
    is_auction_product: boolean;
    has_active_auction: any;
}[]>;
export declare const listSellerOrders: (sellerId: number, status?: string) => Promise<{
    id: number;
    buyer_id: number;
    product_id: number | null;
    quantity: number;
    unit_price: number;
    total_amount: number;
    payment_method: string;
    shipping_address: string;
    shipping_name: string;
    shipping_phone: string;
    shipping_city: string;
    shipping_region: string;
    shipping_method: string;
    shipping_fee: number;
    discount_amount: number;
    coupon_code: string | null;
    status: string;
    created_at: string;
    platform_fee: number;
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
        rating_avg: number;
        rating_count: any;
        seller: {
            id: any;
            full_name: any;
            verified_seller: any;
        } | undefined;
        is_auction_product: boolean;
        has_active_auction: any;
    } | undefined;
    items: {
        id: number;
        product_id: number;
        quantity: number;
        unit_price: number;
        total_price: number;
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
            rating_avg: number;
            rating_count: any;
            seller: {
                id: any;
                full_name: any;
                verified_seller: any;
            } | undefined;
            is_auction_product: boolean;
            has_active_auction: any;
        } | undefined;
    }[];
}[]>;
export declare const listSellerEarnings: (sellerId: number) => Promise<{
    records: {
        id: number;
        orderId: number;
        date: Date;
        productName: string;
        productNameAr: string;
        amount: number;
        commission: number;
        netEarnings: number;
    }[];
    summary: {
        totalEarnings: number;
        totalCommission: number;
        netEarnings: number;
        averageOrder: number;
    };
}>;
//# sourceMappingURL=sellerService.d.ts.map