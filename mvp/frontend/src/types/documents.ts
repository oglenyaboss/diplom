// Типы для различных складских документов

// Базовый интерфейс для всех документов
export interface BaseDocument {
  id: string;
  date: Date;
  createdBy: {
    id: string;
    name: string;
    position: string;
  };
}

// Типы приходных документов
export enum ReceiptDocumentType {
  PURCHASE = "PURCHASE", // Закупка
  RETURN = "RETURN", // Возврат от клиента
  TRANSFER = "TRANSFER", // Перемещение с другого склада
}

// Приходная накладная
export interface ReceiptDocument extends BaseDocument {
  type: ReceiptDocumentType;
  number: string;
  items: Array<{
    id: string;
    name: string;
    serialNumber: string;
    category: string;
    manufacturer: string;
    quantity: number;
    price: number;
    totalAmount: number;
  }>;
  supplier: {
    id?: string;
    name: string;
    contactPerson?: string;
  };
  receivedBy: {
    id: string;
    name: string;
    position: string;
  };
  totalAmount: number;
  notes?: string;
}

// Типы расходных документов
export enum ExpenseDocumentType {
  ISSUE = "ISSUE", // Выдача сотруднику
  WRITE_OFF = "WRITE_OFF", // Списание
  TRANSFER = "TRANSFER", // Перемещение на другой склад
}

// Расходная накладная
export interface ExpenseDocument extends BaseDocument {
  type: ExpenseDocumentType;
  number: string;
  items: Array<{
    id: string;
    name: string;
    serialNumber: string;
    category: string;
    manufacturer: string;
    quantity: number;
    price: number;
    totalAmount: number;
  }>;
  recipient: {
    id?: string;
    name: string;
    position?: string;
    department?: string;
  };
  issuedBy: {
    id: string;
    name: string;
    position: string;
  };
  totalAmount: number;
  reason: string;
  notes?: string;
}

// Акт возврата
export interface ReturnDocument extends BaseDocument {
  number: string;
  items: Array<{
    id: string;
    name: string;
    serialNumber: string;
    category: string;
    manufacturer: string;
    quantity: number;
    condition: "NEW" | "USED" | "DAMAGED";
    reason: string;
  }>;
  returnedBy: {
    id: string;
    name: string;
    position: string;
    department: string;
  };
  receivedBy: {
    id: string;
    name: string;
    position: string;
  };
  notes?: string;
}
