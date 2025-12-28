import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { normalizeImagePathForStorage, toPublicAssetUrl } from "../utils/assets";

const baseTemplateSchema = z.object({
  nameAr: z.string().min(2),
  nameEn: z.string().min(2),
  descriptionAr: z.string().min(4),
  descriptionEn: z.string().min(4),
  productType: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  basePrice: z.coerce.number().positive(),
  sizeMl: z.coerce.number().int().positive(),
  concentration: z.string().min(1),
  imageUrls: z.array(z.string()).default([]),
});

const createTemplateSchema = baseTemplateSchema.extend({
  createdById: z.number().int().positive(),
});

const updateTemplateSchema = baseTemplateSchema.partial();

const listTemplatesSchema = z.object({
  search: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

const normalizeTemplate = (template: any) => {
  const images = Array.isArray(template.images)
    ? template.images
        .map((img: any) => (typeof img.url === "string" ? img.url : null))
        .filter((url: string | null): url is string => Boolean(url))
        .map((url: string) => toPublicAssetUrl(url))
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

export const createProductTemplate = async (payload: unknown) => {
  const data = createTemplateSchema.parse(payload);

  const images = data.imageUrls
    .map((url) => normalizeImagePathForStorage(url))
    .filter((url): url is string => Boolean(url));

  const template = await prisma.productTemplate.create({
    data: {
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      descriptionAr: data.descriptionAr,
      descriptionEn: data.descriptionEn,
      productType: data.productType,
      brand: data.brand,
      category: data.category,
      basePrice: new Prisma.Decimal(data.basePrice),
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

export const updateProductTemplate = async (
  templateId: number,
  payload: unknown
) => {
  const data = updateTemplateSchema.parse(payload);

  const existing = await prisma.productTemplate.findUnique({
    where: { id: templateId },
  });

  if (!existing) {
    throw AppError.notFound("Template not found");
  }

  const updateData: Prisma.ProductTemplateUpdateInput = {};

  if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
  if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
  if (data.descriptionAr !== undefined) updateData.descriptionAr = data.descriptionAr;
  if (data.descriptionEn !== undefined) updateData.descriptionEn = data.descriptionEn;
  if (data.productType !== undefined) updateData.productType = data.productType;
  if (data.brand !== undefined) updateData.brand = data.brand;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.basePrice !== undefined) {
    updateData.basePrice = new Prisma.Decimal(data.basePrice);
  }
  if (data.sizeMl !== undefined) updateData.sizeMl = data.sizeMl;
  if (data.concentration !== undefined) updateData.concentration = data.concentration;

  const imagesUpdate =
    data.imageUrls !== undefined
      ? {
          deleteMany: {},
          create: data.imageUrls
            .map((url) => normalizeImagePathForStorage(url))
            .filter((url): url is string => Boolean(url))
            .map((url, index) => ({
              url,
              sortOrder: index,
            })),
        }
      : undefined;

  const template = await prisma.productTemplate.update({
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

export const deleteProductTemplate = async (templateId: number) => {
  await prisma.productTemplate.delete({
    where: { id: templateId },
  });
};

export const getProductTemplateById = async (templateId: number) => {
  const template = await prisma.productTemplate.findUnique({
    where: { id: templateId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  if (!template) {
    throw AppError.notFound("Template not found");
  }

  return normalizeTemplate(template);
};

export const listProductTemplates = async (query: unknown) => {
  const { search, brand, category, limit, skip } = listTemplatesSchema.parse(query ?? {});

  const where: Prisma.ProductTemplateWhereInput = {};

  if (brand) where.brand = brand;
  if (category) where.category = category;

  if (search) {
    where.OR = [
      { nameEn: { contains: search } },
      { nameAr: { contains: search } },
      { brand: { contains: search } },
      { category: { contains: search } },
    ];
  }

  const templates = await prisma.productTemplate.findMany({
    where,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, fullName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip,
  });

  return templates.map((template) => normalizeTemplate(template));
};
