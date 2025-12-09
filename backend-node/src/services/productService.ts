import { NotificationType, Prisma, ProductCondition, ProductStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";
import { makeSlug } from "../utils/slugify";
import { normalizeImagePathForStorage, toPublicAssetUrl } from "../utils/assets";
import { createNotificationForUser, notifyAdmins } from "./notificationService";

const normalizeStatus = (status: string | null | undefined) => {
  if (!status) return status ?? "";
  const value = status.toLowerCase();
  if (value === "pending_review") return "pending";
  if (value === "published") return "published";
  if (value === "draft") return "draft";
  if (value === "rejected") return "rejected";
  if (value === "archived") return "archived";
  return value;
};

export const normalizeProduct = (product: any) => {
  const plain = toPlainObject(product);
  const rawImages = Array.isArray(plain.images)
    ? plain.images.map((image: any) => image.url)
    : plain.image_urls ?? [];
  const images = (Array.isArray(rawImages) ? rawImages : [])
    .map((url: any) => (typeof url === "string" ? url : null))
    .filter((url): url is string => Boolean(url))
    .map((url) => toPublicAssetUrl(url));

  return {
    id: plain.id,
    seller_id: plain.sellerId,
    name_ar: plain.nameAr,
    name_en: plain.nameEn,
    description_ar: plain.descriptionAr,
    description_en: plain.descriptionEn,
    product_type: plain.productType,
    brand: plain.brand,
    category: plain.category,
    base_price: plain.basePrice,
    size_ml: plain.sizeMl,
    concentration: plain.concentration,
    condition: plain.condition?.toLowerCase?.() ?? plain.condition,
    stock_quantity: plain.stockQuantity,
  image_urls: images,
    status: normalizeStatus(plain.status),
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
    rating_avg: Number(plain.rating_avg ?? 0),
    rating_count: typeof plain.rating_count === "number" ? plain.rating_count : 0,
    seller: plain.seller
      ? {
          id: plain.seller.id,
          full_name: plain.seller.fullName,
          verified_seller: plain.seller.verifiedSeller,
        }
      : undefined,
  };
};

const listProductsSchema = z.object({
  search: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  condition: z.nativeEnum(ProductCondition).optional(),
  status: z
    .union([
      z.nativeEnum(ProductStatus),
      z.enum(["pending", "published", "draft", "rejected", "archived"]),
    ])
    .optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  sort: z
    .enum(["price_asc", "price_desc", "newest", "oldest", "stock"])
    .default("newest")
    .optional(),
  page: z.coerce.number().default(1).optional(),
  page_size: z.coerce.number().default(12).optional(),
  seller: z.union([z.literal("me"), z.coerce.number()]).optional(),
});

export const listProducts = async (query: unknown) => {
  const normalizedQuery =
    query && typeof query === "object"
      ? { ...(query as Record<string, unknown>) }
      : {};

  if (typeof normalizedQuery.condition === "string") {
    const value = normalizedQuery.condition.toUpperCase();
    if (Object.values(ProductCondition).includes(value as ProductCondition)) {
      normalizedQuery.condition = value;
    } else {
      delete normalizedQuery.condition;
    }
  }

  const {
    search,
    brand,
    category,
    condition,
    status,
    min_price,
  max_price,
  sort,
  page = 1,
  page_size = 12,
  seller,
  } = listProductsSchema.parse(normalizedQuery);

  const filters: Prisma.ProductWhereInput = {};

  if (status) {
    if (typeof status === "string") {
      if (status === "pending") {
        filters.status = ProductStatus.PENDING_REVIEW;
      } else {
        filters.status = status.toUpperCase() as ProductStatus;
      }
    } else {
      filters.status = status;
    }
  } else {
    filters.status = ProductStatus.PUBLISHED;
  }

  if (seller && seller !== "me") {
    filters.sellerId = seller;
  }

  if (condition) {
    filters.condition = condition;
  }

  if (brand) {
    filters.brand = brand;
  }

  if (category) {
    filters.category = category;
  }

  if (search) {
    filters.OR = [
      { nameEn: { contains: search } },
      { nameAr: { contains: search } },
      { brand: { contains: search } },
    ];
  }

  if (min_price !== undefined || max_price !== undefined) {
    filters.basePrice = {};
    if (min_price !== undefined) {
      filters.basePrice.gte = new Prisma.Decimal(min_price);
    }
    if (max_price !== undefined) {
      filters.basePrice.lte = new Prisma.Decimal(max_price);
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];
  switch (sort) {
    case "price_asc":
      orderBy.push({ basePrice: "asc" });
      break;
    case "price_desc":
      orderBy.push({ basePrice: "desc" });
      break;
    case "oldest":
      orderBy.push({ createdAt: "asc" });
      break;
    case "stock":
      orderBy.push({ stockQuantity: "desc" });
      break;
    default:
      orderBy.push({ createdAt: "desc" });
  }

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where: filters }),
    prisma.product.findMany({
      where: filters,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        seller: {
          select: {
            id: true,
            fullName: true,
            verifiedSeller: true,
          },
        },
        auctions: true,
      },
      orderBy,
      skip: (page - 1) * page_size,
      take: page_size,
    }),
  ]);

  const products = items.map((product) => normalizeProduct(product));

  return {
    products,
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size),
  };
};

