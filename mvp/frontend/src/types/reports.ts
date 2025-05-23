import { Operation, Transfer } from "./tracking";

// Типы отчетов о передвижениях
export enum ReportType {
  Individual = "individual", // Отчет по одному оборудованию
  Department = "department", // Отчет по подразделению/отделу
  Period = "period", // Отчет за период
}

// Статус отчета
export enum ReportStatus {
  Draft = "draft", // Черновик
  Final = "final", // Финальный отчет
}

// Информация о перемещении оборудования для отчета
export interface ReportTransferItem {
  id: string;
  equipmentId: string;
  equipmentName: string;
  serialNumber: string;
  category?: string;
  fromHolder: {
    id?: string | null;
    name: string;
    position?: string;
  };
  toHolder: {
    id: string;
    name: string;
    position?: string;
  };
  transferDate: Date;
  transferReason: string;
  blockchainTxId?: string | null;
}

// Интерфейс отчета о передвижениях
export interface MovementReport {
  id: string;
  number: string;
  type: ReportType;
  title: string;
  status: ReportStatus;
  startDate: Date;
  endDate: Date;
  createdBy: {
    id: string;
    name: string;
    position?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  transfers: ReportTransferItem[];
  notes?: string;
}

// Запрос на создание отчета
export interface CreateReportRequest {
  title: string;
  type: ReportType;
  startDate: Date;
  endDate: Date;
  equipmentId?: string;
  departmentId?: string;
  notes?: string;
  createdBy: {
    id: string;
  };
}

// Преобразование Operation в ReportTransferItem
export function operationToReportItem(
  operation: Operation,
  fromName: string,
  toName: string,
  fromPosition: string = "",
  toPosition: string = ""
): ReportTransferItem {
  return {
    id: operation.id,
    equipmentId: operation.equipment_id,
    equipmentName: operation.equipment_name,
    serialNumber: operation.equipment_serial,
    fromHolder: {
      id: operation.from_holder_id || null,
      name: fromName,
      position: fromPosition,
    },
    toHolder: {
      id: operation.to_holder_id,
      name: toName,
      position: toPosition,
    },
    transferDate: new Date(operation.transfer_date),
    transferReason: operation.transfer_reason,
    blockchainTxId: operation.blockchain_tx_id,
  };
}

// Преобразование Transfer в ReportTransferItem
export function transferToReportItem(
  transfer: Transfer,
  equipmentName: string,
  serialNumber: string,
  fromName: string,
  toName: string,
  fromPosition: string = "",
  toPosition: string = ""
): ReportTransferItem {
  return {
    id: transfer.id,
    equipmentId: transfer.equipment_id,
    equipmentName: equipmentName,
    serialNumber: serialNumber,
    fromHolder: {
      id: transfer.from_holder_id,
      name: fromName,
      position: fromPosition,
    },
    toHolder: {
      id: transfer.to_holder_id,
      name: toName,
      position: toPosition,
    },
    transferDate: new Date(transfer.transfer_date),
    transferReason: transfer.transfer_reason,
    blockchainTxId: transfer.blockchain_tx_id,
  };
}
