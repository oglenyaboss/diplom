import api from "@/utils/api";
import {
  MovementReport,
  CreateReportRequest,
  ReportType,
  ReportStatus,
} from "@/types/reports";
import { Operation } from "@/types/tracking";

export const reportsApi = {
  /**
   * Создание нового отчета о передвижениях
   */
  createReport: async (data: CreateReportRequest): Promise<MovementReport> => {
    // Ensure createdBy.id is a non-empty string and exists
    if (!data.createdBy?.id) {
      throw new Error('User ID is required');
    }
    
    // Преобразуем даты в формат строки, если они являются объектами Date
    const requestData = {
      ...data,
      startDate:
        data.startDate instanceof Date
          ? data.startDate.toISOString()
          : data.startDate,
      endDate:
        data.endDate instanceof Date
          ? data.endDate.toISOString()
          : data.endDate,
      createdBy: {
        id: data.createdBy.id
      }
    };

    const response = await api.tracking.post("/reports", requestData);

    // Преобразуем даты из строк в объекты Date
    const report = response.data;
    return {
      ...report,
      startDate: new Date(report.startDate),
      endDate: new Date(report.endDate),
      createdAt: new Date(report.createdAt),
      transfers: report.transfers.map((transfer: any) => ({
        ...transfer,
        transferDate: new Date(transfer.transferDate),
      })),
    };
  },

  /**
   * Получение отчета по ID
   */
  getReport: async (id: string): Promise<MovementReport> => {
    const response = await api.tracking.get(`/reports/${id}`);
    const report = response.data;

    // Преобразуем даты из строк в объекты Date
    return {
      ...report,
      startDate: new Date(report.startDate),
      endDate: new Date(report.endDate),
      createdAt: new Date(report.createdAt),
      transfers: report.transfers.map((transfer: any) => ({
        ...transfer,
        transferDate: new Date(transfer.transferDate),
      })),
    };
  },

  /**
   * Получение списка отчетов с фильтрацией по типу
   */
  getReports: async (type?: ReportType): Promise<MovementReport[]> => {
    const params = type ? { type } : {};
    const response = await api.tracking.get("/reports", { params });

    // Преобразуем даты из строк в объекты Date для каждого отчета
    return response.data.map((report: any) => ({
      ...report,
      startDate: new Date(report.startDate),
      endDate: new Date(report.endDate),
      createdAt: new Date(report.createdAt),
    }));
  },

  /**
   * Получение операций для отчета (вспомогательный метод)
   */
  getRecentOperationsForReport: async (
    startDate: Date,
    endDate: Date,
    equipmentId?: string
  ): Promise<Operation[]> => {
    try {
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      // Здесь используем API для получения операций с фильтрацией
      // В идеале backend должен предоставить специальный метод для этого
      const params: any = {
        startDate: startDateStr,
        endDate: endDateStr,
        limit: 100, // увеличиваем лимит для отчетов
      };

      if (equipmentId) {
        params.equipmentId = equipmentId;
      }

      const response = await api.tracking.get("/operations/recent", { params });
      return response.data.operations;
    } catch (error) {
      console.error("Error fetching operations:", error);
      return [];
    }
  },

  /**
   * Удаление отчета
   */
  deleteReport: async (id: string): Promise<{ message: string }> => {
    const response = await api.tracking.delete(`/reports/${id}`);
    return response.data;
  },
};
