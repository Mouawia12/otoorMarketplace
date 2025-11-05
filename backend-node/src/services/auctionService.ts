import { AuctionStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";
import { normalizeProduct } from "./productService";

const normalizeSeller = (seller?: { id: number; fullName: string; verifiedSeller: boolean }) =>
  seller
    ? {
        id: seller.id,
        full_name: seller.fullName,
        verified_seller: seller.verifiedSeller,
      }
    : undefined;

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

const listAuctionsSchema = z.object({
  status: z.nativeEnum(AuctionStatus).optional(),
  seller_id: z.coerce.number().optional(),
  product_id: z.coerce.number().optional(),
});

export const listAuctions = async (query: unknown) => {
  const { status, seller_id, product_id } = listAuctionsSchema.parse(query);

  const filters: Prisma.AuctionWhereInput = {};

  if (status) {
    filters.status = status;
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

  return auctions.map((auction) =>
    normalizeAuction({
      ...auction,
      total_bids: auction._count.bids,
    })
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

  if (!auction) {
    throw AppError.notFound("Auction not found");
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

export const getAuctionByProductId = async (productId: number) => {
  const auction = await prisma.auction.findUnique({
    where: { productId },
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

const placeBidSchema = z.object({
  auctionId: z.number().int().positive(),
  bidderId: z.number().int().positive(),
  amount: z.number().positive(),
});

export const placeBid = async (input: z.infer<typeof placeBidSchema>) => {
  const data = placeBidSchema.parse(input);

  const auction = await prisma.auction.findUnique({
    where: { id: data.auctionId },
  });

  if (!auction) {
    throw AppError.notFound("Auction not found");
  }

  if (auction.status !== AuctionStatus.ACTIVE) {
    throw AppError.badRequest("Auction is not active");
  }

  const minAccepted = auction.currentPrice.plus(auction.minimumIncrement);
  if (data.amount < minAccepted.toNumber()) {
    throw AppError.badRequest(
      `Bid must be at least ${minAccepted.toNumber().toFixed(2)}`
    );
  }

  const bid = await prisma.bid.create({
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

  await prisma.auction.update({
    where: { id: data.auctionId },
    data: {
      currentPrice: new Prisma.Decimal(data.amount),
      updatedAt: new Date(),
    },
  });

  return normalizeBid(bid);
};

export const getAuctionBids = async (auctionId: number) => {
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
