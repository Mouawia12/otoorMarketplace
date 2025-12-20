"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAuction = exports.createAuction = exports.getAuctionBids = exports.placeBid = exports.getAuctionByProductId = exports.getAuctionById = exports.listAuctions = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const serializer_1 = require("../utils/serializer");
const productService_1 = require("./productService");
const normalizeSeller = (seller) => seller
    ? {
        id: seller.id,
        full_name: seller.fullName,
        verified_seller: seller.verifiedSeller,
    }
    : undefined;
const normalizeAuction = (auction) => {
    const plain = (0, serializer_1.toPlainObject)(auction);
    return {
        id: plain.id,
        product_id: plain.productId,
        seller_id: plain.sellerId,
        starting_price: plain.startingPrice,
        current_price: plain.currentPrice,
        minimum_increment: plain.minimumIncrement,
        start_time: plain.startTime,
        end_time: plain.endTime,
        status: plain.status?.toLowerCase?.() ?? plain.status,
        created_at: plain.createdAt,
        updated_at: plain.updatedAt,
        total_bids: plain.total_bids ?? plain._count?.bids ?? 0,
        product: plain.product ? (0, productService_1.normalizeProduct)(plain.product) : undefined,
        seller: normalizeSeller(plain.seller),
    };
};
const normalizeBid = (bid) => {
    const plain = (0, serializer_1.toPlainObject)(bid);
    return {
        id: plain.id,
        auction_id: plain.auctionId,
        bidder_id: plain.bidderId,
        amount: plain.amount,
        created_at: plain.createdAt,
        bidder: plain.bidder
            ? {
                id: plain.bidder.id,
                full_name: plain.bidder.fullName,
                email: plain.bidder.email,
            }
            : undefined,
    };
};
const listAuctionsSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.AuctionStatus).optional(),
    seller_id: zod_1.z.coerce.number().optional(),
    product_id: zod_1.z.coerce.number().optional(),
    include_pending: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.string()])
        .optional()
        .transform((value) => {
        if (typeof value === "string") {
            return value.toLowerCase() === "true" || value === "1";
        }
        return Boolean(value);
    }),
});
const listAuctions = async (query) => {
    const { status, seller_id, product_id, include_pending } = listAuctionsSchema.parse(query);
    const includePending = Boolean(include_pending);
    const filters = {};
    if (status === client_1.AuctionStatus.PENDING_REVIEW && !includePending) {
        return [];
    }
    if (status) {
        filters.status = status;
    }
    else if (!includePending) {
        filters.status = { not: client_1.AuctionStatus.PENDING_REVIEW };
    }
    if (seller_id) {
        filters.sellerId = seller_id;
    }
    if (product_id) {
        filters.productId = product_id;
    }
    const auctions = await client_2.prisma.auction.findMany({
        where: filters,
        include: {
            product: {
                include: {
                    images: { orderBy: { sortOrder: "asc" } },
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            verifiedSeller: true,
                        },
                    },
                },
            },
            seller: {
                select: {
                    id: true,
                    fullName: true,
                    verifiedSeller: true,
                },
            },
            _count: {
                select: { bids: true },
            },
        },
        orderBy: {
            endTime: "asc",
        },
    });
    return auctions.map((auction) => normalizeAuction({
        ...auction,
        total_bids: auction._count.bids,
    }));
};
exports.listAuctions = listAuctions;
const getAuctionById = async (id) => {
    const auction = await client_2.prisma.auction.findUnique({
        where: { id },
        include: {
            product: {
                include: {
                    images: { orderBy: { sortOrder: "asc" } },
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            verifiedSeller: true,
                        },
                    },
                },
            },
            seller: {
                select: {
                    id: true,
                    fullName: true,
                    verifiedSeller: true,
                },
            },
            bids: {
                orderBy: { createdAt: "desc" },
                include: {
                    bidder: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
    if (!auction || auction.status === client_1.AuctionStatus.PENDING_REVIEW) {
        throw errors_1.AppError.notFound("Auction not found");
    }
    const normalized = normalizeAuction({
        ...auction,
        total_bids: auction.bids.length,
    });
    return {
        ...normalized,
        bids: auction.bids.map((bid) => normalizeBid(bid)),
    };
};
exports.getAuctionById = getAuctionById;
const getAuctionByProductId = async (productId) => {
    const auction = await client_2.prisma.auction.findFirst({
        where: { productId, status: { not: client_1.AuctionStatus.PENDING_REVIEW } },
        include: {
            product: {
                include: {
                    images: { orderBy: { sortOrder: "asc" } },
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            verifiedSeller: true,
                        },
                    },
                },
            },
            seller: {
                select: {
                    id: true,
                    fullName: true,
                    verifiedSeller: true,
                },
            },
            _count: {
                select: { bids: true },
            },
        },
    });
    if (!auction) {
        return null;
    }
    return normalizeAuction({
        ...auction,
        total_bids: auction._count.bids,
    });
};
exports.getAuctionByProductId = getAuctionByProductId;
const placeBidSchema = zod_1.z.object({
    auctionId: zod_1.z.number().int().positive(),
    bidderId: zod_1.z.number().int().positive(),
    amount: zod_1.z.number().positive(),
});
const placeBid = async (input) => {
    const data = placeBidSchema.parse(input);
    const now = new Date();
    const result = await client_2.prisma.$transaction(async (tx) => {
        const auction = await tx.auction.findUnique({
            where: { id: data.auctionId },
            select: {
                id: true,
                status: true,
                endTime: true,
                currentPrice: true,
                minimumIncrement: true,
            },
        });
        if (!auction) {
            throw errors_1.AppError.notFound("Auction not found");
        }
        if (auction.status !== client_1.AuctionStatus.ACTIVE) {
            throw errors_1.AppError.badRequest("Auction is not active");
        }
        if (auction.endTime <= now) {
            throw errors_1.AppError.badRequest("Auction has ended");
        }
        const minAccepted = auction.currentPrice.plus(auction.minimumIncrement);
        if (data.amount < minAccepted.toNumber()) {
            throw errors_1.AppError.badRequest(`Bid must be at least ${minAccepted.toNumber().toFixed(2)}`);
        }
        const bidRecord = await tx.bid.create({
            data: {
                auctionId: data.auctionId,
                bidderId: data.bidderId,
                amount: new client_1.Prisma.Decimal(data.amount),
            },
            include: {
                bidder: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
        });
        const [updatedAuction, totalBids] = await Promise.all([
            tx.auction.update({
                where: { id: data.auctionId },
                data: {
                    currentPrice: new client_1.Prisma.Decimal(data.amount),
                    updatedAt: now,
                },
                select: {
                    id: true,
                    sellerId: true,
                    productId: true,
                    currentPrice: true,
                    minimumIncrement: true,
                    endTime: true,
                    status: true,
                },
            }),
            tx.bid.count({ where: { auctionId: data.auctionId } }),
        ]);
        return {
            bid: normalizeBid(bidRecord),
            auction: {
                id: updatedAuction.id,
                seller_id: updatedAuction.sellerId,
                product_id: updatedAuction.productId,
                current_price: updatedAuction.currentPrice.toNumber(),
                minimum_increment: updatedAuction.minimumIncrement.toNumber(),
                end_time: updatedAuction.endTime,
                status: updatedAuction.status,
                total_bids: totalBids,
            },
        };
    }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    return result;
};
exports.placeBid = placeBid;
const getAuctionBids = async (auctionId) => {
    const auction = await client_2.prisma.auction.findUnique({
        where: { id: auctionId },
        select: { status: true },
    });
    if (!auction || auction.status === client_1.AuctionStatus.PENDING_REVIEW) {
        throw errors_1.AppError.notFound("Auction not found");
    }
    const bids = await client_2.prisma.bid.findMany({
        where: { auctionId },
        orderBy: { createdAt: "desc" },
        include: {
            bidder: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                },
            },
        },
    });
    return bids.map((bid) => normalizeBid(bid));
};
exports.getAuctionBids = getAuctionBids;
const createAuctionSchema = zod_1.z.object({
    sellerId: zod_1.z.number().int().positive(),
    productId: zod_1.z.number().int().positive(),
    startingPrice: zod_1.z.number().positive(),
    minimumIncrement: zod_1.z.number().positive(),
    startTime: zod_1.z.coerce.date(),
    endTime: zod_1.z.coerce.date(),
});
const assertValidAuctionWindow = (start, end) => {
    const now = new Date();
    if (end <= start) {
        throw errors_1.AppError.badRequest("Auction end time must be after the start time");
    }
    if (end <= now) {
        throw errors_1.AppError.badRequest("Auction end time must be in the future");
    }
};
const createAuction = async (input) => {
    const data = createAuctionSchema.parse(input);
    const durationMs = data.endTime.getTime() - data.startTime.getTime();
    const durationHours = durationMs / (60 * 60 * 1000);
    if (durationHours < 2 || durationHours > 24) {
        throw errors_1.AppError.badRequest("Auction duration must be between 2 and 24 hours");
    }
    assertValidAuctionWindow(data.startTime, data.endTime);
    const product = await client_2.prisma.product.findUnique({
        where: { id: data.productId },
        select: {
            id: true,
            sellerId: true,
            status: true,
        },
    });
    if (!product || product.sellerId !== data.sellerId) {
        throw errors_1.AppError.notFound("Product not found for seller");
    }
    if (product.status !== client_1.ProductStatus.PUBLISHED) {
        throw errors_1.AppError.badRequest("Product must be published before starting an auction");
    }
    const existing = await client_2.prisma.auction.findUnique({
        where: { productId: data.productId },
    });
    if (existing &&
        existing.status !== client_1.AuctionStatus.COMPLETED &&
        existing.status !== client_1.AuctionStatus.CANCELLED) {
        throw errors_1.AppError.badRequest("Auction already exists for this product");
    }
    const auction = await client_2.prisma.auction.create({
        data: {
            productId: data.productId,
            sellerId: data.sellerId,
            startingPrice: new client_1.Prisma.Decimal(data.startingPrice),
            currentPrice: new client_1.Prisma.Decimal(data.startingPrice),
            minimumIncrement: new client_1.Prisma.Decimal(data.minimumIncrement),
            startTime: data.startTime,
            endTime: data.endTime,
            status: client_1.AuctionStatus.PENDING_REVIEW,
        },
        include: {
            product: {
                include: {
                    images: { orderBy: { sortOrder: "asc" } },
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            verifiedSeller: true,
                        },
                    },
                },
            },
            seller: {
                select: {
                    id: true,
                    fullName: true,
                    verifiedSeller: true,
                },
            },
            _count: { select: { bids: true } },
        },
    });
    return normalizeAuction({
        ...auction,
        total_bids: auction._count?.bids ?? 0,
    });
};
exports.createAuction = createAuction;
const updateAuctionSchema = zod_1.z.object({
    endTime: zod_1.z.coerce.date().optional(),
    status: zod_1.z
        .enum(["scheduled", "active", "completed", "cancelled", "pending_review", "pending"])
        .optional(),
});
const updateAuction = async (auctionId, payload) => {
    const data = updateAuctionSchema.parse(payload ?? {});
    const updateData = {};
    const existing = await client_2.prisma.auction.findUnique({
        where: { id: auctionId },
        select: {
            startTime: true,
            endTime: true,
            status: true,
        },
    });
    if (!existing) {
        throw errors_1.AppError.notFound("Auction not found");
    }
    if (data.endTime) {
        if (data.endTime <= existing.startTime) {
            throw errors_1.AppError.badRequest("Auction end time must be after the start time");
        }
        if (data.endTime <= new Date()) {
            throw errors_1.AppError.badRequest("Auction end time must be in the future");
        }
        updateData.endTime = data.endTime;
    }
    if (data.status) {
        const normalizedInput = data.status.toLowerCase();
        const normalized = normalizedInput === "pending" || normalizedInput === "pending_review"
            ? client_1.AuctionStatus.PENDING_REVIEW
            : data.status.toUpperCase();
        if (!Object.values(client_1.AuctionStatus).includes(normalized)) {
            throw errors_1.AppError.badRequest("Unsupported auction status");
        }
        const nextEndTime = updateData.endTime ?? existing.endTime;
        if (normalized === client_1.AuctionStatus.ACTIVE) {
            if (nextEndTime <= new Date()) {
                throw errors_1.AppError.badRequest("Cannot activate an auction that has already ended");
            }
        }
        if (normalized === client_1.AuctionStatus.SCHEDULED && existing.startTime <= new Date()) {
            throw errors_1.AppError.badRequest("Scheduled auctions must have a future start time");
        }
        updateData.status = normalized;
    }
    if (Object.keys(updateData).length === 0) {
        throw errors_1.AppError.badRequest("No auction updates provided");
    }
    const auction = await client_2.prisma.auction.update({
        where: { id: auctionId },
        data: updateData,
        include: {
            product: {
                include: {
                    images: { orderBy: { sortOrder: "asc" } },
                    seller: {
                        select: {
                            id: true,
                            fullName: true,
                            verifiedSeller: true,
                        },
                    },
                },
            },
            seller: {
                select: {
                    id: true,
                    fullName: true,
                    verifiedSeller: true,
                },
            },
            _count: { select: { bids: true } },
        },
    });
    return normalizeAuction({
        ...auction,
        total_bids: auction._count?.bids ?? 0,
    });
};
exports.updateAuction = updateAuction;
//# sourceMappingURL=auctionService.js.map