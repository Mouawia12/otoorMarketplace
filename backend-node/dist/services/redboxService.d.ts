export interface RedboxContact {
    name: string;
    phone: string;
    email?: string;
    cityCode?: string;
    country?: string;
    address?: string;
}
export interface RedboxItem {
    name: string;
    quantity: number;
    price?: number;
    weight?: number;
    sku?: string;
}
export interface RedboxShipmentPayload {
    pointId: string;
    reference?: string;
    type?: "redbox" | "omni";
    customerCityCode?: string;
    customerCountry?: string;
    codAmount?: number;
    codCurrency?: string;
    metadata?: Record<string, unknown>;
    sender?: RedboxContact;
    receiver?: RedboxContact;
    items?: RedboxItem[];
    businessId?: string;
}
export interface RedboxShipment {
    id: string;
    trackingNumber?: string | undefined;
    labelUrl?: string | undefined;
    status?: string | undefined;
    pointId?: string | undefined;
    raw?: unknown;
}
export interface RedboxLabelResponse {
    url: string;
    labelUrl?: string | undefined;
    label_url?: string | undefined;
    link?: string | undefined;
}
export declare const getCities: (country?: string) => Promise<unknown>;
export declare const getPointsByCity: (cityCode: string) => Promise<unknown>;
export declare const searchNearbyPoints: (params: {
    lat: number;
    lng: number;
    radius?: number;
    type?: string;
}) => Promise<unknown>;
export declare const createShipmentDirect: (payload: RedboxShipmentPayload) => Promise<RedboxShipment>;
export declare const createShipmentAgency: (payload: RedboxShipmentPayload) => Promise<RedboxShipment>;
export declare const createOmniOrder: (payload: RedboxShipmentPayload) => Promise<RedboxShipment>;
export declare const getLabel: (shipmentId: string) => Promise<RedboxLabelResponse>;
export declare const getStatus: (shipmentId: string) => Promise<RedboxShipment>;
export declare const getActivities: (shipmentId: string) => Promise<unknown>;
export declare const cancelShipment: (shipmentId: string, reason?: string) => Promise<unknown>;
export declare const extendShipment: (shipmentId: string, days: number) => Promise<unknown>;
export declare const updateCOD: (shipmentId: string, amount: number, currency?: string) => Promise<unknown>;
//# sourceMappingURL=redboxService.d.ts.map