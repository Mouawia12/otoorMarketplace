"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateProduct = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductFiltersMeta = exports.getRelatedProducts = exports.getProductById = exports.listProductSuggestions = exports.listProducts = exports.normalizeProduct = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const serializer_1 = require("../utils/serializer");
const slugify_1 = require("../utils/slugify");
const assets_1 = require("../utils/assets");
const notificationService_1 = require("./notificationService");
const search_1 = require("../utils/search");
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
    const auctions = Array.isArray(plain.auctions) ? plain.auctions : [];
    const rawImages = Array.isArray(plain.images)
        ? plain.images.map((image) => image.url)
        : plain.image_urls ?? [];
    const images = (Array.isArray(rawImages) ? rawImages : [])
        .map((url) => (typeof url === "string" ? url : null))
        .filter((url) => Boolean(url))
        .map((url) => (0, assets_1.toPublicAssetUrl)(url));
    const hasActiveAuction = auctions.some((auction) => {
        const status = typeof auction?.status === "string" ? auction.status.toUpperCase() : "";
        return status === client_1.AuctionStatus.ACTIVE || status === client_1.AuctionStatus.SCHEDULED;
    });
    const weightKg = typeof plain.weightKg === "number"
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
    const now = new Date();
    filters.auctions = {
        none: {
            status: { in: [client_1.AuctionStatus.ACTIVE, client_1.AuctionStatus.SCHEDULED] },
            endTime: { gt: now },
        },
    };
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
        const variants = (0, search_1.buildSearchVariants)(search);
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
const suggestionSchema = zod_1.z.object({
    q: zod_1.z.string().min(2),
    limit: zod_1.z.coerce.number().min(1).max(10).default(6),
});
const listProductSuggestions = async (query) => {
    const { q, limit } = suggestionSchema.parse(query ?? {});
    const variants = (0, search_1.buildSearchVariants)(q);
    if (variants.length === 0) {
        return [];
    }
    const now = new Date();
    const filters = {
        status: client_1.ProductStatus.PUBLISHED,
        auctions: {
            none: {
                status: { in: [client_1.AuctionStatus.ACTIVE, client_1.AuctionStatus.SCHEDULED] },
                endTime: { gt: now },
            },
        },
        OR: variants.flatMap((term) => ([
            { nameEn: { contains: term } },
            { nameAr: { contains: term } },
            { brand: { contains: term } },
        ])),
    };
    const items = await client_2.prisma.product.findMany({
        where: filters,
        include: {
            images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
    return items.map((product) => {
        const normalized = (0, exports.normalizeProduct)(product);
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
exports.listProductSuggestions = listProductSuggestions;
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
    sellerWarehouseId: zod_1.z.coerce.number().int().positive().optional(),
    nameAr: zod_1.z.string().min(2),
    nameEn: zod_1.z.string().min(2),
    descriptionAr: zod_1.z.string().min(4),
    descriptionEn: zod_1.z.string().min(4),
    productType: zod_1.z.string().min(1),
    brand: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    basePrice: zod_1.z.coerce.number().positive(),
    sizeMl: zod_1.z.coerce.number().int().positive(),
    weightKg: zod_1.z.coerce.number().positive().optional(),
    concentration: zod_1.z.string().min(1),
    condition: zod_1.z.nativeEnum(client_1.ProductCondition),
    stockQuantity: zod_1.z.coerce.number().int().nonnegative(),
    isTester: zod_1.z.boolean().optional(),
    status: zod_1.z.nativeEnum(client_1.ProductStatus).default(client_1.ProductStatus.PUBLISHED),
    imageUrls: zod_1.z.array(imageUrlSchema).default([]),
});
const createProduct = async (input, options) => {
    const data = productInputSchema.parse(input);
    const isAdmin = options?.roles?.some((role) => role === client_1.RoleName.ADMIN || role === client_1.RoleName.SUPER_ADMIN) ?? false;
    const requestedStatus = data.status ?? client_1.ProductStatus.PUBLISHED;
    const initialStatus = !isAdmin && requestedStatus === client_1.ProductStatus.PUBLISHED
        ? client_1.ProductStatus.PENDING_REVIEW
        : requestedStatus;
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
    let sellerWarehouseId = data.sellerWarehouseId ?? null;
    if (!isAdmin && !sellerWarehouseId) {
        const hasWarehouse = await client_2.prisma.sellerWarehouse.findFirst({
            where: { userId: data.sellerId },
            select: { id: true },
        });
        if (!hasWarehouse) {
            throw errors_1.AppError.badRequest("يجب إضافة عنوان/مستودع قبل إضافة منتج");
        }
        throw errors_1.AppError.badRequest("يجب اختيار مستودع للمنتج");
    }
    if (sellerWarehouseId) {
        const warehouse = await client_2.prisma.sellerWarehouse.findFirst({
            where: { id: sellerWarehouseId, userId: data.sellerId },
            select: { id: true },
        });
        if (!warehouse) {
            throw errors_1.AppError.badRequest("Selected warehouse is not available for this seller");
        }
    }
    const product = await client_2.prisma.product.create({
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
            basePrice: new client_1.Prisma.Decimal(data.basePrice),
            sizeMl: data.sizeMl,
            weightKg: data.weightKg ? new client_1.Prisma.Decimal(data.weightKg) : null,
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
    if (initialStatus === client_1.ProductStatus.PUBLISHED) {
        await (0, notificationService_1.createNotificationForUser)({
            userId: product.sellerId,
            type: client_1.NotificationType.PRODUCT_APPROVED,
            title: "تم نشر منتجك",
            message: `${product.nameEn ?? product.nameAr} متاح الآن في المتجر ويمكنك مراقبته من لوحة البائع.`,
            data: { productId: product.id, status: initialStatus },
        });
        await (0, notificationService_1.notifyAdmins)({
            type: client_1.NotificationType.PRODUCT_SUBMITTED,
            title: "منتج جديد تم نشره تلقائياً",
            message: `${product.seller?.fullName ?? "بائع"} أضاف المنتج ${product.nameEn ?? product.nameAr} وتم نشره مباشرة.`,
            data: { productId: product.id, sellerId: product.sellerId, status: initialStatus },
            fallbackToSupport: true,
        });
    }
    else if (initialStatus === client_1.ProductStatus.PENDING_REVIEW) {
        await (0, notificationService_1.createNotificationForUser)({
            userId: product.sellerId,
            type: client_1.NotificationType.SYSTEM,
            title: "تم إرسال المنتج للمراجعة",
            message: `${product.nameEn ?? product.nameAr} بانتظار موافقة الإدارة.`,
            data: { productId: product.id, status: initialStatus },
        });
        await (0, notificationService_1.notifyAdmins)({
            type: client_1.NotificationType.PRODUCT_SUBMITTED,
            title: "منتج بانتظار المراجعة",
            message: `${product.seller?.fullName ?? "بائع"} أرسل المنتج ${product.nameEn ?? product.nameAr} للمراجعة.`,
            data: { productId: product.id, sellerId: product.sellerId, status: initialStatus },
            fallbackToSupport: true,
        });
    }
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
    weightKg: zod_1.z.coerce.number().positive().optional(),
    concentration: zod_1.z.string().min(1).optional(),
    condition: zod_1.z.nativeEnum(client_1.ProductCondition).optional(),
    stockQuantity: zod_1.z.coerce.number().int().nonnegative().optional(),
    isTester: zod_1.z.boolean().optional(),
    sellerWarehouseId: zod_1.z.coerce.number().int().positive().optional(),
    status: zod_1.z
        .union([
        zod_1.z.nativeEnum(client_1.ProductStatus),
        zod_1.z.enum(["pending", "published", "draft", "rejected", "archived"]),
    ])
        .optional(),
    imageUrls: zod_1.z.array(imageUrlSchema).optional(),
});
const updateProduct = async (productId, sellerId, payload, options) => {
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
    if (data.weightKg !== undefined)
        updateData.weightKg = new client_1.Prisma.Decimal(data.weightKg);
    if (data.concentration !== undefined)
        updateData.concentration = data.concentration;
    if (data.condition !== undefined)
        updateData.condition = data.condition;
    if (data.stockQuantity !== undefined)
        updateData.stockQuantity = data.stockQuantity;
    if (data.isTester !== undefined)
        updateData.isTester = data.isTester;
    if (data.sellerWarehouseId !== undefined) {
        const warehouse = await client_2.prisma.sellerWarehouse.findFirst({
            where: { id: data.sellerWarehouseId, userId: sellerId },
            select: { id: true },
        });
        if (!warehouse) {
            throw errors_1.AppError.badRequest("Selected warehouse is not available for this seller");
        }
        updateData.sellerWarehouse = { connect: { id: data.sellerWarehouseId } };
    }
    if (data.status !== undefined) {
        const isAdmin = options?.roles?.some((role) => role === client_1.RoleName.ADMIN || role === client_1.RoleName.SUPER_ADMIN) ?? false;
        if (typeof data.status === "string") {
            const normalized = data.status.toLowerCase();
            if (normalized === "pending") {
                updateData.status = client_1.ProductStatus.PENDING_REVIEW;
            }
            else if (normalized === "published") {
                updateData.status =
                    isAdmin || product.status === client_1.ProductStatus.PUBLISHED
                        ? client_1.ProductStatus.PUBLISHED
                        : client_1.ProductStatus.PENDING_REVIEW;
            }
            else {
                updateData.status = normalized.toUpperCase();
            }
        }
        else {
            updateData.status =
                !isAdmin &&
                    data.status === client_1.ProductStatus.PUBLISHED &&
                    product.status !== client_1.ProductStatus.PUBLISHED
                    ? client_1.ProductStatus.PENDING_REVIEW
                    : data.status;
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
    if (updateData.status === client_1.ProductStatus.PENDING_REVIEW) {
        await (0, notificationService_1.notifyAdmins)({
            type: client_1.NotificationType.PRODUCT_SUBMITTED,
            title: "منتج بانتظار المراجعة",
            message: `${updated.seller?.fullName ?? "بائع"} أرسل المنتج ${updated.nameEn ?? updated.nameAr} للمراجعة.`,
            data: { productId: updated.id, sellerId: updated.sellerId, status: updateData.status },
            fallbackToSupport: true,
        });
    }
    return (0, exports.normalizeProduct)(updated);
};
exports.updateProduct = updateProduct;
const deleteProduct = async (productId, sellerId) => {
    const product = await client_2.prisma.product.findUnique({
        where: { id: productId },
        select: {
            id: true,
            sellerId: true,
            auctions: { select: { id: true, status: true } },
        },
    });
    if (!product || product.sellerId !== sellerId) {
        throw errors_1.AppError.notFound("Product not found");
    }
    if (product.auctions.length > 0) {
        const hasActive = product.auctions.some((auction) => auction.status === client_1.AuctionStatus.ACTIVE || auction.status === client_1.AuctionStatus.SCHEDULED);
        const message = hasActive
            ? "Cannot delete a product with an active or scheduled auction"
            : "Cannot delete a product that has participated in auctions";
        throw errors_1.AppError.badRequest(message);
    }
    try {
        await client_2.prisma.product.delete({ where: { id: productId } });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            throw errors_1.AppError.badRequest("Cannot delete a product that is part of existing orders");
        }
        throw error;
    }
};
exports.deleteProduct = deleteProduct;
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