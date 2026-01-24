import { SellerStatus } from "@prisma/client";
export declare const upsertSellerProfile: (userId: number, input: unknown) => Promise<{
    id: any;
    user_id: any;
    full_name: any;
    phone: any;
    city: any;
    address: any;
    national_id: any;
    iban: any;
    bank_name: any;
    torod_warehouse_id: any;
    status: any;
    created_at: any;
    updated_at: any;
    user: {
        id: any;
        full_name: any;
        email: any;
    } | undefined;
}>;
export declare const getSellerProfile: (userId: number) => Promise<{
    id: any;
    user_id: any;
    full_name: any;
    phone: any;
    city: any;
    address: any;
    national_id: any;
    iban: any;
    bank_name: any;
    torod_warehouse_id: any;
    status: any;
    created_at: any;
    updated_at: any;
    user: {
        id: any;
        full_name: any;
        email: any;
    } | undefined;
} | null>;
export declare const listSellerProfiles: (status?: SellerStatus) => Promise<{
    id: any;
    user_id: any;
    full_name: any;
    phone: any;
    city: any;
    address: any;
    national_id: any;
    iban: any;
    bank_name: any;
    torod_warehouse_id: any;
    status: any;
    created_at: any;
    updated_at: any;
    user: {
        id: any;
        full_name: any;
        email: any;
    } | undefined;
}[]>;
export declare const updateSellerProfileStatus: (userId: number, status: SellerStatus) => Promise<{
    id: any;
    user_id: any;
    full_name: any;
    phone: any;
    city: any;
    address: any;
    national_id: any;
    iban: any;
    bank_name: any;
    torod_warehouse_id: any;
    status: any;
    created_at: any;
    updated_at: any;
    user: {
        id: any;
        full_name: any;
        email: any;
    } | undefined;
}>;
//# sourceMappingURL=sellerProfileService.d.ts.map