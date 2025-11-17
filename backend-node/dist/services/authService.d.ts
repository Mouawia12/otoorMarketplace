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
export declare const googleLoginSchema: z.ZodObject<{
    idToken: z.ZodString;
}, z.core.$strip>;
export declare const registerUser: (input: z.infer<typeof registerSchema>) => Promise<{
    token: string;
    user: {
        id: number;
        email: string;
        full_name: string;
        avatar_url: string | null;
        created_at: Date;
        status: import(".prisma/client").$Enums.UserStatus;
        roles: string[];
    };
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
    };
}>;
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
    };
}>;
//# sourceMappingURL=authService.d.ts.map