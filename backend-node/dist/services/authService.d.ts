import { z } from "zod";
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    roles: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodEnum<{
        SUPER_ADMIN: "SUPER_ADMIN";
        ADMIN: "ADMIN";
        MODERATOR: "MODERATOR";
        SUPPORT: "SUPPORT";
        SELLER: "SELLER";
        BUYER: "BUYER";
    }>>>>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const changePasswordSchema: z.ZodObject<{
    oldPassword: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
export declare const googleLoginSchema: z.ZodObject<{
    idToken: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<{
        buyer: "buyer";
        seller: "seller";
    }>>;
}, z.core.$strip>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export declare const registerUser: (input: z.infer<typeof registerSchema>) => Promise<{
    requires_verification: boolean;
    email: string;
}>;
export declare const authenticateWithGoogle: (input: z.infer<typeof googleLoginSchema>) => Promise<{
    token: string;
    user: {
        id: number;
        email: string;
        full_name: string;
        avatar_url: string | null;
        created_at: Date;
        status: import(".prisma/client").$Enums.UserStatus;
        roles: string[];
        seller_status: string;
        seller_profile_status: string | undefined;
        seller_profile: {
            id: number;
            full_name: string;
            phone: string;
            city: string;
            address: string;
            torod_warehouse_id: string | null;
            status: string;
            created_at: Date;
            updated_at: Date;
        } | null;
        seller_profile_submitted: boolean;
        verified_seller: boolean;
        email_verified: boolean;
        requires_password_reset: boolean;
    };
}>;
export declare const requestPasswordReset: (input: z.infer<typeof forgotPasswordSchema>) => Promise<void>;
export declare const resetPassword: (input: z.infer<typeof resetPasswordSchema>) => Promise<void>;
export declare const authenticateUser: (input: z.infer<typeof loginSchema>) => Promise<{
    token: string;
    user: {
        id: number;
        email: string;
        full_name: string;
        avatar_url: string | null;
        created_at: Date;
        status: import(".prisma/client").$Enums.UserStatus;
        roles: string[];
        seller_status: string;
        seller_profile_status: string | undefined;
        seller_profile: {
            id: number;
            full_name: string;
            phone: string;
            city: string;
            address: string;
            torod_warehouse_id: string | null;
            status: string;
            created_at: Date;
            updated_at: Date;
        } | null;
        seller_profile_submitted: boolean;
        verified_seller: boolean;
        email_verified: boolean;
        requires_password_reset: boolean;
    };
}>;
export declare const resendVerificationEmailSchema: z.ZodObject<{
    email: z.ZodString;
    redirect: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const resendVerificationEmail: (input: z.infer<typeof resendVerificationEmailSchema>) => Promise<{
    success: boolean;
}>;
export declare const verifyEmailSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export declare const verifyEmailToken: (input: z.infer<typeof verifyEmailSchema>) => Promise<{
    token: string;
    user: {
        id: number;
        email: string;
        full_name: string;
        avatar_url: string | null;
        created_at: Date;
        status: import(".prisma/client").$Enums.UserStatus;
        roles: string[];
        seller_status: string;
        seller_profile_status: string | undefined;
        seller_profile: {
            id: number;
            full_name: string;
            phone: string;
            city: string;
            address: string;
            torod_warehouse_id: string | null;
            status: string;
            created_at: Date;
            updated_at: Date;
        } | null;
        seller_profile_submitted: boolean;
        verified_seller: boolean;
        email_verified: boolean;
        requires_password_reset: boolean;
    };
    already_verified: boolean;
}>;
export declare const changePassword: (userId: number, payload: z.infer<typeof changePasswordSchema>) => Promise<{
    success: boolean;
}>;
//# sourceMappingURL=authService.d.ts.map