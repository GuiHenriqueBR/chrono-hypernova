import { useCallback } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import type { Notification } from '../store/notificationStore';

export type { Notification };

export function useNotifications() {
  const {
    notifications,
    unreadCount,
    addNotification: addNotificationStore,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
      addNotificationStore(notification);

      // Tocar som de notificacao (opcional)
      if ('Notification' in window && Notification.permission === 'granted') {
        new window.Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
        });
      }
    },
    [addNotificationStore]
  );

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await window.Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    requestPermission,
  };
}

// Hook para agrupar notificacoes por data
export function useGroupedNotifications() {
  const { notifications } = useNotifications();

  const grouped = notifications.reduce(
    (acc, notification) => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Hoje';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Ontem';
      } else {
        key = date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(notification);
      return acc;
    },
    {} as Record<string, Notification[]>
  );

  return grouped;
}
