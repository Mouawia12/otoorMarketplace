"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateProduct = exports.updateProduct = exports.createProduct = exports.getProductFiltersMeta = exports.getRelatedProducts = exports.getProductById = exports.listProducts = exports.normalizeProduct = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const serializer_1 = require("../utils/serializer");
const slugify_1 = require("../utils/slugify");
const assets_1 = require("../utils/assets");
const notificationService_1 = require("./notificationService");
const normalizeStatus = (status) => {
    if (!status)
        return status ?? "";
    const value = status.toLowerCase();
    if (value === "pending_review")
        return "pending";
    if (value === "published")
        return "published";
    if (value === "draft")
        return "draft";
    if (value === "rejected")
        return "rejected";
    if (value === "archived")
        return "archived";
    return value;
};
const normalizeProduct = (product) => {
    const plain = (0, serializer_1.toPlainObject)(product);
    const rawImages = Array.isArray(plain.images)
        ? plain.images.map((image) => image.url)
        : plain.image_urls ?? [];
    const images = (Array.isArray(rawImages) ? rawImages : [])
        .map((url) => (typeof url === "string" ? url : null))
        .filter((url) => Boolean(url))
        .map((url) => (0, assets_1.toPublicAssetUrl)(url));
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
exports.normalizeProduct = normalizeProduct;
const listProductsSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    brand: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    condition: zod_1.z.nativeEnum(client_1.ProductCondition).optional(),
    status: zod_1.z
        .union([
        zod_1.z.nativeEnum(client_1.ProductStatus),
        zod_1.z.enum(["pending", "published", "draft", "rejected", "archived"]),
    ])
        .optional(),
    min_price: zod_1.z.coerce.number().optional(),
    max_price: zod_1.z.coerce.number().optional(),
    sort: zod_1.z
        .enum(["price_asc", "price_desc", "newest", "oldest", "stock"])
        .default("newest")
        .optional(),
    page: zod_1.z.coerce.number().default(1).optional(),
    page_size: zod_1.z.coerce.number().default(12).optional(),
    seller: zod_1.z.union([zod_1.z.literal("me"), zod_1.z.coerce.number()]).optional(),
});
const listProducts = async (query) => {
    const normalizedQuery = query && typeof query === "object"
        ? { ...query }
        : {};
    if (typeof normalizedQuery.condition === "string") {
        const value = normalizedQuery.condition.toUpperCase();
        if (Object.values(client_1.ProductCondition).includes(value)) {
            normalizedQuery.condition = value;
        }
        else {
            delete normalizedQuery.condition;
        }
    }
    const { search, brand, category, condition, status, min_price, max_price, sort, page = 1, page_size = 12, seller, } = listProductsSchema.parse(normalizedQuery);
    const filters = {};
    if (status) {
        if (typeof status === "string") {
            if (status === "pending") {
                filters.status = client_1.ProductStatus.PENDING_REVIEW;
            }
            else {
                filters.status = status.toUpperCase();
            }
        }
        else {
            filters.status = status;
        }
    }
    else {
        filters.status = client_1.ProductStatus.PUBLISHED;
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
            filters.basePrice.gte = new client_1.Prisma.Decimal(min_price);
        }
        if (max_price !== undefined) {
            filters.basePrice.lte = new client_1.Prisma.Decimal(max_price);
        }
    }
    const orderBy = [];
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
    const [total, items] = await client_2.prisma.$transaction([
        client_2.prisma.product.count({ where: filters }),
        client_2.prisma.product.findMany({
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
    const products = items.map((product) => (0, exports.normalizeProduct)(product));
    return {
        products,
        total,
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
    };
};
exports.listProducts = listProducts;
const getProductById = async (id) => {
    const [product, ratingStats] = await client_2.prisma.$transaction([
        client_2.prisma.product.findUnique({
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
        client_2.prisma.productReview.aggregate({
            where: { productId: id },
            _avg: { rating: true },
            _count: { rating: true },
        }),
    ]);
    if (!product) {
        throw errors_1.AppError.notFound("Product not found");
    }
    return (0, exports.normalizeProduct)({
        ...product,
        rating_avg: ratingStats._avg.rating ?? 0,
        rating_count: ratingStats._count.rating ?? 0,
    });
};
exports.getProductById = getProductById;
const getRelatedProducts = async (productId, limit = 4) => {
    const base = await client_2.prisma.product.findUnique({
        where: { id: productId },
    });
    if (!base) {
        return [];
    }
    const related = await client_2.prisma.product.findMany({
        where: {
            id: { not: productId },
            status: client_1.ProductStatus.PUBLISHED,
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
    return related.map((product) => (0, exports.normalizeProduct)(product));
};
exports.getRelatedProducts = getRelatedProducts;
const getProductFiltersMeta = async () => {
    const [brandRows, categoryRows, priceAgg] = await client_2.prisma.$transaction([
        client_2.prisma.product.findMany({
            where: { status: client_1.ProductStatus.PUBLISHED },
            distinct: ["brand"],
            select: { brand: true },
            orderBy: { brand: "asc" },
        }),
        client_2.prisma.product.findMany({
            where: { status: client_1.ProductStatus.PUBLISHED },
            distinct: ["category"],
            select: { category: true },
            orderBy: { category: "asc" },
        }),
        client_2.prisma.product.aggregate({
            where: { status: client_1.ProductStatus.PUBLISHED },
            _min: { basePrice: true },
            _max: { basePrice: true },
        }),
    ]);
    const brands = brandRows
        .map((row) => row.brand)
        .filter((value) => Boolean(value));
    const categories = categoryRows
        .map((row) => row.category)
        .filter((value) => Boolean(value));
    const min_price = priceAgg._min.basePrice
        ? Number(priceAgg._min.basePrice)
        : undefined;
    const max_price = priceAgg._max.basePrice
        ? Number(priceAgg._max.basePrice)
        : undefined;
    return {
        brands,
        categories,
        conditions: Object.values(client_1.ProductCondition).map((condition) => condition.toLowerCase()),
        ...(min_price !== undefined ? { min_price } : {}),
        ...(max_price !== undefined ? { max_price } : {}),
    };
};
exports.getProductFiltersMeta = getProductFiltersMeta;
const imageUrlSchema = zod_1.z
    .string()
    .min(1)
    .refine((value) => /^https?:\/\//.test(value) || value.startsWith("/"), "Image URL must be an absolute or relative URL");
const productInputSchema = zod_1.z.object({
    sellerId: zod_1.z.coerce.number().int().positive(),
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
    condition: zod_1.z.nativeEnum(client_1.ProductCondition),
    stockQuantity: zod_1.z.coerce.number().int().nonnegative(),
    status: zod_1.z.nativeEnum(client_1.ProductStatus).default(client_1.ProductStatus.PENDING_REVIEW),
    imageUrls: zod_1.z.array(imageUrlSchema).default([]),
});
const createProduct = async (input) => {
    const data = productInputSchema.parse(input);
    const slugBase = (0, slugify_1.makeSlug)(data.nameEn);
    const existingSlug = await client_2.prisma.product.findFirst({
        where: { slug: slugBase },
        select: { id: true },
    });
    const slug = existingSlug && existingSlug.id
        ? `${slugBase}-${Date.now().toString(36)}`
        : slugBase;
    const sanitizedImages = data.imageUrls
        .map((url) => (0, assets_1.normalizeImagePathForStorage)(url))
        .filter((value) => Boolean(value));
    const product = await client_2.prisma.product.create({
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
            basePrice: new client_1.Prisma.Decimal(data.basePrice),
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
    await (0, notificationService_1.createNotificationForUser)({
        userId: product.sellerId,
        type: client_1.NotificationType.PRODUCT_SUBMITTED,
        title: "تم استلام منتجك",
        message: `نراجع الآن منتجك ${product.nameEn}. سنعلمك فور اتخاذ القرار.`,
        data: { productId: product.id },
    });
    await (0, notificationService_1.notifyAdmins)({
        type: client_1.NotificationType.PRODUCT_SUBMITTED,
        title: "منتج جديد بانتظار المراجعة",
        message: `${product.seller?.fullName ?? "بائع"} أضاف المنتج ${product.nameEn}.`,
        data: { productId: product.id, sellerId: product.sellerId },
        fallbackToSupport: true,
    });
    return (0, exports.normalizeProduct)(product);
};
exports.createProduct = createProduct;
const updateProductSchema = zod_1.z.object({
    nameAr: zod_1.z.string().min(2).optional(),
    nameEn: zod_1.z.string().min(2).optional(),
    descriptionAr: zod_1.z.string().min(4).optional(),
    descriptionEn: zod_1.z.string().min(4).optional(),
    productType: zod_1.z.string().min(1).optional(),
    brand: zod_1.z.string().min(1).optional(),
    category: zod_1.z.string().min(1).optional(),
    basePrice: zod_1.z.coerce.number().positive().optional(),
    sizeMl: zod_1.z.coerce.number().int().positive().optional(),
    concentration: zod_1.z.string().min(1).optional(),
    condition: zod_1.z.nativeEnum(client_1.ProductCondition).optional(),
    stockQuantity: zod_1.z.coerce.number().int().nonnegative().optional(),
    status: zod_1.z
        .union([
        zod_1.z.nativeEnum(client_1.ProductStatus),
        zod_1.z.enum(["pending", "published", "draft", "rejected", "archived"]),
    ])
        .optional(),
    imageUrls: zod_1.z.array(imageUrlSchema).optional(),
});
const updateProduct = async (productId, sellerId, payload) => {
    const data = updateProductSchema.parse(payload);
    const product = await client_2.prisma.product.findUnique({
        where: { id: productId },
    });
    if (!product || product.sellerId !== sellerId) {
        throw errors_1.AppError.notFound("Product not found");
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
    if (data.basePrice !== undefined)
        updateData.basePrice = new client_1.Prisma.Decimal(data.basePrice);
    if (data.sizeMl !== undefined)
        updateData.sizeMl = data.sizeMl;
    if (data.concentration !== undefined)
        updateData.concentration = data.concentration;
    if (data.condition !== undefined)
        updateData.condition = data.condition;
    if (data.stockQuantity !== undefined)
        updateData.stockQuantity = data.stockQuantity;
    if (data.status !== undefined) {
        if (typeof data.status === "string" && (data.status === "pending" || data.status === "published")) {
            updateData.status = client_1.ProductStatus.PENDING_REVIEW;
        }
        else if (typeof data.status === "string") {
            updateData.status = data.status.toUpperCase();
        }
        else {
            updateData.status = data.status;
        }
    }
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
    const updated = await client_2.prisma.product.update({
        where: { id: productId },
        data: {
            ...updateData,
            ...(imagesUpdate ? { images: imagesUpdate } : {}),
        },
        include: {
            images: { orderBy: { sortOrder: "asc" } },
        },
    });
    return (0, exports.normalizeProduct)(updated);
};
exports.updateProduct = updateProduct;
const moderateProduct = async (productId, action) => {
    const status = action === "approve" ? client_1.ProductStatus.PUBLISHED : client_1.ProductStatus.REJECTED;
    const product = await client_2.prisma.product.update({
        where: { id: productId },
        data: { status },
        include: {
            images: { orderBy: { sortOrder: "asc" } },
        },
    });
    await (0, notificationService_1.createNotificationForUser)({
        userId: product.sellerId,
        type: action === "approve"
            ? client_1.NotificationType.PRODUCT_APPROVED
            : client_1.NotificationType.PRODUCT_REJECTED,
        title: action === "approve" ? "تم نشر المنتج" : "تم رفض المنتج",
        message: action === "approve"
            ? `${product.nameEn ?? "المنتج"} أصبح متاحًا الآن في المتجر.`
            : `نأسف، تم رفض ${product.nameEn ?? "المنتج"}. راجع المتطلبات وحاول مرة أخرى.`,
        data: { productId: product.id, status },
    });
    return (0, exports.normalizeProduct)(product);
};
exports.moderateProduct = moderateProduct;
//# sourceMappingURL=productService.js.map