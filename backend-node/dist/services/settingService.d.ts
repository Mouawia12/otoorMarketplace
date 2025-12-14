import { z } from "zod";
declare const bankTransferSchema: z.ZodObject<{
    bankName: z.ZodString;
    accountName: z.ZodString;
    iban: z.ZodString;
    swift: z.ZodString;
    instructions: z.ZodString;
}, z.core.$strip>;
export type BankTransferSettings = z.infer<typeof bankTransferSchema>;
declare const platformSettingsSchema: z.ZodObject<{
    commissionNew: z.ZodCoercedNumber<unknown>;
    commissionUsed: z.ZodCoercedNumber<unknown>;
    commissionAuction: z.ZodCoercedNumber<unknown>;
    authenticityFee: z.ZodCoercedNumber<unknown>;
    notificationsEnabled: z.ZodDefault<z.ZodCoercedBoolean<unknown>>;
    language: z.ZodDefault<z.ZodEnum<{
        ar: "ar";
        en: "en";
    }>>;
    theme: z.ZodDefault<z.ZodEnum<{
        light: "light";
        dark: "dark";
    }>>;
}, z.core.$strip>;
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;
export declare const getBankTransferSettings: () => Promise<BankTransferSettings>;
export declare const updateBankTransferSettings: (input: unknown) => Promise<BankTransferSettings>;
export declare const getPlatformSettings: () => Promise<PlatformSettings>;
export declare const updatePlatformSettings: (input: unknown) => Promise<PlatformSettings>;
declare const SOCIAL_LINK_FIELDS: readonly ["instagram", "tiktok", "facebook", "twitter", "youtube", "snapchat", "linkedin", "whatsapp"];
declare const socialLinksSchema: z.ZodObject<{
    instagram: z.ZodOptional<z.ZodString>;
    tiktok: z.ZodOptional<z.ZodString>;
    facebook: z.ZodOptional<z.ZodString>;
    twitter: z.ZodOptional<z.ZodString>;
    youtube: z.ZodOptional<z.ZodString>;
    snapchat: z.ZodOptional<z.ZodString>;
    linkedin: z.ZodOptional<z.ZodString>;
    whatsapp: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SocialLinks = z.infer<typeof socialLinksSchema>;
type SocialLinksResponse = Record<(typeof SOCIAL_LINK_FIELDS)[number], string>;
export declare const getSocialLinks: () => Promise<SocialLinksResponse>;
export declare const updateSocialLinks: (input: unknown) => Promise<SocialLinksResponse>;
export {};
//# sourceMappingURL=settingService.d.ts.map