import {
  AuctionStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  RoleName,
  UserStatus,
} from "@prisma/client";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { normalizeProduct } from "./productService";

export const getAdminDashboardStats = async () => {
  const [totalProducts, pendingProducts, totalOrders, pendingOrders, runningAuctions] =
    await prisma.$transaction([
      prisma.product.count(),
      prisma.product.count({
        where: { status: ProductStatus.PENDING_REVIEW },
      }),
      prisma.order.count(),
      prisma.order.count({
        where: { status: OrderStatus.PENDING },
      }),
      prisma.auction.count({
        where: { status: AuctionStatus.ACTIVE },
      }),
    ]);

  return {
    total_products: totalProducts,
    pending_products: pendingProducts,
    total_orders: totalOrders,
    pending_orders: pendingOrders,
    running_auctions: runningAuctions,
  };
};

export const listUsersForAdmin = async () => {
  const users = (await prisma.user.findMany({
    include: {
      roles: {
        include: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })) as Prisma.UserGetPayload<{
    include: { roles: { include: { role: true } } };
  }>[];

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    status: user.status,
    roles: user.roles.map((relation) => relation.role.name.toLowerCase()),
  }));
};

export const updateUserStatus = async (
  userId: number,
  status: string,
  allowedRoles: RoleName[]
) => {
  if (!allowedRoles.some((role) => role === RoleName.ADMIN || role === RoleName.SUPER_ADMIN)) {
    throw AppError.forbidden();
  }

  const normalized = status.toUpperCase();
  if (!Object.values(UserStatus).includes(normalized as UserStatus)) {
    throw AppError.badRequest("Invalid status value");
  }

  const updated = (await prisma.user.update({
    where: { id: userId },
    data: {
      status: normalized as UserStatus,
    },
    include: {
      roles: { include: { role: true } },
    },
  })) as Prisma.UserGetPayload<{
    include: { roles: { include: { role: true } } };
  }>;

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.fullName,
    status: updated.status,
    roles: updated.roles.map((relation) => relation.role.name.toLowerCase()),
  };
};

export const listPendingProducts = async () => {
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.PENDING_REVIEW },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return products.map((product) => normalizeProduct(product));
};
