import api from '../lib/api';
import { Notification } from '../types';

export type NotificationListResponse = {
  notifications: Notification[];
  unread: number;
};

export const fetchNotifications = async (): Promise<NotificationListResponse> => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationAsRead = async (notificationId: number): Promise<void> => {
  await api.post(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.post('/notifications/mark-all-read');
};
