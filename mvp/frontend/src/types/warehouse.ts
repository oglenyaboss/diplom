export interface WarehouseItem {
  id: string;
  name: string;
  serial_number: string;
  category: string;
  description: string;
  manufacturer: string;
  price?: number;
  quantity: number;
  min_quantity: number;
  location: string;
  purchase_date: string;
  warranty_expiry: string;
  status: WarehouseItemStatus;
  last_inventory: string;
  created_at: string;
  updated_at: string;
}

export enum WarehouseItemStatus {
  AVAILABLE = "available",
  RESERVED = "reserved",
  UNAVAILABLE = "unavailable",
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  responsible_user: string;
  destination_user?: string;
  reason: string;
  date: string;
  notes?: string;
}

export enum TransactionType {
  INTAKE = "intake",
  ISSUE = "issue",
  RETURN = "return",
  ADJUSTMENT = "adjustment",
}

export interface CreateWarehouseItemRequest {
  name: string;
  serial_number: string;
  category: string;
  description?: string;
  manufacturer: string;
  quantity: number;
  min_quantity: number;
  location: string;
  purchase_date: string;
  warranty_expiry?: string;
  status: WarehouseItemStatus;
}

export interface CreateTransactionRequest {
  item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  responsible_user: string;
  destination_user?: string;
  reason: string;
  notes?: string;
}
