"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSocialLinks = exports.getSocialLinks = exports.updatePlatformSettings = exports.getPlatformSettings = exports.updateBankTransferSettings = exports.getBankTransferSettings = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const BANK_TRANSFER_KEY = "bank_transfer";
const PLATFORM_SETTINGS_KEY = "platform_settings";
const SOCIAL_LINKS_KEY = "social_links";
const bankTransferSchema = zod_1.z.object({
    bankName: zod_1.z.string().min(2),
    accountName: zod_1.z.string().min(2),
    iban: zod_1.z.string().min(8),
    swift: zod_1.z.string().min(4),
    instructions: zod_1.z.string().min(4),
});
const defaultBankTransferSettings = {
    bankName: "مصرف الراجحي",
    accountName: "شركة عالم العطور للتجارة",
    iban: "SA00 0000 0000 0000 0000 0000",
    swift: "RJHISARI",
    instructions: "يرجى تحويل المبلغ خلال 24 ساعة وإرسال إيصال التحويل لفريق الدعم ليتم تأكيد الطلب وشحنه.",
};
const platformSettingsSchema = zod_1.z.object({
    commissionNew: zod_1.z.coerce.number().nonnegative(),
    commissionUsed: zod_1.z.coerce.number().nonnegative(),
    commissionAuction: zod_1.z.coerce.number().nonnegative(),
    authenticityFee: zod_1.z.coerce.number().nonnegative(),
    notificationsEnabled: zod_1.z.coerce.boolean().default(true),
    language: zod_1.z.enum(["ar", "en"]).default("ar"),
    theme: zod_1.z.enum(["light", "dark"]).default("light"),
});
const defaultPlatformSettings = {
    commissionNew: 10,
    commissionUsed: 5,
    commissionAuction: 5,
    authenticityFee: 25,
    notificationsEnabled: true,
    language: "ar",
    theme: "light",
};
const handlePrismaTableError = (error) => {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")) {
        throw errors_1.AppError.internal("Settings storage is not initialized. Please run the latest migrations.");
    }
    throw error;
};
const safeFindSetting = async (key) => {
    try {
        return await client_2.prisma.setting.findUnique({ where: { key } });
    }
    catch (error) {
        handlePrismaTableError(error);
    }
};
const safeUpsertSetting = async (key, value) => {
    try {
        await client_2.prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }
    catch (error) {
        handlePrismaTableError(error);
    }
};
const getBankTransferSettings = async () => {
    const setting = await safeFindSetting(BANK_TRANSFER_KEY);
    if (!setting || !setting.value) {
        return defaultBankTransferSettings;
    }
    const parsed = bankTransferSchema.partial().parse(setting.value);
    const merged = {
        ...defaultBankTransferSettings,
        ...parsed,
    };
    return merged;
};
exports.getBankTransferSettings = getBankTransferSettings;
const updateBankTransferSettings = async (input) => {
    const data = bankTransferSchema.parse(input);
    await safeUpsertSetting(BANK_TRANSFER_KEY, data);
    return data;
};
exports.updateBankTransferSettings = updateBankTransferSettings;
const getPlatformSettings = async () => {
    const setting = await safeFindSetting(PLATFORM_SETTINGS_KEY);
    if (!setting || !setting.value) {
        return defaultPlatformSettings;
    }
    const parsed = platformSettingsSchema.partial().parse(setting.value);
    const merged = {
        ...defaultPlatformSettings,
        ...parsed,
    };
    return merged;
};
exports.getPlatformSettings = getPlatformSettings;
const updatePlatformSettings = async (input) => {
    const data = platformSettingsSchema.parse(input);
    await safeUpsertSetting(PLATFORM_SETTINGS_KEY, data);
    return data;
};
exports.updatePlatformSettings = updatePlatformSettings;
const SOCIAL_LINK_FIELDS = [
    "instagram",
    "tiktok",
    "facebook",
    "twitter",
    "youtube",
    "snapchat",
    "linkedin",
    "whatsapp",
];
const socialLinkValueSchema = zod_1.z.string().trim().url();
const socialLinksSchema = zod_1.z.object({
    instagram: socialLinkValueSchema.optional(),
    tiktok: socialLinkValueSchema.optional(),
    facebook: socialLinkValueSchema.optional(),
    twitter: socialLinkValueSchema.optional(),
    youtube: socialLinkValueSchema.optional(),
    snapchat: socialLinkValueSchema.optional(),
    linkedin: socialLinkValueSchema.optional(),
    whatsapp: socialLinkValueSchema.optional(),
});
const defaultSocialLinks = SOCIAL_LINK_FIELDS.reduce((acc, key) => {
    acc[key] = "";
    return acc;
}, {});
const normalizeSocialInput = (input) => {
    if (!input || typeof input !== "object") {
        return {};
    }
    const payload = {};
    SOCIAL_LINK_FIELDS.forEach((field) => {
        const raw = input[field];
        if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (trimmed.length > 0) {
                payload[field] = trimmed;
            }
        }
    });
    return payload;
};
const getSocialLinks = async () => {
    const setting = await safeFindSetting(SOCIAL_LINKS_KEY);
    if (!setting || !setting.value) {
        return defaultSocialLinks;
    }
    const parsed = socialLinksSchema.partial().parse(setting.value);
    const sanitized = {};
    SOCIAL_LINK_FIELDS.forEach((field) => {
        const value = parsed[field];
        if (typeof value === "string") {
            sanitized[field] = value;
        }
    });
    return {
        ...defaultSocialLinks,
        ...sanitized,
    };
};
exports.getSocialLinks = getSocialLinks;
const updateSocialLinks = async (input) => {
    const normalized = normalizeSocialInput(input);
    const data = socialLinksSchema.parse(normalized);
    await safeUpsertSetting(SOCIAL_LINKS_KEY, data);
    const sanitized = {};
    SOCIAL_LINK_FIELDS.forEach((field) => {
        const value = data[field];
        if (typeof value === "string") {
            sanitized[field] = value;
        }
    });
    return {
        ...defaultSocialLinks,
        ...sanitized,
    };
};
exports.updateSocialLinks = updateSocialLinks;
//# sourceMappingURL=settingService.js.map