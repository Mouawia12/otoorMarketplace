import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shallow } from 'zustand/shallow';

import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import type { Notification } from '../../types';

const formatDate = (value: string, locale: string) => {
  try {
    return new Date(value).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return value;
  }
};

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const isRTL = i18n.language === 'ar';

  const {
    notifications,
    unreadCount,
    fetchInitial,
    markAsRead,
    markAll,
    bindSocket,
    reset,
    loading,
  } = useNotificationStore(
    (state) => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      fetchInitial: state.fetchInitial,
      markAsRead: state.markAsRead,
      markAll: state.markAll,
      bindSocket: state.bindSocket,
      reset: state.reset,
      loading: state.loading,
    }),
    shallow
  );

  useEffect(() => {
    if (!isAuthenticated) {
      reset();
      setOpen(false);
      return;
    }
    bindSocket();
    fetchInitial().catch(() => undefined);
  }, [isAuthenticated, bindSocket, fetchInitial, reset]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visibleNotifications = useMemo(() => notifications.slice(0, 10), [notifications]);

  const handleItemClick = async (notification: Notification) => {
    if (!notification.read_at) {
      try {
        await markAsRead(notification.id);
      } catch {
        // ignore read errors silently
      }
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal shadow-sm hover:bg-sand transition"
        aria-label={t('notifications.title')}
      >
        <span role="img" aria-hidden="true">
          🔔
        </span>
        <span className="hidden sm:inline">{t('notifications.title')}</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-alert text-xs font-bold text-white px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute ${isRTL ? 'left-0' : 'right-0'} z-40 mt-3 w-80 max-w-[90vw] rounded-2xl border border-gray-100 bg-white shadow-lg`}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-charcoal">{t('notifications.recent')}</p>
              <p className="text-xs text-taupe">
                {unreadCount > 0
                  ? t('notifications.new', { count: unreadCount })
                  : t('notifications.empty')}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                className="text-xs font-semibold text-gold hover:text-gold-hover"
                onClick={() => {
                  markAll().catch(() => undefined);
                }}
              >
                {t('notifications.markAll')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-taupe">
                {t('notifications.loading')}
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-taupe">
                {t('notifications.empty')}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visibleNotifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleItemClick(notification)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sand transition ${
                        notification.read_at ? 'opacity-80' : ''
                      }`}
                    >
                      <span className="text-lg" aria-hidden="true">
                        {notification.read_at ? '📨' : '🆕'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-charcoal">{notification.title}</p>
                        <p className="text-xs text-charcoal-light">{notification.message}</p>
                        <p className="mt-1 text-[11px] text-taupe">
                          {formatDate(notification.created_at, i18n.language)}
                        </p>
                      </div>
                      {!notification.read_at && (
                        <span className="mt-2 h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
