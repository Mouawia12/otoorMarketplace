import {
  AuctionStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  NotificationType,
  RoleName,
  SellerStatus,
  UserStatus,
} from "@prisma/client";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { normalizeProduct } from "./productService";
import { config } from "../config/env";
import { createNotificationForUser } from "./notificationService";
import { safeRecordAdminAuditLog } from "./auditLogService";

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

type AdminUserUpdatePayload = {
  status?: string;
  seller_status?: string;
  roles?: string[];
};

type AdminUserUpdateAuditContext = {
  actorId: number;
  ipAddress?: string;
};

type AdminUserChangeRecord = {
  field: "status" | "seller_status" | "roles";
  from: unknown;
  to: unknown;
};

export const updateUserStatus = async (
  userId: number,
  updates: AdminUserUpdatePayload,
  allowedRoles: RoleName[],
  auditContext?: AdminUserUpdateAuditContext
) => {
  if (!allowedRoles.some((role) => role === RoleName.ADMIN || role === RoleName.SUPER_ADMIN)) {
    throw AppError.forbidden();
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (updates.status) {
    const normalizedStatus = updates.status.toUpperCase();
    if (!Object.values(UserStatus).includes(normalizedStatus as UserStatus)) {
      throw AppError.badRequest("Invalid status value");
    }
    updateData.status = normalizedStatus as UserStatus;
  }

  if (updates.seller_status) {
    const normalizedSellerStatus = updates.seller_status.toUpperCase();
    if (!Object.values(SellerStatus).includes(normalizedSellerStatus as SellerStatus)) {
      throw AppError.badRequest("Invalid seller status value");
    }
    updateData.sellerStatus = normalizedSellerStatus as SellerStatus;
  }

  const { updatedUser, changes } = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        sellerProfile: { select: { status: true } },
      },
    });
    if (!existing) {
      throw AppError.notFound("User not found");
    }

    const changeDetails: Record<string, { from: unknown; to: unknown }> = {};
    const previousRoles = existing.roles.map((relation) => relation.role.name as RoleName);

    if (Object.keys(updateData).length === 0 && !updates.roles) {
      return { updatedUser: existing, changes: changeDetails };
    }

    if (updates.roles) {
      if (!Array.isArray(updates.roles) || updates.roles.length === 0) {
        throw AppError.badRequest("Roles must be a non-empty array");
      }

      const normalizedRoles = Array.from(
        new Set(
          updates.roles.map((role) => role.trim().toUpperCase()).filter((role) => role.length > 0)
        )
      );

      const invalidRoles = normalizedRoles.filter(
        (role) => !Object.values(RoleName).includes(role as RoleName)
      );
      if (invalidRoles.length > 0) {
        throw AppError.badRequest(`Invalid roles: ${invalidRoles.join(", ")}`);
      }

      if (
        normalizedRoles.includes(RoleName.SUPER_ADMIN) &&
        !allowedRoles.includes(RoleName.SUPER_ADMIN)
      ) {
        throw AppError.forbidden("Only super admins can assign super admin role");
      }

      if (!normalizedRoles.includes(RoleName.BUYER)) {
        normalizedRoles.push(RoleName.BUYER);
      }

      const roleRecords = await tx.role.findMany({
        where: { name: { in: normalizedRoles as RoleName[] } },
      });

      if (roleRecords.length !== normalizedRoles.length) {
        throw AppError.badRequest("Some roles were not found");
      }

      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({
        data: roleRecords.map((role) => ({ userId, roleId: role.id })),
        skipDuplicates: true,
      });

      const sortedPrevRoles = [...previousRoles].sort();
      const sortedNewRoles = [...normalizedRoles].sort();
      const rolesChanged =
        sortedPrevRoles.length !== sortedNewRoles.length ||
        sortedNewRoles.some((role, idx) => sortedPrevRoles[idx] !== role);
      if (rolesChanged) {
        changeDetails.roles = {
          from: previousRoles.map((role) => role.toLowerCase()),
          to: normalizedRoles.map((role) => role.toLowerCase()),
        };
      }
    }

    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      if (updateData.status && existing.status !== updateData.status) {
        changeDetails.status = {
          from: existing.status.toLowerCase(),
          to: (updateData.status as UserStatus).toLowerCase(),
        };
      }

      if (updateData.sellerStatus && existing.sellerStatus !== updateData.sellerStatus) {
        changeDetails.seller_status = {
          from: existing.sellerStatus?.toLowerCase(),
          to: (updateData.sellerStatus as SellerStatus).toLowerCase(),
        };
      }
    }
    const refreshed = await tx.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        sellerProfile: { select: { status: true } },
      },
    });

    if (!refreshed) {
      throw AppError.notFound("User not found");
    }

    return { updatedUser: refreshed, changes: changeDetails };
  });

  if (auditContext?.actorId) {
    const entries: AdminUserChangeRecord[] = Object.entries(changes).map(([field, diff]) => ({
      field: field as AdminUserChangeRecord["field"],
      from: diff.from,
      to: diff.to,
    }));

    const auditBase = {
      actorId: auditContext.actorId,
    };
    const withIp = (payload: Parameters<typeof safeRecordAdminAuditLog>[0]) =>
      auditContext.ipAddress
        ? { ...payload, ipAddress: auditContext.ipAddress }
        : payload;

    if (entries.length === 0) {
      await safeRecordAdminAuditLog(
        withIp({
          ...auditBase,
          action: "user.update",
          targetType: "user",
          targetId: userId,
          description: `Updated user ${userId} (no field changes detected)`,
          metadata: { submitted: updates },
        })
      );
    } else {
      const actionsMap: Record<AdminUserChangeRecord["field"], string> = {
        status: "user.status",
        seller_status: "user.seller_status",
        roles: "user.roles",
      };

      await Promise.all(
        entries.map((entry) =>
          safeRecordAdminAuditLog(
            withIp({
              ...auditBase,
              action: actionsMap[entry.field],
              targetType: "user",
              targetId: userId,
              description: `Updated ${entry.field} for user ${userId}: ${entry.from ?? "-"} -> ${
                entry.to ?? "-"
              }`,
              metadata: { field: entry.field, from: entry.from, to: entry.to },
            })
          )
        )
      );
    }
  }

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    full_name: updatedUser.fullName,
    status: updatedUser.status,
    roles: updatedUser.roles.map((relation) => relation.role.name.toLowerCase()),
    seller_status: updatedUser.sellerStatus?.toLowerCase?.() ?? "pending",
    seller_profile_status: updatedUser.sellerProfile?.status?.toLowerCase?.(),
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

  if (
    targetUser.email.toLowerCase() ===
    config.accounts.protectedAdminEmail.toLowerCase()
  ) {
    throw AppError.forbidden("Cannot delete protected admin account");
  }

  const targetRoles = targetUser.roles.map((r) => r.role.name as RoleName);
  if (
    targetRoles.includes(RoleName.SUPER_ADMIN) &&
    !actorRoles.includes(RoleName.SUPER_ADMIN)
  ) {
    throw AppError.forbidden("Cannot delete a super admin");
  }

  await prisma.sellerProfile.deleteMany({
    where: { userId },
  });

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

  if (product.sellerId) {
    let notificationType: NotificationType | null = null;
    let title = "";
    let message = "";

    if (targetStatus === ProductStatus.PUBLISHED) {
      notificationType = NotificationType.PRODUCT_APPROVED;
      title = "تم نشر المنتج";
      message = `${product.nameEn ?? "منتجك"} أصبح متاحًا الآن في المتجر.`;
    } else if (targetStatus === ProductStatus.REJECTED) {
      notificationType = NotificationType.PRODUCT_REJECTED;
      title = "تم رفض المنتج";
      message = `نأسف، لم يتم قبول ${product.nameEn ?? "المنتج"}. يمكنك مراجعة المتطلبات وإعادة الإرسال.`;
    }

    if (notificationType) {
      await createNotificationForUser({
        userId: product.sellerId,
        type: notificationType,
        title,
        message,
        data: {
          productId: product.id,
          status: targetStatus,
        },
      });
    }
  }

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
      auction.status === AuctionStatus.PENDING_REVIEW
        ? "high"
        : auction.status === AuctionStatus.ACTIVE && isEndingSoon
          ? "high"
          : "low";

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
      where: {
        status: {
          in: [
            AuctionStatus.PENDING_REVIEW,
            AuctionStatus.ACTIVE,
            AuctionStatus.SCHEDULED,
          ],
        },
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
