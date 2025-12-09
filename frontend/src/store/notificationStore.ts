import { create } from 'zustand';

import { getAuctionRealtimeSocket } from '../lib/realtime';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';
import { Notification } from '../types';

type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  initialized: boolean;
  loading: boolean;
  socketBound: boolean;
  error?: string;
  fetchInitial: () => Promise<void>;
  bindSocket: () => void;
  markAsRead: (id: number) => Promise<void>;
  markAll: () => Promise<void>;
  reset: () => void;
};

const trimNotifications = (list: Notification[]) => list.slice(0, 50);

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  initialized: false,
  loading: false,
  socketBound: false,
  error: undefined,
  fetchInitial: async () => {
    if (get().loading || get().initialized) {
      return;
    }
    set({ loading: true, error: undefined });
    try {
      const payload = await fetchNotifications();
      set({
        notifications: trimNotifications(payload.notifications),
        unreadCount: payload.unread,
        initialized: true,
        loading: false,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error?.message ?? 'Failed to load notifications',
      });
    }
  },
  bindSocket: () => {
    if (get().socketBound) {
      return;
    }
    const socket = getAuctionRealtimeSocket();
    socket.on('notification:new', (notification: Notification) => {
      set((state) => {
        const updated = trimNotifications([notification, ...state.notifications]);
        const unread = state.unreadCount + (notification.read_at ? 0 : 1);
        return {
          notifications: updated,
          unreadCount: unread,
        };
      });
    });
    set({ socketBound: true });
  },
  markAsRead: async (id: number) => {
    await markNotificationAsRead(id);
    set((state) => {
      const notifications = state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
          : notification
      );
      const unread = notifications.filter((notification) => !notification.read_at).length;
      return { notifications, unreadCount: unread };
    });
  },
  markAll: async () => {
    await markAllNotificationsAsRead();
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },
  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      initialized: false,
      loading: false,
      error: undefined,
    });
  },
}));
