import api from "@/utils/api";
import {
  Equipment,
  CreateEquipmentRequest,
  Transfer,
  TransferEquipmentRequest,
  Operation,
  BlockchainRegisterResponse,
  BlockchainHistoryResponse,
} from "@/types/tracking";

export const trackingApi = {
  /**
   * Регистрация нового оборудования для отслеживания
   */
  createEquipment: async (data: CreateEquipmentRequest): Promise<Equipment> => {
    const response = await api.tracking.post("/equipment", data);
    return response.data;
  },

  /**
   * Получение информации об оборудовании
   */
  getEquipment: async (id: string): Promise<Equipment> => {
    const response = await api.tracking.get(`/equipment/${id}`);
    return response.data;
  },

  /**
   * Получение списка оборудования с фильтрацией
   */
  getEquipmentList: async (
    filters?: Record<string, any>
  ): Promise<Equipment[]> => {
    const response = await api.tracking.get("/equipment", { params: filters });
    return response.data.items;
  },

  /**
   * Обновление информации об оборудовании
   */
  updateEquipment: async (
    id: string,
    data: Partial<Equipment>
  ): Promise<Equipment> => {
    const response = await api.tracking.put(`/equipment/${id}`, data);
    return response.data;
  },

  /**
   * Удаление оборудования из системы отслеживания
   */
  deleteEquipment: async (id: string): Promise<{ message: string }> => {
    const response = await api.tracking.delete(`/equipment/${id}`);
    return response.data;
  },

  /**
   * Передача оборудования от одного держателя к другому
   */
  transferEquipment: async (
    data: TransferEquipmentRequest
  ): Promise<Transfer> => {
    const response = await api.tracking.post("/transfer", data);
    return response.data;
  },

  /**
   * Получение истории передач оборудования
   */
  getTransferHistory: async (equipmentId: string): Promise<Transfer[]> => {
    const response = await api.tracking.get(`/transfer/history/${equipmentId}`);
    return response.data.history;
  },

  /**
   * Получение недавних операций с оборудованием
   */
  getRecentOperations: async (limit: number = 30): Promise<Operation[]> => {
    const response = await api.tracking.get("/operations/recent", {
      params: { limit },
    });
    return response.data.operations;
  },

  /**
   * Регистрация оборудования в блокчейн
   */
  registerInBlockchain: async (
    equipmentId: string
  ): Promise<BlockchainRegisterResponse> => {
    const response = await api.tracking.post("/blockchain/register", {
      equipment_id: equipmentId,
    });
    return response.data;
  },

  /**
   * Получение истории передач из блокчейна
   */
  getBlockchainHistory: async (
    equipmentId: string
  ): Promise<BlockchainHistoryResponse> => {
    const response = await api.tracking.get(
      `/blockchain/history/${equipmentId}`
    );
    return response.data;
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
      nodeVersion: string;
      memory: {
        free: string;
        total: string;
      };
    };
    blockchain?: {
      connected: boolean;
      network: string;
      chainId: number;
      contractAddress: string;
      nodeUrl: string;
    };
    database?: {
      connected: boolean;
      readyState: string;
    };
    rabbitMQ?: {
      connected: boolean;
    };
  }> => {
    const response = await api.tracking.get("/ping");
    return response.data;
  },
};
