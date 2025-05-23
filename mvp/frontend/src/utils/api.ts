import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { store } from "@/store";
import { logout, updateToken, updateUser } from "@/store/authSlice";

// Базовые URL для сервисов (используем относительные пути с прокси через Next.js)
const API_URLS = {
  auth: "/api/auth",
  warehouse: "/api/warehouse",
  tracking: "/api/tracking",
  notification: "/api/notification",
};

// Создаем экземпляры axios для каждого сервиса
export const authApi = axios.create({
  baseURL: API_URLS.auth,
  headers: {
    "Content-Type": "application/json",
  },
});

export const warehouseApi = axios.create({
  baseURL: API_URLS.warehouse,
  headers: {
    "Content-Type": "application/json",
  },
});

export const trackingApi = axios.create({
  baseURL: API_URLS.tracking,
  headers: {
    "Content-Type": "application/json",
  },
});

export const notificationApi = axios.create({
  baseURL: API_URLS.notification,
  headers: {
    "Content-Type": "application/json",
  },
});

// Функция для получения токена из стора
const getToken = () => {
  const state = store.getState();
  return state.auth.token;
};

// Функция для обновления токена
const refreshToken = async () => {
  try {
    // Проверяем, доступен ли localStorage (только на клиенте)
    if (typeof window === "undefined") {
      return Promise.reject("Cannot refresh token on server side");
    }

    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return Promise.reject("No refresh token available");
    }

    const response = await authApi.post("/refresh", {
      refresh_token: refreshToken,
    }, {
      // Не используем интерцептор для запроса обновления токена,
      // чтобы избежать бесконечной рекурсии
      headers: {}
    });
    const { token } = response.data;
    store.dispatch(updateToken(token));

    // После успешного обновления токена, обновляем профиль пользователя
    try {
      const userResponse = await authApi.get("/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      store.dispatch(updateUser(userResponse.data));
      localStorage.setItem("user", JSON.stringify(userResponse.data));
    } catch (profileError) {
      console.error("Ошибка при обновлении профиля:", profileError);
      // Если не удалось обновить профиль, все равно продолжаем
      // т.к. токен успешно обновлен
    }

    return token;
  } catch (error) {
    console.error("Ошибка при обновлении токена:", error);
    store.dispatch(logout());
    return Promise.reject("Failed to refresh token");
  }
};

// Добавляем интерцептор запросов для всех API
[authApi, warehouseApi, trackingApi, notificationApi].forEach((api) => {
  api.interceptors.request.use(
    (config) => {
      // Не добавляем токен для запросов login и refresh в auth API
      if (api === authApi && 
          (config.url === '/login' || config.url === '/refresh')) {
        return config;
      }
      
      // Получаем токен из Redux store
      const token = getToken();
      
      // Если токен в сторе отсутствует, проверяем localStorage (для случаев перезагрузки страницы)
      if (!token && typeof window !== 'undefined') {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          config.headers.Authorization = `Bearer ${localToken}`;
          return config;
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    },
    (error) => Promise.reject(error)
  );
});

// Добавляем интерцептор ответов для обработки ошибок авторизации
[authApi, warehouseApi, trackingApi, notificationApi].forEach((api) => {
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & {
        _retry?: boolean;
      };
      if (!originalRequest) return Promise.reject(error);

      // Если ошибка 401 и запрос еще не повторялся
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Не пытаемся обновить токен для запросов login и refresh
        if (api === authApi && 
            (originalRequest.url === '/login' || originalRequest.url === '/refresh')) {
          return Promise.reject(error);
        }
        
        originalRequest._retry = true;
        try {
          console.log("Attempting token refresh for 401 error");
          const newToken = await refreshToken();
          
          // Обновляем заголовок Authorization для повторного запроса
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          } else {
            originalRequest.headers = { Authorization: `Bearer ${newToken}` };
          }
          
          // Повторяем запрос с новым токеном
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
});

export default {
  auth: authApi,
  warehouse: warehouseApi,
  tracking: trackingApi,
  notification: notificationApi,
};
