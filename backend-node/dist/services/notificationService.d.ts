import { NotificationType, Prisma } from "@prisma/client";
type NotificationPayload = {
    userId: number;
    title: string;
    message: string;
    type?: NotificationType;
    data?: Prisma.InputJsonValue;
};
export declare const createNotificationForUser: ({ userId, title, message, type, data, }: NotificationPayload) => Promise<{
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    data: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null;
    read_at: string | null;
    created_at: string;
}>;
export declare const createNotificationsForUsers: (userIds: number[], payload: Omit<NotificationPayload, "userId">) => Promise<{
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    data: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null;
    read_at: string | null;
    created_at: string;
}[]>;
export declare const notifyAdmins: (payload: Omit<NotificationPayload, "userId"> & {
    fallbackToSupport?: boolean;
}) => Promise<{
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    data: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null;
    read_at: string | null;
    created_at: string;
}[]>;
export declare const listUserNotifications: (userId: number, options?: {
    limit?: number;
    unreadOnly?: boolean;
}) => Promise<{
    notifications: {
        id: number;
        user_id: number;
        type: string;
        title: string;
        message: string;
        data: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null;
        read_at: string | null;
        created_at: string;
    }[];
    unread: number;
}>;
export declare const markNotificationAsRead: (userId: number, notificationId: number) => Promise<{
    id: number;
    userId: number;
    readAt: Date | null;
} | undefined>;
export declare const markAllNotificationsAsRead: (userId: number) => Promise<void>;
export {};
//# sourceMappingURL=notificationService.d.ts.map