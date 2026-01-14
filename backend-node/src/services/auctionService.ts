import { AuctionStatus, Prisma, ProductStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";
import { normalizeProduct } from "./productService";
import { createNotificationForUser } from "./notificationService";

const normalizeSeller = (seller?: { id: number; fullName: string; verifiedSeller: boolean }) =>
  seller
    ? {
        id: seller.id,
        full_name: seller.fullName,
        verified_seller: seller.verifiedSeller,
      }
    : undefined;

const resolveAuctionStatus = (status: AuctionStatus, startTime: Date, endTime: Date, now = new Date()) => {
  if (
    status === AuctionStatus.PENDING_REVIEW ||
    status === AuctionStatus.CANCELLED ||
    status === AuctionStatus.COMPLETED
  ) {
    return status;
  }

  if (endTime <= now) {
    return AuctionStatus.COMPLETED;
  }

  if (startTime > now) {
    return AuctionStatus.SCHEDULED;
  }

  return AuctionStatus.ACTIVE;
};

const normalizeAuction = (auction: any) => {
  const plain = toPlainObject(auction);
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
    product: plain.product ? normalizeProduct(plain.product) : undefined,
    seller: normalizeSeller(plain.seller),
    winner: plain.winner,
  };
};

const normalizeBid = (bid: any) => {
  const plain = toPlainObject(bid);
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

const resolveWinningBid = (bids: Array<{ amount: number; createdAt: Date }>) => {
  if (!bids.length) return null;
  return bids.reduce((top, current) => {
    if (current.amount > top.amount) return current;
    if (current.amount === top.amount && current.createdAt < top.createdAt) {
      return current;
    }
    return top;
  });
};

const hasWonAuction = (currentPrice: number, userMaxBid: number) =>
  Math.abs(currentPrice - userMaxBid) < 0.0001;

const listAuctionsSchema = z.object({
  status: z.nativeEnum(AuctionStatus).optional(),
  seller_id: z.coerce.number().optional(),
  product_id: z.coerce.number().optional(),
  include_pending: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
      }
      return Boolean(value);
    }),
});

