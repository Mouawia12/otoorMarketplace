export declare const createProductTemplate: (payload: unknown) => Promise<{
    id: any;
    name_ar: any;
    name_en: any;
    description_ar: any;
    description_en: any;
    product_type: any;
    brand: any;
    category: any;
    base_price: number;
    size_ml: any;
    concentration: any;
    image_urls: any;
    created_by: {
        id: any;
        full_name: any;
    } | undefined;
    created_at: any;
    updated_at: any;
}>;
export declare const updateProductTemplate: (templateId: number, payload: unknown) => Promise<{
    id: any;
    name_ar: any;
    name_en: any;
    description_ar: any;
    description_en: any;
    product_type: any;
    brand: any;
    category: any;
    base_price: number;
    size_ml: any;
    concentration: any;
    image_urls: any;
    created_by: {
        id: any;
        full_name: any;
    } | undefined;
    created_at: any;
    updated_at: any;
}>;
export declare const deleteProductTemplate: (templateId: number) => Promise<void>;
export declare const getProductTemplateById: (templateId: number) => Promise<{
    id: any;
    name_ar: any;
    name_en: any;
    description_ar: any;
    description_en: any;
    product_type: any;
    brand: any;
    category: any;
    base_price: number;
    size_ml: any;
    concentration: any;
    image_urls: any;
    created_by: {
        id: any;
        full_name: any;
    } | undefined;
    created_at: any;
    updated_at: any;
}>;
export declare const listProductTemplates: (query: unknown) => Promise<{
    items: {
        id: any;
        name_ar: any;
        name_en: any;
        description_ar: any;
        description_en: any;
        product_type: any;
        brand: any;
        category: any;
        base_price: number;
        size_ml: any;
        concentration: any;
        image_urls: any;
        created_by: {
            id: any;
            full_name: any;
        } | undefined;
        created_at: any;
        updated_at: any;
    }[];
    total: number;
    total_all: number;
}>;
//# sourceMappingURL=productTemplateService.d.ts.map