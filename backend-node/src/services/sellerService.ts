import { OrderStatus, Prisma, ProductStatus } from "@prisma/client";

import { prisma } from "../prisma/client";
import { normalizeProduct } from "./productService";
import { listOrdersForSeller } from "./orderService";
import { config } from "../config/env";

export const getSellerDashboardStats = async (sellerId: number) => {
  const commissionRate = config.platformCommissionRate ?? 0;

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

  const grossTotal = Number(totals._sum.totalPrice ?? 0);
  const grossMonthly = Number(monthlyEarnings._sum.totalPrice ?? 0);
  const netTotal = grossTotal - grossTotal * commissionRate;
  const netMonthly = grossMonthly - grossMonthly * commissionRate;

  return {
    totalSales: activeProducts + activeAuctions,
    activeProducts,
    activeAuctions,
    pendingOrders: pendingOrdersCount,
    totalEarnings: netTotal,
    monthlyEarnings: netMonthly,
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
      auctions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return products.map((product) => normalizeProduct(product));
};

export const listSellerOrders = async (sellerId: number, status?: string) => {
  return listOrdersForSeller(sellerId, status);
};

export const listSellerEarnings = async (sellerId: number) => {
  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          product: { sellerId },
        },
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const platformRate = config.platformCommissionRate ?? 0;

  const records = orders.flatMap((order) =>
    order.items
      .filter((item) => item.product?.sellerId === sellerId)
      .map((item) => {
        const amount = Number(item.totalPrice);
        const commission = Number((amount * platformRate).toFixed(2));
        const netEarnings = amount - commission;
        return {
          id: item.id,
          orderId: order.id,
          date: order.createdAt,
          productName: item.product?.nameEn ?? "Unknown",
          productNameAr: item.product?.nameAr ?? "غير معروف",
          amount,
          commission,
          netEarnings,
        };
      })
  );

  const totals = records.reduce(
    (acc, r) => {
      acc.totalEarnings += r.amount;
      acc.totalCommission += r.commission;
      acc.netEarnings += r.netEarnings;
      return acc;
    },
    { totalEarnings: 0, totalCommission: 0, netEarnings: 0 }
  );

  const averageOrder = records.length > 0 ? totals.totalEarnings / records.length : 0;

  return {
    records,
    summary: {
      totalEarnings: totals.totalEarnings,
      totalCommission: totals.totalCommission,
      netEarnings: totals.netEarnings,
      averageOrder,
    },
  };
};
