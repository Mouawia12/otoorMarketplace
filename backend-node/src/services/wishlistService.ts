import { z } from "zod";

import { prisma } from "../prisma/client";
import { toPlainObject } from "../utils/serializer";

const wishlistInputSchema = z.object({
  userId: z.number().int().positive(),
  productId: z.number().int().positive(),
});

export const addToWishlist = async (input: z.infer<typeof wishlistInputSchema>) => {
  const data = wishlistInputSchema.parse(input);

  const item = await prisma.wishlistItem.upsert({
    where: {
      userId_productId: {
        userId: data.userId,
        productId: data.productId,
      },
    },
    create: {
      userId: data.userId,
      productId: data.productId,
    },
    update: {},
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  return toPlainObject({
    ...item,
    product: {
      ...item.product,
      image_urls: item.product.images.map((image) => image.url),
    },
  });
};

export const removeFromWishlist = async (input: z.infer<typeof wishlistInputSchema>) => {
  const data = wishlistInputSchema.parse(input);

  await prisma.wishlistItem.delete({
    where: {
      userId_productId: {
        userId: data.userId,
        productId: data.productId,
      },
    },
  });
};

export const listWishlist = async (userId: number) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  return items.map((item) =>
    toPlainObject({
      ...item,
      product: {
        ...item.product,
        image_urls: item.product.images.map((image) => image.url),
      },
    })
  );
};
