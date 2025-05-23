import api from "@/utils/api";
import { LoginRequest, LoginResponse, SignupRequest, User } from "@/types/user";

export const authApi = {
  /**
   * Вход в систему
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.auth.post("/login", data);
    return response.data;
  },

  /**
   * Регистрация
   */
  signup: async (
    data: SignupRequest
  ): Promise<{ message: string; user: User }> => {
    const response = await api.auth.post("/signup", data);
    return response.data;
  },

  /**
   * Обновление токена
   */
  refreshToken: async (
    refreshToken: string
  ): Promise<{
    token: string;
    refresh_token: string;
    expires_in: number;
    id: string;
    username: string;
    role: string;
  }> => {
    const response = await api.auth.post("/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Получение профиля текущего пользователя
   */
  getProfile: async (): Promise<User> => {
    const response = await api.auth.get("/profile");
    return response.data;
  },

  /**
   * Обновление профиля
   */
  updateProfile: async (data: Partial<User>): Promise<{ message: string }> => {
    const response = await api.auth.put("/profile", data);
    return response.data;
  },

  /**
   * Получение списка пользователей (только для админов)
   */
  getUsers: async (): Promise<{ users: User[] }> => {
    const response = await api.auth.get("/users");
    return response.data;
  },

  /**
   * Получение информации о пользователе
   */
  getUser: async (id: string): Promise<User> => {
    const response = await api.auth.get(`/users/${id}`);
    return response.data;
  },

  /**
   * Изменение роли пользователя (только для админов)
   */
  updateUserRole: async (
    id: string,
    role: string
  ): Promise<{ message: string }> => {
    const response = await api.auth.put(`/users/${id}/role`, { role });
    return response.data;
  },

  /**
   * Изменение статуса пользователя (только для админов)
   */
  updateUserStatus: async (
    id: string,
    is_active: boolean
  ): Promise<{ message: string }> => {
    const response = await api.auth.put(`/users/${id}/status`, { is_active });
    return response.data;
  },

  /**
   * Создание нового пользователя (только для админов)
   */
  createUser: async (
    data: SignupRequest
  ): Promise<{ message: string; user: User }> => {
    const response = await api.auth.post("/users", data);
    return response.data;
  },

  /**
   * Установка Ethereum адреса пользователя
   */
  setEthAddress: async (
    userId: string,
    eth_address: string
  ): Promise<{ message: string }> => {
    const response = await api.auth.put(`/users/${userId}/eth-address`, {
      eth_address,
    });
    return response.data;
  },

  /**
   * Получение Ethereum адреса пользователя
   */
  getEthAddress: async (userId: string): Promise<{ eth_address: string }> => {
    const response = await api.auth.get(`/eth-address/${userId}`);
    return response.data;
  },

  /**
   * Проверка статуса сервиса авторизации
   */
  ping: async (): Promise<{
    status: string;
    service: string;
    time: string;
  }> => {
    const response = await api.auth.get(`/ping`);
    return response.data;
  },
};
