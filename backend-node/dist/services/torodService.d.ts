export type TorodOrderPayload = {
    reference: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    customer_city: string;
    customer_region?: string;
    customer_country?: string;
    payment_method?: string;
    cod_amount?: number;
    cod_currency?: string;
    items: Array<{
        name: string;
        quantity: number;
        price?: number;
        weight?: number;
        sku?: string;
    }>;
    metadata?: Record<string, unknown>;
} & Record<string, unknown>;
export type TorodShipmentPayload = Record<string, unknown>;
export type TorodShipment = {
    id: string;
    trackingNumber?: string;
    labelUrl?: string;
    status?: string;
    raw: unknown;
};
export type TorodOrder = {
    id: string;
    trackingNumber?: string;
    status?: string;
    raw: unknown;
};
export declare const listCountries: (page?: number) => Promise<unknown>;
export declare const listRegions: (countryId: string, page?: number) => Promise<unknown>;
export declare const listCities: (regionId: string, page?: number) => Promise<unknown>;
export declare const listDistricts: (cityId: string, page?: number) => Promise<unknown>;
export declare const listCourierPartners: (cityId: string) => Promise<unknown>;
export declare const createOrder: (payload: TorodOrderPayload) => Promise<TorodOrder>;
export declare const shipOrder: (orderId: string, payload?: TorodShipmentPayload) => Promise<TorodShipment>;
export declare const trackShipment: (trackingNumber: string) => Promise<TorodShipment>;
export declare const createShipment: (orderId: string, payload?: TorodShipmentPayload) => Promise<TorodShipment>;
export declare const getShipment: (trackingNumber: string) => Promise<TorodShipment>;
export declare const createWarehouse: (payload: Record<string, unknown>) => Promise<unknown>;
//# sourceMappingURL=torodService.d.ts.map