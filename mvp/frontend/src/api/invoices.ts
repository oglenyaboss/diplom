import api from "@/utils/api";
import { CreateInvoiceRequest, Invoice, InvoiceType } from "@/types/invoices";
import { InventoryTransaction } from "@/types/warehouse";

export const invoicesApi = {
  /**
   * Создание новой накладной
   */
  createInvoice: async (data: CreateInvoiceRequest): Promise<Invoice> => {
    const response = await api.warehouse.post("/invoices", data);
    return response.data.invoice;
  },

  /**
   * Получение накладной по ID
   */
  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await api.warehouse.get(`/invoices/${id}`);
    return response.data;
  },

  /**
   * Получение списка накладных с фильтрацией по типу
   * @param type - тип накладной (receipt, expense)
   */
  getInvoices: async (type?: string): Promise<Invoice[]> => {
    const params = type ? { type } : {};
    const response = await api.warehouse.get("/invoices", { params });
    return response.data;
  },

  /**
   * Получение списка транзакций, для которых не созданы накладные
   */
  getTransactionsWithoutInvoices: async (): Promise<InventoryTransaction[]> => {
    const response = await api.warehouse.get("/transactions/without-invoices");
    return response.data;
  },
};
