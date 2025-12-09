"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.listUserNotifications = exports.notifyAdmins = exports.createNotificationsForUsers = exports.createNotificationForUser = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const auctionRealtime_1 = require("../realtime/auctionRealtime");
const notificationSelect = client_1.Prisma.validator()({
    id: true,
    userId: true,
    type: true,
    title: true,
    message: true,
    data: true,
    readAt: true,
    createdAt: true,
});
const normalize = (notification) => ({
    id: notification.id,
    user_id: notification.userId,
    type: notification.type.toLowerCase(),
    title: notification.title,
    message: notification.message,
    data: notification.data ?? null,
    read_at: notification.readAt ? notification.readAt.toISOString() : null,
    created_at: notification.createdAt.toISOString(),
});
const createNotificationForUser = async ({ userId, title, message, type = client_1.NotificationType.SYSTEM, data, }) => {
    const notification = await client_2.prisma.notification.create({
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
    (0, auctionRealtime_1.broadcastUserNotification)({ userId, notification: dto });
    return dto;
};
exports.createNotificationForUser = createNotificationForUser;
const createNotificationsForUsers = async (userIds, payload) => {
    const uniqueIds = Array.from(new Set(userIds.filter((id) => Number.isInteger(id))));
    const notifications = await Promise.all(uniqueIds.map((userId) => (0, exports.createNotificationForUser)({
        userId,
        ...payload,
    })));
    return notifications;
};
exports.createNotificationsForUsers = createNotificationsForUsers;
const getAdminUserIds = async () => {
    const roles = await client_2.prisma.role.findMany({
        where: { name: { in: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] } },
        select: { id: true },
    });
    if (roles.length === 0) {
        return [];
    }
    const roleIds = roles.map((role) => role.id);
    const userRoles = await client_2.prisma.userRole.findMany({
        where: { roleId: { in: roleIds } },
        select: { userId: true },
    });
    return Array.from(new Set(userRoles.map((relation) => relation.userId)));
};
const notifyAdmins = async (payload) => {
    const adminIds = await getAdminUserIds();
    if (adminIds.length === 0 && payload.fallbackToSupport) {
        const supportRole = await client_2.prisma.role.findUnique({
            where: { name: client_1.RoleName.SUPPORT },
            select: { id: true },
        });
        if (supportRole) {
            const supportUsers = await client_2.prisma.userRole.findMany({
                where: { roleId: supportRole.id },
                select: { userId: true },
            });
            adminIds.push(...supportUsers.map((relation) => relation.userId));
        }
    }
    if (adminIds.length === 0) {
        return [];
    }
    return (0, exports.createNotificationsForUsers)(adminIds, payload);
};
exports.notifyAdmins = notifyAdmins;
const listUserNotifications = async (userId, options) => {
    const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 50) : 20;
    const notifications = await client_2.prisma.notification.findMany({
        where: {
            userId,
            ...(options?.unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: notificationSelect,
    });
    const count = await client_2.prisma.notification.count({
        where: { userId, readAt: null },
    });
    return {
        notifications: notifications.map(normalize),
        unread: count,
    };
};
exports.listUserNotifications = listUserNotifications;
const markNotificationAsRead = async (userId, notificationId) => {
    const notification = await client_2.prisma.notification.findUnique({
        where: { id: notificationId },
        select: { id: true, userId: true, readAt: true },
    });
    if (!notification || notification.userId !== userId) {
        throw errors_1.AppError.notFound("Notification not found");
    }
    if (notification.readAt) {
        return notification;
    }
    await client_2.prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
    });
};
exports.markNotificationAsRead = markNotificationAsRead;
const markAllNotificationsAsRead = async (userId) => {
    await client_2.prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
    });
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
//# sourceMappingURL=notificationService.js.map