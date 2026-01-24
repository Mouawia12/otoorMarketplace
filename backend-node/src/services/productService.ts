import { AuctionStatus, NotificationType, Prisma, ProductCondition, ProductStatus, RoleName } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";
import { makeSlug } from "../utils/slugify";
import { normalizeImagePathForStorage, toPublicAssetUrl } from "../utils/assets";
import { createNotificationForUser, notifyAdmins } from "./notificationService";
import { buildSearchVariants } from "../utils/search";

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
  const auctions = Array.isArray(plain.auctions) ? plain.auctions : [];
  const rawImages = Array.isArray(plain.images)
    ? plain.images.map((image: any) => image.url)
    : plain.image_urls ?? [];
  const images = (Array.isArray(rawImages) ? rawImages : [])
    .map((url: any) => (typeof url === "string" ? url : null))
    .filter((url): url is string => Boolean(url))
    .map((url) => toPublicAssetUrl(url));

  const hasActiveAuction = auctions.some((auction: any) => {
    const status = typeof auction?.status === "string" ? auction.status.toUpperCase() : "";
    return status === AuctionStatus.ACTIVE || status === AuctionStatus.SCHEDULED;
  });

  const weightKg =
    typeof plain.weightKg === "number"
      ? plain.weightKg
      : plain.weightKg?.toNumber?.();

  return {
    id: plain.id,
    seller_id: plain.sellerId,
    seller_warehouse_id: plain.sellerWarehouseId ?? null,
    name_ar: plain.nameAr,
    name_en: plain.nameEn,
    description_ar: plain.descriptionAr,
    description_en: plain.descriptionEn,
    product_type: plain.productType,
    brand: plain.brand,
    category: plain.category,
    base_price: plain.basePrice,
    size_ml: plain.sizeMl,
    weight_kg: typeof weightKg === "number" && Number.isFinite(weightKg) ? weightKg : null,
    concentration: plain.concentration,
    condition: plain.condition?.toLowerCase?.() ?? plain.condition,
    stock_quantity: plain.stockQuantity,
    is_tester: Boolean(plain.isTester),
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
    seller_warehouse: plain.sellerWarehouse
      ? {
          id: plain.sellerWarehouse.id,
          warehouse_code: plain.sellerWarehouse.warehouseCode,
          warehouse_name: plain.sellerWarehouse.warehouseName,
        }
      : undefined,
    is_auction_product: auctions.length > 0,
    has_active_auction: hasActiveAuction,
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

  const now = new Date();
  filters.auctions = {
    none: {
      status: { in: [AuctionStatus.ACTIVE, AuctionStatus.SCHEDULED] },
      endTime: { gt: now },
    },
  };

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
    const variants = buildSearchVariants(search);
    if (variants.length > 0) {
      filters.OR = variants.flatMap((term) => ([
        { nameEn: { contains: term } },
        { nameAr: { contains: term } },
        { brand: { contains: term } },
      ]));
    }
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

const suggestionSchema = z.object({
  q: z.string().min(2),
  limit: z.coerce.number().min(1).max(10).default(6),
});

export const listProductSuggestions = async (query: unknown) => {
  const { q, limit } = suggestionSchema.parse(query ?? {});
  const variants = buildSearchVariants(q);
  if (variants.length === 0) {
    return [];
  }

  const now = new Date();
  const filters: Prisma.ProductWhereInput = {
    status: ProductStatus.PUBLISHED,
    auctions: {
      none: {
        status: { in: [AuctionStatus.ACTIVE, AuctionStatus.SCHEDULED] },
        endTime: { gt: now },
      },
    },
    OR: variants.flatMap((term) => ([
      { nameEn: { contains: term } },
      { nameAr: { contains: term } },
      { brand: { contains: term } },
    ])),
  };

  const items = await prisma.product.findMany({
    where: filters,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return items.map((product) => {
    const normalized = normalizeProduct(product);
    return {
      id: normalized.id,
      name_ar: normalized.name_ar,
      name_en: normalized.name_en,
      brand: normalized.brand,
      image_url: normalized.image_urls?.[0] ?? null,
      base_price: normalized.base_price,
    };
  });
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
  sellerWarehouseId: z.coerce.number().int().positive().optional(),
  nameAr: z.string().min(2),
  nameEn: z.string().min(2),
  descriptionAr: z.string().min(4),
  descriptionEn: z.string().min(4),
  productType: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  basePrice: z.coerce.number().positive(),
  sizeMl: z.coerce.number().int().positive(),
  weightKg: z.coerce.number().positive().optional(),
  concentration: z.string().min(1),
  condition: z.nativeEnum(ProductCondition),
  stockQuantity: z.coerce.number().int().nonnegative(),
  isTester: z.boolean().optional(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.PUBLISHED),
  imageUrls: z.array(imageUrlSchema).default([]),
});

export const createProduct = async (
  input: z.infer<typeof productInputSchema>,
  options?: { roles?: RoleName[] }
) => {
  const data = productInputSchema.parse(input);
  const isAdmin =
    options?.roles?.some(
      (role) => role === RoleName.ADMIN || role === RoleName.SUPER_ADMIN
    ) ?? false;
  const requestedStatus = data.status ?? ProductStatus.PUBLISHED;
  const initialStatus =
    !isAdmin && requestedStatus === ProductStatus.PUBLISHED
      ? ProductStatus.PENDING_REVIEW
      : requestedStatus;
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

  let sellerWarehouseId = data.sellerWarehouseId ?? null;
  if (sellerWarehouseId) {
    const warehouse = await prisma.sellerWarehouse.findFirst({
      where: { id: sellerWarehouseId, userId: data.sellerId },
      select: { id: true },
    });
    if (!warehouse) {
      throw AppError.badRequest("Selected warehouse is not available for this seller");
    }
  } else {
    const fallbackWarehouse = await prisma.sellerWarehouse.findFirst({
      where: { userId: data.sellerId, isDefault: true },
      select: { id: true },
    });
    if (fallbackWarehouse) {
      sellerWarehouseId = fallbackWarehouse.id;
    }
  }

  const product = await prisma.product.create({
    data: {
      sellerId: data.sellerId,
      sellerWarehouseId,
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
      weightKg: data.weightKg ? new Prisma.Decimal(data.weightKg) : null,
      concentration: data.concentration,
      condition: data.condition,
      stockQuantity: data.stockQuantity,
      isTester: data.isTester ?? false,
      status: initialStatus,
      images: {
        create: sanitizedImages.map((url, index) => ({
          url,
          sortOrder: index,
        })),
      },
    },
    include: {
      images: true,
      auctions: true,
      sellerWarehouse: true,
      seller: {
        select: {
          id: true,
          fullName: true,
          verifiedSeller: true,
        },
      },
    },
  });

  if (initialStatus === ProductStatus.PUBLISHED) {
    await createNotificationForUser({
      userId: product.sellerId,
      type: NotificationType.PRODUCT_APPROVED,
      title: "تم نشر منتجك",
      message: `${product.nameEn ?? product.nameAr} متاح الآن في المتجر ويمكنك مراقبته من لوحة البائع.`,
      data: { productId: product.id, status: initialStatus },
    });

    await notifyAdmins({
      type: NotificationType.PRODUCT_SUBMITTED,
      title: "منتج جديد تم نشره تلقائياً",
      message: `${product.seller?.fullName ?? "بائع"} أضاف المنتج ${product.nameEn ?? product.nameAr} وتم نشره مباشرة.`,
      data: { productId: product.id, sellerId: product.sellerId, status: initialStatus },
      fallbackToSupport: true,
    });
  } else if (initialStatus === ProductStatus.PENDING_REVIEW) {
    await createNotificationForUser({
      userId: product.sellerId,
      type: NotificationType.SYSTEM,
      title: "تم إرسال المنتج للمراجعة",
      message: `${product.nameEn ?? product.nameAr} بانتظار موافقة الإدارة.`,
      data: { productId: product.id, status: initialStatus },
    });

    await notifyAdmins({
      type: NotificationType.PRODUCT_SUBMITTED,
      title: "منتج بانتظار المراجعة",
      message: `${product.seller?.fullName ?? "بائع"} أرسل المنتج ${product.nameEn ?? product.nameAr} للمراجعة.`,
      data: { productId: product.id, sellerId: product.sellerId, status: initialStatus },
      fallbackToSupport: true,
    });
  }

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
  weightKg: z.coerce.number().positive().optional(),
  concentration: z.string().min(1).optional(),
  condition: z.nativeEnum(ProductCondition).optional(),
  stockQuantity: z.coerce.number().int().nonnegative().optional(),
  isTester: z.boolean().optional(),
  sellerWarehouseId: z.coerce.number().int().positive().optional(),
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
  payload: unknown,
  options?: { roles?: RoleName[] }
) => {
  const data = updateProductSchema.parse(payload);

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.sellerId !== sellerId) {
    throw AppError.notFound("Product not found");
  }

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
  if (data.weightKg !== undefined) updateData.weightKg = new Prisma.Decimal(data.weightKg);
  if (data.concentration !== undefined) updateData.concentration = data.concentration;
  if (data.condition !== undefined) updateData.condition = data.condition;
  if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
  if (data.isTester !== undefined) updateData.isTester = data.isTester;
  if (data.sellerWarehouseId !== undefined) {
    const warehouse = await prisma.sellerWarehouse.findFirst({
      where: { id: data.sellerWarehouseId, userId: sellerId },
      select: { id: true },
    });
    if (!warehouse) {
      throw AppError.badRequest("Selected warehouse is not available for this seller");
    }
    updateData.sellerWarehouse = { connect: { id: data.sellerWarehouseId } };
  }
  if (data.status !== undefined) {
    const isAdmin =
      options?.roles?.some(
        (role) => role === RoleName.ADMIN || role === RoleName.SUPER_ADMIN
      ) ?? false;
    if (typeof data.status === "string") {
      const normalized = data.status.toLowerCase();
      if (normalized === "pending") {
        updateData.status = ProductStatus.PENDING_REVIEW;
      } else if (normalized === "published") {
        updateData.status =
          isAdmin || product.status === ProductStatus.PUBLISHED
            ? ProductStatus.PUBLISHED
            : ProductStatus.PENDING_REVIEW;
      } else {
        updateData.status = normalized.toUpperCase() as ProductStatus;
      }
    } else {
      updateData.status =
        !isAdmin &&
        data.status === ProductStatus.PUBLISHED &&
        product.status !== ProductStatus.PUBLISHED
          ? ProductStatus.PENDING_REVIEW
          : data.status;
    }
  }

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
      auctions: true,
      sellerWarehouse: true,
      seller: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  if (updateData.status === ProductStatus.PENDING_REVIEW) {
    await notifyAdmins({
      type: NotificationType.PRODUCT_SUBMITTED,
      title: "منتج بانتظار المراجعة",
      message: `${updated.seller?.fullName ?? "بائع"} أرسل المنتج ${updated.nameEn ?? updated.nameAr} للمراجعة.`,
      data: { productId: updated.id, sellerId: updated.sellerId, status: updateData.status },
      fallbackToSupport: true,
    });
  }

  return normalizeProduct(updated);
};

export const deleteProduct = async (productId: number, sellerId: number) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      sellerId: true,
      auctions: { select: { id: true, status: true } },
    },
  });

  if (!product || product.sellerId !== sellerId) {
    throw AppError.notFound("Product not found");
  }

  if (product.auctions.length > 0) {
    const hasActive = product.auctions.some(
      (auction) =>
        auction.status === AuctionStatus.ACTIVE || auction.status === AuctionStatus.SCHEDULED
    );
    const message = hasActive
      ? "Cannot delete a product with an active or scheduled auction"
      : "Cannot delete a product that has participated in auctions";
    throw AppError.badRequest(message);
  }

  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw AppError.badRequest("Cannot delete a product that is part of existing orders");
    }
    throw error;
  }
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
