import { WarehouseItem } from "./warehouse";

// Типы накладных
export enum InvoiceType {
  Receipt = "receipt", // Приходная
  Expense = "expense", // Расходная
}

// Информация о позиции в накладной
export interface InvoiceItem {
  itemId: string;
  name: string;
  serialNumber: string;
  category: string;
  manufacturer: string;
  quantity: number;
  price: number;
  totalAmount: number;
}

// Информация о человеке в накладной
export interface PersonInfo {
  userId?: string;
  fullName: string;
  position?: string;
}

// Интерфейс накладной
export interface Invoice {
  id?: string;
  number: string;
  type: InvoiceType;
  date: Date;
  items: InvoiceItem[];
  receivedBy: PersonInfo;
  issuedBy: PersonInfo;
  totalAmount: number;
  notes?: string;
  transactionId?: string;
  createdAt?: Date;
}

// Запрос на создание накладной
export interface CreateInvoiceRequest {
  number: string;
  type: InvoiceType;
  date: Date;
  items: InvoiceItem[];
  receivedBy: PersonInfo;
  issuedBy: PersonInfo;
  totalAmount: number;
  notes?: string;
  transactionId?: string;
}

// Преобразование WarehouseItem в InvoiceItem
export function warehouseItemToInvoiceItem(
  item: WarehouseItem,
  quantity: number
): InvoiceItem {
  return {
    itemId: item.id,
    name: item.name,
    serialNumber: item.serial_number || "",
    category: item.category || "",
    manufacturer: item.manufacturer || "",
    quantity: quantity,
    price: item.price || 0,
    totalAmount: (item.price || 0) * quantity,
  };
}
