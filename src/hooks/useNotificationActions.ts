import { useCallback, useState } from "react";
import { safeApiFetch } from "../lib/api";

type NotificationItem = {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  isRead?: boolean;
  [key: string]: unknown;
};

export function useNotificationActions() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    const data = await safeApiFetch("/api/notifications");
    if (data?.success) setNotifications(data.notifications || []);
  }, []);

  const handleMarkAsRead = useCallback(async (id: string) => {
    const data = await safeApiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    if (data?.success) {
      setNotifications((prev) => prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification,
      ));
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const data = await safeApiFetch("/api/notifications/read-all", { method: "PATCH" });
    if (data?.success) {
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    }
  }, []);

  const handleDeleteNotification = useCallback(async (id: string, event?: { stopPropagation: () => void }) => {
    event?.stopPropagation();
    const data = await safeApiFetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (data?.success) setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  return {
    notifications,
    fetchNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
  };
}
