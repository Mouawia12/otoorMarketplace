import { OrderStatus, Prisma, ProductStatus } from "@prisma/client";

import { prisma } from "../prisma/client";
import { normalizeProduct } from "./productService";
import { listOrdersForSeller } from "./orderService";

export const getSellerDashboardStats = async (sellerId: number) => {
  const [activeProducts, activeAuctions, pendingOrdersCount, totals] = await prisma.$transaction([
    prisma.product.count({
      where: { sellerId, status: "PUBLISHED" },
    }),
    prisma.auction.count({
      where: { sellerId, status: "ACTIVE" },
    }),
    prisma.order.count({
      where: {
        status: OrderStatus.PENDING,
        items: { some: { product: { sellerId } } },
      },
    }),
    prisma.orderItem.aggregate({
      where: {
        product: { sellerId },
        order: {
          status: { in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.PROCESSING] },
        },
      },
      _sum: {
        totalPrice: true,
      },
    }),
  ]);

  const monthlyEarnings = await prisma.orderItem.aggregate({
    where: {
      product: { sellerId },
      order: {
        status: OrderStatus.DELIVERED,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
    _sum: {
      totalPrice: true,
    },
  });

  return {
    totalSales: activeProducts + activeAuctions,
    activeProducts,
    activeAuctions,
    pendingOrders: pendingOrdersCount,
    totalEarnings: Number(totals._sum.totalPrice ?? 0),
    monthlyEarnings: Number(monthlyEarnings._sum.totalPrice ?? 0),
  };
};

export const listSellerProductsWithFilters = async (
  sellerId: number,
  filters: { status?: string } = {}
) => {
  const where: Prisma.ProductWhereInput = {
    sellerId,
  };

  if (filters.status) {
    const normalized = filters.status.toLowerCase();
    if (normalized === "pending") {
      where.status = ProductStatus.PENDING_REVIEW;
    } else {
      const match = Object.values(ProductStatus).find(
        (status) => status.toLowerCase() === normalized
      );
      if (match) {
        where.status = match;
      }
    }
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return products.map((product) => normalizeProduct(product));
};

export const listSellerOrders = async (sellerId: number, status?: string) => {
  return listOrdersForSeller(sellerId, status);
};
