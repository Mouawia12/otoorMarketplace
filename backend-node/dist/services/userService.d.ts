export declare const getUserProfile: (userId: number) => Promise<{
    id: number;
    email: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    verified_seller: boolean;
    status: import(".prisma/client").$Enums.UserStatus;
    roles: string[];
}>;
//# sourceMappingURL=userService.d.ts.map