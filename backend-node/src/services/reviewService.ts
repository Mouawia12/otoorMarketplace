import { OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";

const createReviewSchema = z.object({
  userId: z.number().int().positive(),
  productId: z.number().int().positive(),
  orderId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const createProductReview = async (input: z.infer<typeof createReviewSchema>) => {
  const data = createReviewSchema.parse(input);

  const order = await prisma.order.findFirst({
    where: { id: data.orderId, buyerId: data.userId },
    include: { items: true },
  });

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw AppError.badRequest("Order must be delivered before leaving a review");
  }

  const hasProduct = order.items.some((item) => item.productId === data.productId);
  if (!hasProduct) {
    throw AppError.badRequest("This product is not part of the selected order");
  }

  const existing = await prisma.productReview.findFirst({
    where: {
      userId: data.userId,
      productId: data.productId,
      orderId: data.orderId,
    },
  });

  if (existing) {
    throw AppError.badRequest("You already reviewed this product for this order");
  }

  const review = await prisma.productReview.create({
    data: {
      userId: data.userId,
      productId: data.productId,
      orderId: data.orderId,
      rating: data.rating,
      comment: data.comment,
    },
    include: {
      user: { select: { id: true, fullName: true } },
    },
  });

  return mapReview(review);
};

export const listProductReviews = async (productId: number) => {
  if (!Number.isFinite(productId)) {
    throw AppError.badRequest("Invalid product id");
  }

  const [stats, reviews] = await prisma.$transaction([
    prisma.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return {
    average: Number(stats._avg.rating ?? 0),
    count: stats._count.rating ?? 0,
    reviews: reviews.map(mapReview),
  };
};

export const getProductRatingSummary = async (productId: number) => {
  const stats = await prisma.productReview.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    rating_avg: Number(stats._avg.rating ?? 0),
    rating_count: stats._count.rating ?? 0,
  };
};

const mapReview = (
  review: Prisma.ProductReviewGetPayload<{
    include: { user: { select: { id: true; fullName: true } } };
  }>
) => {
  const plain = toPlainObject(review);
  return {
    id: plain.id,
    rating: plain.rating,
    comment: plain.comment ?? "",
    created_at: plain.createdAt,
    user: plain.user
      ? {
          id: plain.user.id,
          full_name: plain.user.fullName,
        }
      : undefined,
  };
};
