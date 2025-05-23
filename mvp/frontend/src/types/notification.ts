export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  related_to?: string;
  is_read: boolean;
  created_at: string;
}

export enum NotificationType {
  EQUIPMENT_ASSIGNED = "equipment_assigned",
  EQUIPMENT_TRANSFERRED = "equipment_transferred",
  EQUIPMENT_RETURNED = "equipment_returned",
  LOW_STOCK = "low_stock",
  WARRANTY_EXPIRATION = "warranty_expiration",
}

export interface MarkAsReadRequest {
  notification_ids: string[];
}
