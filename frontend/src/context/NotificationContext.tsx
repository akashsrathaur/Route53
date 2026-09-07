'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface FlashNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  dismissible?: boolean;
}

interface NotificationContextType {
  notifications: FlashNotification[];
  notify: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  notify: () => {},
  dismiss: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<FlashNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newNotif: FlashNotification = { id, type, message, title, dismissible: true };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);

      // Auto dismiss after 6 seconds for success/info
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          dismiss(id);
        }, 6000);
      }
    },
    [dismiss]
  );

  return (
    <NotificationContext.Provider value={{ notifications, notify, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
