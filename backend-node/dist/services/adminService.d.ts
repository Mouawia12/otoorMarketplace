import { RoleName } from "@prisma/client";
export declare const getAdminDashboardStats: () => Promise<{
    total_users: number;
    total_products: number;
    pending_products: number;
    total_orders: number;
    pending_orders: number;
    running_auctions: number;
}>;
export declare const listUsersForAdmin: () => Promise<{
    id: number;
    email: string;
    full_name: string;
    status: import(".prisma/client").$Enums.UserStatus;
    roles: string[];
    created_at: string;
}[]>;
export declare const updateUserStatus: (userId: number, status: string, allowedRoles: RoleName[]) => Promise<{
    id: number;
    email: string;
    full_name: string;
    status: import(".prisma/client").$Enums.UserStatus;
    roles: string[];
}>;
export declare const deleteUserByAdmin: (userId: number, actorRoles: RoleName[], actorId?: number) => Promise<{
    success: boolean;
}>;
export declare const listPendingProducts: () => Promise<{
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
}[]>;
export declare const listProductsForAdmin: (status?: string) => Promise<{
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
}[]>;
export declare const updateProductStatusAsAdmin: (productId: number, status: string) => Promise<{
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
}>;
type ModerationItem = {
    id: string;
    item_id: number;
    type: "product" | "order" | "auction";
    title_en: string;
    title_ar: string;
    created_at: string;
    priority: "low" | "medium" | "high";
};
export declare const getAdminModerationQueue: () => Promise<ModerationItem[]>;
export {};
//# sourceMappingURL=adminService.d.ts.map