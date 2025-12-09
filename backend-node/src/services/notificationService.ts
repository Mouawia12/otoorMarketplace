import { NotificationType, Prisma, RoleName } from "@prisma/client";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { broadcastUserNotification } from "../realtime/auctionRealtime";

const notificationSelect = Prisma.validator<Prisma.NotificationSelect>()({
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  data: true,
  readAt: true,
  createdAt: true,
});

type NotificationEntity = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

const normalize = (notification: NotificationEntity) => ({
  id: notification.id,
  user_id: notification.userId,
  type: notification.type.toLowerCase(),
  title: notification.title,
  message: notification.message,
  data: notification.data ?? null,
  read_at: notification.readAt ? notification.readAt.toISOString() : null,
  created_at: notification.createdAt.toISOString(),
});

type NotificationPayload = {
  userId: number;
  title: string;
  message: string;
  type?: NotificationType;
  data?: Prisma.InputJsonValue;
};

export const createNotificationForUser = async ({
  userId,
  title,
  message,
  type = NotificationType.SYSTEM,
  data,
}: NotificationPayload) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      ...(data !== undefined ? { data } : {}),
    },
    select: notificationSelect,
  });

  const dto = normalize(notification);
  broadcastUserNotification({ userId, notification: dto });
  return dto;
};

export const createNotificationsForUsers = async (
  userIds: number[],
  payload: Omit<NotificationPayload, "userId">
) => {
  const uniqueIds = Array.from(new Set(userIds.filter((id) => Number.isInteger(id))));
  const notifications = await Promise.all(
    uniqueIds.map((userId) =>
      createNotificationForUser({
        userId,
        ...payload,
      })
    )
  );
  return notifications;
};

const getAdminUserIds = async () => {
  const roles = await prisma.role.findMany({
    where: { name: { in: [RoleName.ADMIN, RoleName.SUPER_ADMIN] } },
    select: { id: true },
  });
  if (roles.length === 0) {
    return [];
  }
  const roleIds = roles.map((role) => role.id);
  const userRoles = await prisma.userRole.findMany({
    where: { roleId: { in: roleIds } },
    select: { userId: true },
  });
  return Array.from(new Set(userRoles.map((relation) => relation.userId)));
};

export const notifyAdmins = async (
  payload: Omit<NotificationPayload, "userId"> & { fallbackToSupport?: boolean }
) => {
  const adminIds = await getAdminUserIds();
  if (adminIds.length === 0 && payload.fallbackToSupport) {
    const supportRole = await prisma.role.findUnique({
      where: { name: RoleName.SUPPORT },
      select: { id: true },
    });
    if (supportRole) {
      const supportUsers = await prisma.userRole.findMany({
        where: { roleId: supportRole.id },
        select: { userId: true },
      });
      adminIds.push(...supportUsers.map((relation) => relation.userId));
    }
  }
  if (adminIds.length === 0) {
    return [];
  }
  return createNotificationsForUsers(adminIds, payload);
};

export const listUserNotifications = async (
  userId: number,
  options?: { limit?: number; unreadOnly?: boolean }
) => {
  const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 50) : 20;
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(options?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: notificationSelect,
  });

  const count = await prisma.notification.count({
    where: { userId, readAt: null },
  });

  return {
    notifications: notifications.map(normalize),
    unread: count,
  };
};

export const markNotificationAsRead = async (userId: number, notificationId: number) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, readAt: true },
  });

  if (!notification || notification.userId !== userId) {
    throw AppError.notFound("Notification not found");
  }

  if (notification.readAt) {
    return notification;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
};

export const markAllNotificationsAsRead = async (userId: number) => {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};
