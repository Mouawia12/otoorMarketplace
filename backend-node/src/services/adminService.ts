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
  const [totalUsers, totalProducts, pendingProducts, totalOrders, pendingOrders, runningAuctions] =
    await prisma.$transaction([
      prisma.user.count(),
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
    total_users: totalUsers,
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
      sellerProfile: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })) as Prisma.UserGetPayload<{
    include: {
      roles: { include: { role: true } };
      sellerProfile: { select: { status: true } };
    };
  }>[];

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    status: user.status,
    roles: user.roles.map((relation) => relation.role.name.toLowerCase()),
    created_at: user.createdAt.toISOString(),
    seller_status: user.sellerStatus?.toLowerCase?.() ?? "pending",
    seller_profile_status: user.sellerProfile?.status?.toLowerCase?.(),
    verified_seller: user.verifiedSeller,
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

export const deleteUserByAdmin = async (
  userId: number,
  actorRoles: RoleName[],
  actorId?: number
) => {
  const isAdmin =
    actorRoles.includes(RoleName.ADMIN) || actorRoles.includes(RoleName.SUPER_ADMIN);
  if (!isAdmin) {
    throw AppError.forbidden();
  }

  if (actorId && userId === actorId) {
    throw AppError.badRequest("You cannot delete your own account");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  if (!targetUser) {
    throw AppError.notFound("User not found");
  }

  const targetRoles = targetUser.roles.map((r) => r.role.name as RoleName);
  if (
    targetRoles.includes(RoleName.SUPER_ADMIN) &&
    !actorRoles.includes(RoleName.SUPER_ADMIN)
  ) {
    throw AppError.forbidden("Cannot delete a super admin");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return { success: true };
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

const friendlyToProductStatus = (status: string): ProductStatus => {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "pending":
    case "pending_review":
      return ProductStatus.PENDING_REVIEW;
    case "approved":
    case "published":
      return ProductStatus.PUBLISHED;
    case "draft":
      return ProductStatus.DRAFT;
    case "rejected":
      return ProductStatus.REJECTED;
    case "hidden":
    case "archived":
      return ProductStatus.ARCHIVED;
    default:
      throw AppError.badRequest("Unsupported product status value");
  }
};

export const listProductsForAdmin = async (status?: string) => {
  const where: Prisma.ProductWhereInput = {};

  if (status) {
    where.status = friendlyToProductStatus(status);
  } else {
    where.status = { not: ProductStatus.DRAFT };
  }

  const products = await prisma.product.findMany({
    where,
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
    orderBy: { createdAt: "desc" },
  });

  return products.map((product) => normalizeProduct(product));
};

export const updateProductStatusAsAdmin = async (
  productId: number,
  status: string
) => {
  const targetStatus = friendlyToProductStatus(status);

  const product = await prisma.product.update({
    where: { id: productId },
    data: { status: targetStatus },
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
  });

  return normalizeProduct(product);
};

type ModerationItem = {
  id: string;
  item_id: number;
  type: "product" | "order" | "auction";
  title_en: string;
  title_ar: string;
  created_at: string;
  priority: "low" | "medium" | "high";
};

const buildModerationItems = (
  products: Array<ReturnType<typeof normalizeProduct>>,
  orders: Array<{
    id: number;
    createdAt: Date;
    items: Array<{
      product?: ReturnType<typeof normalizeProduct>;
    }>;
  }>,
  auctions: Array<{
    id: number;
    endTime: Date;
    startTime: Date;
    product?: ReturnType<typeof normalizeProduct>;
    status: AuctionStatus;
  }>
): ModerationItem[] => {
  const productItems = products.map((product) => ({
    id: `product-${product.id}`,
    item_id: product.id,
    type: "product" as const,
    title_en: product.name_en,
    title_ar: product.name_ar,
    created_at: new Date(product.created_at).toISOString(),
    priority: "high" as const,
  }));

  const orderItems = orders.map((order) => {
    const [firstItem] = order.items;
    const product = firstItem?.product;
    return {
      id: `order-${order.id}`,
      item_id: order.id,
      type: "order" as const,
      title_en: product?.name_en ?? `Order #${order.id}`,
      title_ar: product?.name_ar ?? `طلب #${order.id}`,
      created_at: order.createdAt.toISOString(),
      priority: "medium" as const,
    };
  });

  const auctionItems = auctions.map((auction) => {
    const product = auction.product;
    const endTime = new Date(auction.endTime);
    const isEndingSoon = endTime.getTime() - Date.now() < 12 * 60 * 60 * 1000;
    const priority: ModerationItem["priority"] =
      auction.status === AuctionStatus.ACTIVE && isEndingSoon ? "high" : "low";

    return {
      id: `auction-${auction.id}`,
      item_id: auction.id,
      type: "auction" as const,
      title_en: product?.name_en ?? `Auction #${auction.id}`,
      title_ar: product?.name_ar ?? `مزاد #${auction.id}`,
      created_at: new Date(auction.startTime).toISOString(),
      priority,
    };
  });

  return [...productItems, ...orderItems, ...auctionItems].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const getAdminModerationQueue = async () => {
  const [rawProducts, rawOrders, rawAuctions] = await prisma.$transaction([
    prisma.product.findMany({
      where: { status: ProductStatus.PENDING_REVIEW },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: { status: OrderStatus.PENDING },
      include: {
        items: {
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.auction.findMany({
      where: { status: { in: [AuctionStatus.ACTIVE, AuctionStatus.SCHEDULED] } },
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
      },
      orderBy: { endTime: "asc" },
      take: 5,
    }),
  ]);

  const pendingProducts = rawProducts.map((product) => normalizeProduct(product));

  const pendingOrders: Array<{
    id: number;
    createdAt: Date;
    items: Array<{ product?: ReturnType<typeof normalizeProduct> }>;
  }> = rawOrders.map((order) => ({
    id: order.id,
    createdAt: order.createdAt,
    items: order.items.map((item) => {
      const entry: { product?: ReturnType<typeof normalizeProduct> } = {};
      if (item.product) {
        entry.product = normalizeProduct(item.product);
      }
      return entry;
    }),
  }));

  const activeAuctions: Array<{
    id: number;
    startTime: Date;
    endTime: Date;
    product?: ReturnType<typeof normalizeProduct>;
    status: AuctionStatus;
  }> = rawAuctions.map((auction) => {
    const entry: {
      id: number;
      startTime: Date;
      endTime: Date;
      product?: ReturnType<typeof normalizeProduct>;
      status: AuctionStatus;
    } = {
      id: auction.id,
      startTime: auction.startTime,
      endTime: auction.endTime,
      status: auction.status,
    };

    if (auction.product) {
      entry.product = normalizeProduct(auction.product);
    }

    return entry;
  });

  return buildModerationItems(pendingProducts, pendingOrders, activeAuctions).slice(0, 12);
};
