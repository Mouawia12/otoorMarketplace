"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePromotions = exports.deletePromotion = exports.updatePromotion = exports.createPromotion = exports.listPromotions = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const promotionPayloadSchema = zod_1.z.object({
    title_en: zod_1.z.string().min(3),
    title_ar: zod_1.z.string().min(3),
    subtitle_en: zod_1.z.string().optional().nullable(),
    subtitle_ar: zod_1.z.string().optional().nullable(),
    description_en: zod_1.z.string().optional().nullable(),
    description_ar: zod_1.z.string().optional().nullable(),
    badge_text_en: zod_1.z.string().optional().nullable(),
    badge_text_ar: zod_1.z.string().optional().nullable(),
    button_text_en: zod_1.z.string().optional().nullable(),
    button_text_ar: zod_1.z.string().optional().nullable(),
    image_url: zod_1.z
        .string()
        .trim()
        .refine((value) => {
        if (!value)
            return false;
        if (value.startsWith('/'))
            return true;
        try {
            new URL(value);
            return true;
        }
        catch {
            return false;
        }
    }, { message: "Invalid image URL" })
        .optional()
        .nullable(),
    link_url: zod_1.z.string().optional().nullable(),
    background_color: zod_1.z.string().optional().nullable(),
    text_color: zod_1.z.string().optional().nullable(),
    floating_position: zod_1.z.enum(["bottom-right", "bottom-left"]).optional().nullable(),
    type: zod_1.z.nativeEnum(client_1.PromotionType),
    is_active: zod_1.z.boolean().optional(),
    sort_order: zod_1.z.coerce.number().int().optional(),
    start_at: zod_1.z.string().datetime().optional().nullable(),
    end_at: zod_1.z.string().datetime().optional().nullable(),
});
const updateSchema = promotionPayloadSchema.partial();
const serializePromotion = (promotion) => ({
    id: promotion.id,
    type: promotion.type,
    title_en: promotion.titleEn,
    title_ar: promotion.titleAr,
    subtitle_en: promotion.subtitleEn,
    subtitle_ar: promotion.subtitleAr,
    description_en: promotion.descriptionEn,
    description_ar: promotion.descriptionAr,
    badge_text_en: promotion.badgeTextEn,
    badge_text_ar: promotion.badgeTextAr,
    button_text_en: promotion.buttonTextEn,
    button_text_ar: promotion.buttonTextAr,
    image_url: promotion.imageUrl,
    link_url: promotion.linkUrl,
    background_color: promotion.backgroundColor,
    text_color: promotion.textColor,
    floating_position: promotion.floatingPosition,
    is_active: promotion.isActive,
    sort_order: promotion.sortOrder,
    start_at: promotion.startAt,
    end_at: promotion.endAt,
    created_at: promotion.createdAt,
    updated_at: promotion.updatedAt,
});
const parseDate = (value) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw errors_1.AppError.badRequest("تاريخ غير صالح");
    }
    return date;
};
const listPromotions = async () => {
    const promotions = await client_2.prisma.promotion.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return promotions.map(serializePromotion);
};
exports.listPromotions = listPromotions;
const createPromotion = async (input) => {
    const data = promotionPayloadSchema.parse(input);
    const promotion = await client_2.prisma.promotion.create({
        data: {
            type: data.type,
            titleEn: data.title_en,
            titleAr: data.title_ar,
            subtitleEn: data.subtitle_en ?? null,
            subtitleAr: data.subtitle_ar ?? null,
            descriptionEn: data.description_en ?? null,
            descriptionAr: data.description_ar ?? null,
            badgeTextEn: data.badge_text_en ?? null,
            badgeTextAr: data.badge_text_ar ?? null,
            buttonTextEn: data.button_text_en ?? null,
            buttonTextAr: data.button_text_ar ?? null,
            imageUrl: data.image_url ?? null,
            linkUrl: data.link_url ?? null,
            backgroundColor: data.background_color ?? "#0f172a",
            textColor: data.text_color ?? "#ffffff",
            floatingPosition: data.floating_position ?? null,
            isActive: data.is_active ?? true,
            sortOrder: data.sort_order ?? 0,
            startAt: parseDate(data.start_at),
            endAt: parseDate(data.end_at),
        },
    });
    return serializePromotion(promotion);
};
exports.createPromotion = createPromotion;
const updatePromotion = async (id, input) => {
    const existing = await client_2.prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
        throw errors_1.AppError.notFound("الإعلان غير موجود");
    }
    const data = updateSchema.parse(input);
    const promotion = await client_2.prisma.promotion.update({
        where: { id },
        data: {
            type: data.type ?? existing.type,
            titleEn: data.title_en ?? existing.titleEn,
            titleAr: data.title_ar ?? existing.titleAr,
            subtitleEn: data.subtitle_en !== undefined ? data.subtitle_en : existing.subtitleEn,
            subtitleAr: data.subtitle_ar !== undefined ? data.subtitle_ar : existing.subtitleAr,
            descriptionEn: data.description_en !== undefined
                ? data.description_en
                : existing.descriptionEn,
            descriptionAr: data.description_ar !== undefined
                ? data.description_ar
                : existing.descriptionAr,
            badgeTextEn: data.badge_text_en !== undefined
                ? data.badge_text_en
                : existing.badgeTextEn,
            badgeTextAr: data.badge_text_ar !== undefined
                ? data.badge_text_ar
                : existing.badgeTextAr,
            buttonTextEn: data.button_text_en !== undefined
                ? data.button_text_en
                : existing.buttonTextEn,
            buttonTextAr: data.button_text_ar !== undefined
                ? data.button_text_ar
                : existing.buttonTextAr,
            imageUrl: data.image_url !== undefined ? data.image_url : existing.imageUrl,
            linkUrl: data.link_url !== undefined ? data.link_url : existing.linkUrl,
            backgroundColor: data.background_color !== undefined
                ? data.background_color
                : existing.backgroundColor,
            textColor: data.text_color !== undefined ? data.text_color : existing.textColor,
            floatingPosition: data.floating_position !== undefined
                ? data.floating_position
                : existing.floatingPosition,
            isActive: data.is_active ?? existing.isActive,
            sortOrder: data.sort_order ?? existing.sortOrder,
            startAt: data.start_at !== undefined ? parseDate(data.start_at) : existing.startAt,
            endAt: data.end_at !== undefined ? parseDate(data.end_at) : existing.endAt,
        },
    });
    return serializePromotion(promotion);
};
exports.updatePromotion = updatePromotion;
const deletePromotion = async (id) => {
    const existing = await client_2.prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
        throw errors_1.AppError.notFound("الإعلان غير موجود");
    }
    await client_2.prisma.promotion.delete({ where: { id } });
};
exports.deletePromotion = deletePromotion;
const nowIsBetween = (startAt, endAt) => {
    const now = Date.now();
    if (startAt && startAt.getTime() > now) {
        return false;
    }
    if (endAt && endAt.getTime() < now) {
        return false;
    }
    return true;
};
const getActivePromotions = async (params) => {
    const where = {
        isActive: true,
    };
    if (params?.types && params.types.length > 0) {
        where.type = { in: params.types };
    }
    const promotions = await client_2.prisma.promotion.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return promotions
        .filter((promotion) => nowIsBetween(promotion.startAt, promotion.endAt))
        .map(serializePromotion);
};
exports.getActivePromotions = getActivePromotions;
//# sourceMappingURL=promotionService.js.map