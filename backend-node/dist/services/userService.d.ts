export declare const getUserProfile: (userId: number) => Promise<{
    id: number;
    email: string;
    full_name: string;
    created_at: Date;
    phone: string | null;
    avatar_url: string | null;
    verified_seller: boolean;
    status: import(".prisma/client").$Enums.UserStatus;
    roles: any[];
    seller_status: string;
    seller_profile_status: string | undefined;
    seller_profile: {
        full_name: string;
        phone: string;
        city: string;
        address: string;
        national_id: string;
        iban: string;
        bank_name: string;
        status: string;
    } | null;
    seller_profile_submitted: boolean;
}>;
export declare const updateUserProfile: (userId: number, data: {
    full_name?: string | undefined;
    phone?: string | undefined;
    avatar_url?: string | undefined;
}) => Promise<{
    id: number;
    email: string;
    full_name: string;
    created_at: Date;
    phone: string | null;
    avatar_url: string | null;
    verified_seller: boolean;
    status: import(".prisma/client").$Enums.UserStatus;
    roles: any[];
}>;
//# sourceMappingURL=userService.d.ts.map