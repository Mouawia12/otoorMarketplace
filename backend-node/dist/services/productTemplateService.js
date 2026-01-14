"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductTemplates = exports.getProductTemplateById = exports.deleteProductTemplate = exports.updateProductTemplate = exports.createProductTemplate = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const assets_1 = require("../utils/assets");
const baseTemplateSchema = zod_1.z.object({
    nameAr: zod_1.z.string().min(2),
    nameEn: zod_1.z.string().min(2),
    descriptionAr: zod_1.z.string().min(4),
    descriptionEn: zod_1.z.string().min(4),
    productType: zod_1.z.string().min(1),
    brand: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    basePrice: zod_1.z.coerce.number().positive(),
    sizeMl: zod_1.z.coerce.number().int().positive(),
    concentration: zod_1.z.string().min(1),
    imageUrls: zod_1.z.array(zod_1.z.string()).default([]),
});
const createTemplateSchema = baseTemplateSchema.extend({
    createdById: zod_1.z.number().int().positive(),
});
const updateTemplateSchema = baseTemplateSchema.partial();
const listTemplatesSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    brand: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(50),
    skip: zod_1.z.coerce.number().int().min(0).default(0),
});
const normalizeTemplate = (template) => {
    const images = Array.isArray(template.images)
        ? template.images
            .map((img) => (typeof img.url === "string" ? img.url : null))
            .filter((url) => Boolean(url))
            .map((url) => (0, assets_1.toPublicAssetUrl)(url))
        : [];
    return {
        id: template.id,
        name_ar: template.nameAr,
        name_en: template.nameEn,
        description_ar: template.descriptionAr,
        description_en: template.descriptionEn,
        product_type: template.productType,
        brand: template.brand,
        category: template.category,
        base_price: Number(template.basePrice),
        size_ml: template.sizeMl,
        concentration: template.concentration,
        image_urls: images,
        created_by: template.createdBy
            ? {
                id: template.createdBy.id,
                full_name: template.createdBy.fullName,
            }
            : undefined,
        created_at: template.createdAt,
        updated_at: template.updatedAt,
    };
};
const createProductTemplate = async (payload) => {
    const data = createTemplateSchema.parse(payload);
    const images = data.imageUrls
        .map((url) => (0, assets_1.normalizeImagePathForStorage)(url))
        .filter((url) => Boolean(url));
    const template = await client_2.prisma.productTemplate.create({
        data: {
            nameAr: data.nameAr,
            nameEn: data.nameEn,
            descriptionAr: data.descriptionAr,
            descriptionEn: data.descriptionEn,
            productType: data.productType,
            brand: data.brand,
            category: data.category,
            basePrice: new client_1.Prisma.Decimal(data.basePrice),
            sizeMl: data.sizeMl,
            concentration: data.concentration,
            createdById: data.createdById,
            images: {
                create: images.map((url, index) => ({
                    url,
                    sortOrder: index,
                })),
            },
        },
        include: {
            images: { orderBy: { sortOrder: "asc" } },
            createdBy: {
                select: { id: true, fullName: true },
            },
        },
    });
    return normalizeTemplate(template);
};
exports.createProductTemplate = createProductTemplate;
const updateProductTemplate = async (templateId, payload) => {
    const data = updateTemplateSchema.parse(payload);
    const existing = await client_2.prisma.productTemplate.findUnique({
        where: { id: templateId },
    });
    if (!existing) {
        throw errors_1.AppError.notFound("Template not found");
    }
    const updateData = {};
    if (data.nameAr !== undefined)
        updateData.nameAr = data.nameAr;
    if (data.nameEn !== undefined)
        updateData.nameEn = data.nameEn;
    if (data.descriptionAr !== undefined)
        updateData.descriptionAr = data.descriptionAr;
    if (data.descriptionEn !== undefined)
        updateData.descriptionEn = data.descriptionEn;
    if (data.productType !== undefined)
        updateData.productType = data.productType;
    if (data.brand !== undefined)
        updateData.brand = data.brand;
    if (data.category !== undefined)
        updateData.category = data.category;
    if (data.basePrice !== undefined) {
        updateData.basePrice = new client_1.Prisma.Decimal(data.basePrice);
    }
    if (data.sizeMl !== undefined)
        updateData.sizeMl = data.sizeMl;
    if (data.concentration !== undefined)
        updateData.concentration = data.concentration;
    const imagesUpdate = data.imageUrls !== undefined
        ? {
            deleteMany: {},
            create: data.imageUrls
                .map((url) => (0, assets_1.normalizeImagePathForStorage)(url))
                .filter((url) => Boolean(url))
                .map((url, index) => ({
                url,
                sortOrder: index,
            })),
        }
        : undefined;
    const template = await client_2.prisma.productTemplate.update({
        where: { id: templateId },
        data: {
            ...updateData,
            ...(imagesUpdate ? { images: imagesUpdate } : {}),
        },
        include: {
            images: { orderBy: { sortOrder: "asc" } },
            createdBy: {
                select: { id: true, fullName: true },
            },
        },
    });
    return normalizeTemplate(template);
};
exports.updateProductTemplate = updateProductTemplate;
const deleteProductTemplate = async (templateId) => {
    await client_2.prisma.productTemplate.delete({
        where: { id: templateId },
    });
};
exports.deleteProductTemplate = deleteProductTemplate;
const getProductTemplateById = async (templateId) => {
    const template = await client_2.prisma.productTemplate.findUnique({
        where: { id: templateId },
        include: {
            images: { orderBy: { sortOrder: "asc" } },
            createdBy: { select: { id: true, fullName: true } },
        },
    });
    if (!template) {
        throw errors_1.AppError.notFound("Template not found");
    }
    return normalizeTemplate(template);
};
exports.getProductTemplateById = getProductTemplateById;
const listProductTemplates = async (query) => {
    const { search, brand, category, limit, skip } = listTemplatesSchema.parse(query ?? {});
    const where = {};
    if (brand)
        where.brand = brand;
    if (category)
        where.category = category;
    if (search) {
        where.OR = [
            { nameEn: { contains: search } },
            { nameAr: { contains: search } },
            { brand: { contains: search } },
            { category: { contains: search } },
        ];
    }
    const [templates, total, totalAll] = await client_2.prisma.$transaction([
        client_2.prisma.productTemplate.findMany({
            where,
            include: {
                images: { orderBy: { sortOrder: "asc" } },
                createdBy: { select: { id: true, fullName: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: limit,
            skip,
        }),
        client_2.prisma.productTemplate.count({ where }),
        client_2.prisma.productTemplate.count(),
    ]);
    return {
        items: templates.map((template) => normalizeTemplate(template)),
        total,
        total_all: totalAll,
    };
};
exports.listProductTemplates = listProductTemplates;
//# sourceMappingURL=productTemplateService.js.map