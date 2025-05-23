import api from "@/utils/api";
import {
  WarehouseItem,
  CreateWarehouseItemRequest,
  InventoryTransaction,
  CreateTransactionRequest,
} from "@/types/warehouse";

export const warehouseApi = {
  /**
   * Создание нового оборудования на складе
   */
  createItem: async (
    data: CreateWarehouseItemRequest
  ): Promise<WarehouseItem> => {
    const response = await api.warehouse.post("/items", data);
    return response.data;
  },

  /**
   * Получение информации об оборудовании
   */
  getItem: async (id: string): Promise<WarehouseItem> => {
    const response = await api.warehouse.get(`/items/${id}`);
    return response.data;
  },

  /**
   * Получение списка оборудования с фильтрацией
   */
  getItems: async (filters?: Record<string, any>): Promise<WarehouseItem[]> => {
    const response = await api.warehouse.get("/items", { params: filters });
    return response.data.items;
  },

  /**
   * Обновление информации об оборудовании
   */
  updateItem: async (
    id: string,
    data: Partial<WarehouseItem>
  ): Promise<WarehouseItem> => {
    const response = await api.warehouse.put(`/items/${id}`, data);
    return response.data;
  },

  /**
   * Удаление оборудования со склада
   */
  deleteItem: async (id: string): Promise<void> => {
    await api.warehouse.delete(`/items/${id}`);
  },

  /**
   * Создание новой транзакции (приход/расход)
   */
  createTransaction: async (
    data: CreateTransactionRequest
  ): Promise<InventoryTransaction> => {
    const response = await api.warehouse.post("/transactions", data);
    return response.data;
  },

  /**
   * Получение списка транзакций с фильтрацией
   */
  getTransactions: async (
    filters?: Record<string, any>
  ): Promise<InventoryTransaction[]> => {
    const response = await api.warehouse.get("/transactions", {
      params: filters,
    });
    return response.data.transactions;
  },

  /**
   * Получение истории транзакций для оборудования
   */
  getItemTransactions: async (
    itemId: string
  ): Promise<InventoryTransaction[]> => {
    const response = await api.warehouse.get(`/transactions/item/${itemId}`);
    return response.data.transactions;
  },

  /**
   * Проверка работоспособности сервиса с расширенной информацией
   */
  ping: async (): Promise<{
    status: string;
    service: string;
    version: string;
    time: string;
    uptime?: {
      seconds: number;
      formatted: string;
    };
    system?: {
      platform: string;
      goVersion: string;
      memory: {
        free: string;
        total: string;
      };
      execPath?: string;
    };
    database?: {
      connected: boolean;
      readyState: string;
    };
    rabbitMQ?: {
      connected: boolean;
    };
  }> => {
    const response = await api.warehouse.get("/ping");
    return response.data;
  },
};