export const listAuctions = async (query: unknown) => {
  const { status, seller_id, product_id, include_pending } = listAuctionsSchema.parse(query);
  const includePending = Boolean(include_pending);

  const filters: Prisma.AuctionWhereInput = {};

  if (status === AuctionStatus.PENDING_REVIEW && !includePending) {
    return [];
  }

  if (status) {
    filters.status = status;
  } else if (!includePending) {
    filters.status = { not: AuctionStatus.PENDING_REVIEW };
  }

  if (seller_id) {
    filters.sellerId = seller_id;
  }

  if (product_id) {
    filters.productId = product_id;
  }

  const auctions = await prisma.auction.findMany({
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

  const now = new Date();
  const statusUpdates = auctions.reduce<Array<{ id: number; status: AuctionStatus }>>((acc, auction) => {
    const nextStatus = resolveAuctionStatus(auction.status, auction.startTime, auction.endTime, now);
    if (nextStatus !== auction.status) {
      acc.push({ id: auction.id, status: nextStatus });
    }
    return acc;
  }, []);

  const statusById = new Map(statusUpdates.map((update) => [update.id, update.status]));

  if (statusUpdates.length > 0) {
    await prisma.$transaction(
      statusUpdates.map((update) =>
        prisma.auction.update({
          where: { id: update.id },
          data: { status: update.status },
        })
      )
    );
  }

  return auctions.map((auction) =>
    normalizeAuction({
      ...auction,
      status: statusById.get(auction.id) ?? auction.status,
      total_bids: auction._count.bids,
    })
  );
};

export const listUserBids = async (bidderId: number) => {
  const bids = await prisma.bid.findMany({
    where: { bidderId },
    include: {
      auction: {
        include: {
          product: {
            select: {
              nameEn: true,
              nameAr: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const grouped = new Map<
    number,
    {
      auctionId: number;
      auctionName: string;
      auctionNameAr: string;
      yourMaxBid: number;
      currentPrice: number;
      endTime: Date;
      status: "winning" | "outbid" | "ended_won" | "ended_lost";
    }
  >();

  for (const bid of bids) {
    const auction = bid.auction;
    if (!auction) continue;

    const currentPrice = Number(auction.currentPrice ?? auction.startingPrice ?? 0);
    const entry = grouped.get(auction.id);
    const nextMax = Math.max(entry?.yourMaxBid ?? 0, Number(bid.amount ?? 0));
    const nameEn = auction.product?.nameEn ?? `Auction #${auction.id}`;
    const nameAr = auction.product?.nameAr ?? `مزاد #${auction.id}`;

    const isEnded =
      auction.status === AuctionStatus.COMPLETED ||
      auction.status === AuctionStatus.CANCELLED ||
      auction.endTime <= now;
    const isWinning = hasWonAuction(currentPrice, nextMax);
    const status = isEnded ? (isWinning ? "ended_won" : "ended_lost") : isWinning ? "winning" : "outbid";

    grouped.set(auction.id, {
      auctionId: auction.id,
      auctionName: nameEn,
      auctionNameAr: nameAr,
      yourMaxBid: nextMax,
      currentPrice,
      endTime: auction.endTime,
      status,
    });
  }

  return Array.from(grouped.values()).sort(
    (a, b) => b.endTime.getTime() - a.endTime.getTime()
  );
};

export const getAuctionById = async (id: number) => {
  const auction = await prisma.auction.findUnique({
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

  if (!auction || auction.status === AuctionStatus.PENDING_REVIEW) {
    throw AppError.notFound("Auction not found");
  }

  const nextStatus = resolveAuctionStatus(auction.status, auction.startTime, auction.endTime);
  if (nextStatus !== auction.status) {
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: nextStatus },
    });
  }

  const isEnded = nextStatus === AuctionStatus.COMPLETED;
  const winningBid = isEnded
    ? resolveWinningBid(
        auction.bids.map((bid) => ({
          amount: Number(bid.amount),
          createdAt: bid.createdAt,
        }))
      )
    : null;
  const winningRecord = winningBid
    ? auction.bids.find(
        (bid) =>
          Number(bid.amount) === winningBid.amount &&
          bid.createdAt.getTime() === winningBid.createdAt.getTime()
      )
    : null;

  const normalized = normalizeAuction({
    ...auction,
    status: nextStatus,
    total_bids: auction.bids.length,
    winner: winningRecord
      ? {
          bid_id: winningRecord.id,
          bidder_id: winningRecord.bidderId,
          amount: Number(winningRecord.amount),
          bidder: winningRecord.bidder
            ? {
                id: winningRecord.bidder.id,
                full_name: winningRecord.bidder.fullName,
                email: winningRecord.bidder.email,
              }
            : undefined,
        }
      : null,
  });

  return {
    ...normalized,
    bids: auction.bids.map((bid) => normalizeBid(bid)),
  };
};

export const getAuctionByProductId = async (productId: number) => {
  const auction = await prisma.auction.findFirst({
    where: { productId, status: { not: AuctionStatus.PENDING_REVIEW } },
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

  const nextStatus = resolveAuctionStatus(auction.status, auction.startTime, auction.endTime);
  if (nextStatus !== auction.status) {
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: nextStatus },
    });
  }

  let winner: {
    bid_id: number;
    bidder_id: number;
    amount: number;
    bidder?: { id: number; full_name: string; email: string };
  } | null = null;

  if (nextStatus === AuctionStatus.COMPLETED) {
    const topBid = await prisma.bid.findFirst({
      where: { auctionId: auction.id },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
      include: {
        bidder: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    if (topBid) {
      const winnerPayload: {
        bid_id: number;
        bidder_id: number;
        amount: number;
        bidder?: { id: number; full_name: string; email: string };
      } = {
        bid_id: topBid.id,
        bidder_id: topBid.bidderId,
        amount: Number(topBid.amount),
      };
      if (topBid.bidder) {
        winnerPayload.bidder = {
          id: topBid.bidder.id,
          full_name: topBid.bidder.fullName,
          email: topBid.bidder.email,
        };
      }
      winner = winnerPayload;
    }
  }

  return normalizeAuction({
    ...auction,
    status: nextStatus,
    total_bids: auction._count.bids,
    winner,
  });
};

export const closeExpiredAuctions = async () => {
  const now = new Date();
  const expired = await prisma.auction.findMany({
    where: {
      status: { in: [AuctionStatus.ACTIVE, AuctionStatus.SCHEDULED] },
      endTime: { lte: now },
    },
    select: {
      id: true,
      sellerId: true,
      productId: true,
      currentPrice: true,
    },
  });

  if (expired.length === 0) {
    return;
  }

  for (const auction of expired) {
    const topBid = await prisma.bid.findFirst({
      where: { auctionId: auction.id },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
      include: {
        bidder: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await prisma.auction.update({
      where: { id: auction.id },
      data: {
        status: AuctionStatus.COMPLETED,
        ...(topBid ? { currentPrice: new Prisma.Decimal(topBid.amount) } : {}),
      },
    });

    if (topBid) {
      await createNotificationForUser({
        userId: topBid.bidderId,
        title: "تهانينا! فزت بالمزاد",
        message: `تم إغلاق المزاد #${auction.id} وأنت صاحب أعلى مزايدة.`,
        data: { auctionId: auction.id, productId: auction.productId },
      });
    }

    await createNotificationForUser({
      userId: auction.sellerId,
      title: "انتهى المزاد",
      message: topBid
        ? `انتهى المزاد #${auction.id} وتم تحديد الفائز.`
        : `انتهى المزاد #${auction.id} بدون أي مزايدات.`,
      data: { auctionId: auction.id, productId: auction.productId },
    });
  }
};

let auctionFinalizerTimer: NodeJS.Timeout | null = null;

export const startAuctionFinalizer = () => {
  if (auctionFinalizerTimer) return;
  auctionFinalizerTimer = setInterval(() => {
    closeExpiredAuctions().catch((error) => {
      console.error("Failed to finalize auctions", error);
    });
  }, 60_000);
  closeExpiredAuctions().catch((error) => {
    console.error("Failed to finalize auctions", error);
  });
};

export const stopAuctionFinalizer = () => {
  if (auctionFinalizerTimer) {
    clearInterval(auctionFinalizerTimer);
    auctionFinalizerTimer = null;
  }
};

const placeBidSchema = z.object({
  auctionId: z.number().int().positive(),
  bidderId: z.number().int().positive(),
  amount: z.number().positive(),
});

export const placeBid = async (input: z.infer<typeof placeBidSchema>) => {
  const data = placeBidSchema.parse(input);
  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
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
        throw AppError.notFound("Auction not found");
      }

      if (auction.status !== AuctionStatus.ACTIVE) {
        throw AppError.badRequest("Auction is not active");
      }

      if (auction.endTime <= now) {
        throw AppError.badRequest("Auction has ended");
      }

      const minAccepted = auction.currentPrice.plus(auction.minimumIncrement);
      if (data.amount < minAccepted.toNumber()) {
        throw AppError.badRequest(
          `Bid must be at least ${minAccepted.toNumber().toFixed(2)}`
        );
      }

      const bidRecord = await tx.bid.create({
        data: {
          auctionId: data.auctionId,
          bidderId: data.bidderId,
          amount: new Prisma.Decimal(data.amount),
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
            currentPrice: new Prisma.Decimal(data.amount),
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
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  return result;
};

export const getAuctionBids = async (auctionId: number) => {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { status: true },
  });

  if (!auction || auction.status === AuctionStatus.PENDING_REVIEW) {
    throw AppError.notFound("Auction not found");
  }

  const bids = await prisma.bid.findMany({
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

const createAuctionSchema = z.object({
  sellerId: z.number().int().positive(),
  productId: z.number().int().positive(),
  startingPrice: z.number().positive(),
  minimumIncrement: z.number().positive(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

const assertValidAuctionWindow = (start: Date, end: Date) => {
  const now = new Date();
  if (end <= start) {
    throw AppError.badRequest("Auction end time must be after the start time");
  }
  if (end <= now) {
    throw AppError.badRequest("Auction end time must be in the future");
  }
};

export const createAuction = async (input: z.infer<typeof createAuctionSchema>) => {
  const data = createAuctionSchema.parse(input);
  const durationMs = data.endTime.getTime() - data.startTime.getTime();
  const durationHours = durationMs / (60 * 60 * 1000);
  if (durationHours < 2 || durationHours > 24) {
    throw AppError.badRequest("Auction duration must be between 2 and 24 hours");
  }

  assertValidAuctionWindow(data.startTime, data.endTime);

  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    select: {
      id: true,
      sellerId: true,
      status: true,
    },
  });

  if (!product || product.sellerId !== data.sellerId) {
    throw AppError.notFound("Product not found for seller");
  }

  if (product.status !== ProductStatus.PUBLISHED) {
    throw AppError.badRequest("Product must be published before starting an auction");
  }

  const existing = await prisma.auction.findUnique({
    where: { productId: data.productId },
  });

  if (
    existing &&
    existing.status !== AuctionStatus.COMPLETED &&
    existing.status !== AuctionStatus.CANCELLED
  ) {
    throw AppError.badRequest("Auction already exists for this product");
  }

  const auction = await prisma.auction.create({
    data: {
      productId: data.productId,
      sellerId: data.sellerId,
      startingPrice: new Prisma.Decimal(data.startingPrice),
      currentPrice: new Prisma.Decimal(data.startingPrice),
      minimumIncrement: new Prisma.Decimal(data.minimumIncrement),
      startTime: data.startTime,
      endTime: data.endTime,
      status: AuctionStatus.PENDING_REVIEW,
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

const updateAuctionSchema = z.object({
  endTime: z.coerce.date().optional(),
  status: z
    .enum(["scheduled", "active", "completed", "cancelled", "pending_review", "pending"])
    .optional(),
});

export const updateAuction = async (auctionId: number, payload: unknown) => {
  const data = updateAuctionSchema.parse(payload ?? {});

  const updateData: Prisma.AuctionUpdateInput = {};

  const existing = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  if (!existing) {
    throw AppError.notFound("Auction not found");
  }

  if (data.endTime) {
    if (data.endTime <= existing.startTime) {
      throw AppError.badRequest("Auction end time must be after the start time");
    }
    if (data.endTime <= new Date()) {
      throw AppError.badRequest("Auction end time must be in the future");
    }
    updateData.endTime = data.endTime;
  }

  if (data.status) {
    const normalizedInput = data.status.toLowerCase();
    const normalized =
      normalizedInput === "pending" || normalizedInput === "pending_review"
        ? AuctionStatus.PENDING_REVIEW
        : (data.status.toUpperCase() as AuctionStatus);

    if (!Object.values(AuctionStatus).includes(normalized)) {
      throw AppError.badRequest("Unsupported auction status");
    }

    const nextEndTime =
      (updateData.endTime as Date | undefined) ?? existing.endTime;

    if (normalized === AuctionStatus.ACTIVE) {
      if (nextEndTime <= new Date()) {
        throw AppError.badRequest("Cannot activate an auction that has already ended");
      }
    }

    if (normalized === AuctionStatus.SCHEDULED && existing.startTime <= new Date()) {
      throw AppError.badRequest("Scheduled auctions must have a future start time");
    }

    updateData.status = normalized;
  }

  if (Object.keys(updateData).length === 0) {
    throw AppError.badRequest("No auction updates provided");
  }

  const auction = await prisma.auction.update({
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
