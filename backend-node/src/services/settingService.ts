import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";

const BANK_TRANSFER_KEY = "bank_transfer";
const PLATFORM_SETTINGS_KEY = "platform_settings";
const SOCIAL_LINKS_KEY = "social_links";

const bankTransferSchema = z.object({
  bankName: z.string().min(2),
  accountName: z.string().min(2),
  iban: z.string().min(8),
  swift: z.string().min(4),
  instructions: z.string().min(4),
});

export type BankTransferSettings = z.infer<typeof bankTransferSchema>;

const defaultBankTransferSettings: BankTransferSettings = {
  bankName: "مصرف الراجحي",
  accountName: "شركة عالم العطور للتجارة",
  iban: "SA00 0000 0000 0000 0000 0000",
  swift: "RJHISARI",
  instructions:
    "يرجى تحويل المبلغ خلال 24 ساعة وإرسال إيصال التحويل لفريق الدعم ليتم تأكيد الطلب وشحنه.",
};

const platformSettingsSchema = z.object({
  commissionNew: z.coerce.number().nonnegative(),
  commissionUsed: z.coerce.number().nonnegative(),
  commissionAuction: z.coerce.number().nonnegative(),
  authenticityFee: z.coerce.number().nonnegative(),
  notificationsEnabled: z.coerce.boolean().default(true),
  language: z.enum(["ar", "en"]).default("ar"),
  theme: z.enum(["light", "dark"]).default("light"),
});

export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

const defaultPlatformSettings: PlatformSettings = {
  commissionNew: 10,
  commissionUsed: 5,
  commissionAuction: 5,
  authenticityFee: 25,
  notificationsEnabled: true,
  language: "ar",
  theme: "light",
};

const handlePrismaTableError = (error: unknown) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    throw AppError.internal("Settings storage is not initialized. Please run the latest migrations.");
  }
  throw error;
};

const safeFindSetting = async (key: string) => {
  try {
    return await prisma.setting.findUnique({ where: { key } });
  } catch (error) {
    handlePrismaTableError(error);
  }
};

const safeUpsertSetting = async (key: string, value: Prisma.JsonObject) => {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  } catch (error) {
    handlePrismaTableError(error);
  }
};

export const getBankTransferSettings = async (): Promise<BankTransferSettings> => {
  const setting = await safeFindSetting(BANK_TRANSFER_KEY);

  if (!setting || !setting.value) {
    return defaultBankTransferSettings;
  }

  const parsed = bankTransferSchema.partial().parse(setting.value) as Partial<BankTransferSettings>;
  const merged: BankTransferSettings = {
    ...defaultBankTransferSettings,
    ...parsed,
  };
  return merged;
};

export const updateBankTransferSettings = async (
  input: unknown
): Promise<BankTransferSettings> => {
  const data = bankTransferSchema.parse(input);

  await safeUpsertSetting(BANK_TRANSFER_KEY, data as Prisma.JsonObject);

  return data;
};

export const getPlatformSettings = async (): Promise<PlatformSettings> => {
  const setting = await safeFindSetting(PLATFORM_SETTINGS_KEY);

  if (!setting || !setting.value) {
    return defaultPlatformSettings;
  }

  const parsed = platformSettingsSchema.partial().parse(setting.value) as Partial<PlatformSettings>;
  const merged: PlatformSettings = {
    ...defaultPlatformSettings,
    ...parsed,
  };
  return merged;
};

export const updatePlatformSettings = async (input: unknown): Promise<PlatformSettings> => {
  const data = platformSettingsSchema.parse(input);
  await safeUpsertSetting(PLATFORM_SETTINGS_KEY, data as Prisma.JsonObject);
  return data;
};

const SOCIAL_LINK_FIELDS = [
  "instagram",
  "tiktok",
  "facebook",
  "twitter",
  "youtube",
  "snapchat",
  "linkedin",
  "whatsapp",
] as const;

const socialLinkValueSchema = z.string().trim().url();

const socialLinksSchema = z.object({
  instagram: socialLinkValueSchema.optional(),
  tiktok: socialLinkValueSchema.optional(),
  facebook: socialLinkValueSchema.optional(),
  twitter: socialLinkValueSchema.optional(),
  youtube: socialLinkValueSchema.optional(),
  snapchat: socialLinkValueSchema.optional(),
  linkedin: socialLinkValueSchema.optional(),
  whatsapp: socialLinkValueSchema.optional(),
});

export type SocialLinks = z.infer<typeof socialLinksSchema>;

type SocialLinksResponse = Record<(typeof SOCIAL_LINK_FIELDS)[number], string>;

const defaultSocialLinks: SocialLinksResponse = SOCIAL_LINK_FIELDS.reduce(
  (acc, key) => {
    acc[key] = "";
    return acc;
  },
  {} as SocialLinksResponse,
);

const normalizeSocialInput = (input: unknown) => {
  if (!input || typeof input !== "object") {
    return {};
  }
  const payload: Partial<SocialLinks> = {};

  SOCIAL_LINK_FIELDS.forEach((field) => {
    const raw = (input as Record<string, unknown>)[field];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.length > 0) {
        payload[field] = trimmed;
      }
    }
  });

  return payload;
};

export const getSocialLinks = async (): Promise<SocialLinksResponse> => {
  const setting = await safeFindSetting(SOCIAL_LINKS_KEY);

  if (!setting || !setting.value) {
    return defaultSocialLinks;
  }

  const parsed = socialLinksSchema.partial().parse(setting.value) as Partial<SocialLinks>;
  const sanitized: Partial<SocialLinksResponse> = {};
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

export const updateSocialLinks = async (input: unknown): Promise<SocialLinksResponse> => {
  const normalized = normalizeSocialInput(input);
  const data = socialLinksSchema.parse(normalized);
  await safeUpsertSetting(SOCIAL_LINKS_KEY, data as Prisma.JsonObject);
  const sanitized: Partial<SocialLinksResponse> = {};
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