export const getProductById = async (id: number) => {
  const [product, ratingStats] = await prisma.$transaction([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        seller: {
          select: {
            id: true,
            fullName: true,
            verifiedSeller: true,
          },
        },
        auctions: true,
      },
    }),
    prisma.productReview.aggregate({
      where: { productId: id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  if (!product) {
    throw AppError.notFound("Product not found");
  }

  return normalizeProduct({
    ...product,
    rating_avg: ratingStats._avg.rating ?? 0,
    rating_count: ratingStats._count.rating ?? 0,
  });
};

export const getRelatedProducts = async (productId: number, limit = 4) => {
  const base = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!base) {
    return [];
  }

  const related = await prisma.product.findMany({
    where: {
      id: { not: productId },
      status: ProductStatus.PUBLISHED,
      OR: [
        { category: base.category },
        { brand: base.brand },
      ],
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
    take: limit,
  });

  return related.map((product) => normalizeProduct(product));
};

export const getProductFiltersMeta = async () => {
  const [brandRows, categoryRows, priceAgg] = await prisma.$transaction([
    prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED },
      distinct: ["brand"],
      select: { brand: true },
      orderBy: { brand: "asc" },
    }),
    prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.product.aggregate({
      where: { status: ProductStatus.PUBLISHED },
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);

  const brands = brandRows
    .map((row) => row.brand)
    .filter((value): value is string => Boolean(value));

  const categories = categoryRows
    .map((row) => row.category)
    .filter((value): value is string => Boolean(value));

  const min_price = priceAgg._min.basePrice
    ? Number(priceAgg._min.basePrice)
    : undefined;
  const max_price = priceAgg._max.basePrice
    ? Number(priceAgg._max.basePrice)
    : undefined;

  return {
    brands,
    categories,
    conditions: Object.values(ProductCondition).map((condition) =>
      condition.toLowerCase()
    ),
    ...(min_price !== undefined ? { min_price } : {}),
    ...(max_price !== undefined ? { max_price } : {}),
  };
};

const imageUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => /^https?:\/\//.test(value) || value.startsWith("/"),
    "Image URL must be an absolute or relative URL"
  );

const productInputSchema = z.object({
  sellerId: z.coerce.number().int().positive(),
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
  condition: z.nativeEnum(ProductCondition),
  stockQuantity: z.coerce.number().int().nonnegative(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.PENDING_REVIEW),
  imageUrls: z.array(imageUrlSchema).default([]),
});

export const createProduct = async (input: z.infer<typeof productInputSchema>) => {
  const data = productInputSchema.parse(input);
  const slugBase = makeSlug(data.nameEn);

  const existingSlug = await prisma.product.findFirst({
    where: { slug: slugBase },
    select: { id: true },
  });

  const slug =
    existingSlug && existingSlug.id
      ? `${slugBase}-${Date.now().toString(36)}`
      : slugBase;

  const sanitizedImages = data.imageUrls
    .map((url) => normalizeImagePathForStorage(url))
    .filter((value): value is string => Boolean(value));

  const product = await prisma.product.create({
    data: {
      sellerId: data.sellerId,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      slug,
      descriptionAr: data.descriptionAr,
      descriptionEn: data.descriptionEn,
      productType: data.productType,
      brand: data.brand,
      category: data.category,
      basePrice: new Prisma.Decimal(data.basePrice),
      sizeMl: data.sizeMl,
      concentration: data.concentration,
      condition: data.condition,
      stockQuantity: data.stockQuantity,
      status: data.status,
      images: {
        create: sanitizedImages.map((url, index) => ({
          url,
          sortOrder: index,
        })),
      },
    },
    include: {
      images: true,
      seller: {
        select: {
          id: true,
          fullName: true,
          verifiedSeller: true,
        },
      },
    },
  });

  await createNotificationForUser({
    userId: product.sellerId,
    type: NotificationType.PRODUCT_SUBMITTED,
    title: "تم استلام منتجك",
    message: `نراجع الآن منتجك ${product.nameEn}. سنعلمك فور اتخاذ القرار.`,
    data: { productId: product.id },
  });

  await notifyAdmins({
    type: NotificationType.PRODUCT_SUBMITTED,
    title: "منتج جديد بانتظار المراجعة",
    message: `${product.seller?.fullName ?? "بائع"} أضاف المنتج ${product.nameEn}.`,
    data: { productId: product.id, sellerId: product.sellerId },
    fallbackToSupport: true,
  });

  return normalizeProduct(product);
};

const updateProductSchema = z.object({
  nameAr: z.string().min(2).optional(),
  nameEn: z.string().min(2).optional(),
  descriptionAr: z.string().min(4).optional(),
  descriptionEn: z.string().min(4).optional(),
  productType: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  basePrice: z.coerce.number().positive().optional(),
  sizeMl: z.coerce.number().int().positive().optional(),
  concentration: z.string().min(1).optional(),
  condition: z.nativeEnum(ProductCondition).optional(),
  stockQuantity: z.coerce.number().int().nonnegative().optional(),
  status: z
    .union([
      z.nativeEnum(ProductStatus),
      z.enum(["pending", "published", "draft", "rejected", "archived"]),
    ])
    .optional(),
  imageUrls: z.array(imageUrlSchema).optional(),
});

export const updateProduct = async (
  productId: number,
  sellerId: number,
  payload: unknown
) => {
  const data = updateProductSchema.parse(payload);

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.sellerId !== sellerId) {
    throw AppError.notFound("Product not found");
  }

  const wasPendingReview = product.status === ProductStatus.PENDING_REVIEW;

  const updateData: Prisma.ProductUpdateInput = {};

  if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
  if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
  if (data.descriptionAr !== undefined) updateData.descriptionAr = data.descriptionAr;
  if (data.descriptionEn !== undefined) updateData.descriptionEn = data.descriptionEn;
  if (data.productType !== undefined) updateData.productType = data.productType;
  if (data.brand !== undefined) updateData.brand = data.brand;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.basePrice !== undefined) updateData.basePrice = new Prisma.Decimal(data.basePrice);
  if (data.sizeMl !== undefined) updateData.sizeMl = data.sizeMl;
  if (data.concentration !== undefined) updateData.concentration = data.concentration;
  if (data.condition !== undefined) updateData.condition = data.condition;
  if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
  if (data.status !== undefined) {
    if (
      typeof data.status === "string" &&
      (data.status.toLowerCase() === "pending" || data.status.toLowerCase() === "published")
    ) {
      updateData.status = ProductStatus.PENDING_REVIEW;
    } else if (typeof data.status === "string") {
      updateData.status = data.status.toUpperCase() as ProductStatus;
    } else {
      updateData.status = data.status;
    }
  }

  const willBePendingReview = updateData.status === ProductStatus.PENDING_REVIEW && !wasPendingReview;

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

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...updateData,
      ...(imagesUpdate ? { images: imagesUpdate } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: "asc" as const } },
      seller: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  if (willBePendingReview) {
    await notifyAdmins({
      type: NotificationType.PRODUCT_SUBMITTED,
      title: "تعديلات منتج بانتظار المراجعة",
      message: `${updated.seller?.fullName ?? "بائع"} عدل المنتج ${updated.nameEn ?? updated.nameAr} ويحتاج موافقة جديدة`,
      data: {
        productId: updated.id,
        sellerId,
        reason: "update",
      },
      fallbackToSupport: true,
    });

    await createNotificationForUser({
      userId: sellerId,
      type: NotificationType.PRODUCT_SUBMITTED,
      title: "تم إرسال التعديلات للمراجعة",
      message: `استلمنا تعديلاتك على ${updated.nameEn ?? updated.nameAr}. سيتم إشعارك فور مراجعتها.`,
      data: { productId: updated.id },
    });
  }

  return normalizeProduct(updated);
};

export const moderateProduct = async (
  productId: number,
  action: "approve" | "reject"
) => {
  const status =
    action === "approve" ? ProductStatus.PUBLISHED : ProductStatus.REJECTED;

  const product = await prisma.product.update({
    where: { id: productId },
    data: { status },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  await createNotificationForUser({
    userId: product.sellerId,
    type:
      action === "approve"
        ? NotificationType.PRODUCT_APPROVED
        : NotificationType.PRODUCT_REJECTED,
    title: action === "approve" ? "تم نشر المنتج" : "تم رفض المنتج",
    message:
      action === "approve"
        ? `${product.nameEn ?? "المنتج"} أصبح متاحًا الآن في المتجر.`
        : `نأسف، تم رفض ${product.nameEn ?? "المنتج"}. راجع المتطلبات وحاول مرة أخرى.`,
    data: { productId: product.id, status },
  });

  return normalizeProduct(product);
};
