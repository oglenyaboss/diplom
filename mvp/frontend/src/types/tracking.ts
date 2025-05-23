export interface Equipment {
  id: string;
  name: string;
  serial_number: string;
  category: string;
  description?: string;
  manufacturer: string;
  purchase_date: string;
  warranty_expiry?: string;
  status: EquipmentStatus;
  location: string;
  current_holder_id: string | null;
  blockchain_id: string | null;
  created_at: string;
  updated_at: string;
}

export enum EquipmentStatus {
  ACTIVE = "active",
  MAINTENANCE = "maintenance",
  DECOMMISSIONED = "decommissioned",
}

export interface Transfer {
  id: string;
  equipment_id: string;
  from_holder_id: string | null;
  to_holder_id: string;
  transfer_date: string;
  transfer_reason: string;
  blockchain_tx_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEquipmentRequest {
  name: string;
  serial_number: string;
  category: string;
  description?: string;
  manufacturer: string;
  purchase_date: string;
  warranty_expiry?: string;
  status: EquipmentStatus;
  location: string;
  current_holder_id?: string;
}

export interface TransferEquipmentRequest {
  equipment_id: string;
  from_holder_id?: string | null;
  to_holder_id: string;
  transfer_reason: string;
}

export interface Operation {
  id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_serial: string;
  from_holder_id: string | null;
  to_holder_id: string;
  transfer_date: string;
  transfer_reason: string;
  blockchain_tx_id: string | null;
}

export interface BlockchainRegisterResponse {
  equipment_id: string;
  blockchain_id: string;
  transaction_hash: string;
  timestamp: string;
}

export interface BlockchainHistoryResponse {
  equipment_id: string;
  blockchain_id: string;
  blockchain_history: {
    from: string;
    to: string;
    timestamp: string;
    notes: string;
    transaction_hash: string;
  }[];
}
