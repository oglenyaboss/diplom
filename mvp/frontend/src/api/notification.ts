import api from "@/utils/api";
import { Notification, MarkAsReadRequest } from "@/types/notification";

export const notificationApi = {
  /**
   * Проверка работоспособности сервиса
   */
  ping: async (): Promise<{ status: string }> => {
    const response = await api.notification.get("/ping");
    return response.data;
  },

  /**
   * Получение уведомлений пользователя
   */
  getUserNotifications: async (
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      is_read?: boolean;
      type?: string;
      sort_order?: "asc" | "desc";
    }
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    notifications: Notification[];
  }> => {
    const response = await api.notification.get(
      `/api/notifications/user/${userId}`,
      { params: options }
    );
    return response.data;
  },

  /**
   * Получение количества непрочитанных уведомлений
   */
  getUnreadCount: async (userId: string): Promise<{ count: number }> => {
    const response = await api.notification.get("/api/notifications/count", {
      params: { user_id: userId },
    });
    return response.data;
  },

  /**
   * Отметка уведомлений как прочитанных
   */
  markAsRead: async (
    data: MarkAsReadRequest
  ): Promise<{ success: boolean }> => {
    const response = await api.notification.post(
      "/api/notifications/mark-read",
      data
    );
    return response.data;
  },

  /**
   * Создание нового уведомления
   */
  createNotification: async (
    data: Omit<Notification, "id" | "created_at">
  ): Promise<Notification> => {
    const response = await api.notification.post(
      "/api/notifications/create",
      data
    );
    return response.data;
  },
};
