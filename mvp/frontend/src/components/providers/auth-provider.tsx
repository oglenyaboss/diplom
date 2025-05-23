"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess, updateUser } from "@/store/authSlice";
import { authApi } from "@/api/auth";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();

  useEffect(() => {
    const restoreAuth = async () => {
      // Восстанавливаем состояние аутентификации из localStorage только на клиенте
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refreshToken");
      
      // Попытка восстановить пользователя из localStorage для мгновенного отображения данных
      const savedUserJSON = localStorage.getItem("user");
      const savedUser = savedUserJSON ? JSON.parse(savedUserJSON) : null;
      
      if (token && refreshToken) {
        try {
          // Восстанавливаем базовую информацию о сессии
          dispatch(
            loginSuccess({
              token,
              refresh_token: refreshToken,
              expires_in: 0, // Не важно при восстановлении
              id: savedUser?.id || "", // Используем данные из localStorage, если есть
              username: savedUser?.username || "", // Используем данные из localStorage, если есть
              role: savedUser?.role || "", // Используем данные из localStorage, если есть
            })
          );
          
          // Если есть сохраненные данные пользователя, сразу их используем
          if (savedUser) {
            dispatch(updateUser(savedUser));
          }

          // Затем получаем актуальный профиль пользователя с сервера
          try {
            const userProfile = await authApi.getProfile();
            dispatch(updateUser(userProfile));
            // Сохраняем полный профиль в localStorage
            localStorage.setItem("user", JSON.stringify(userProfile));
          } catch (profileError) {
            console.error("Ошибка при загрузке профиля:", profileError);
            // Если не удалось загрузить профиль, не разлогиниваем пользователя,
            // т.к. токен может быть еще валидным, и у нас есть данные из localStorage
          }
        } catch (error) {
          console.error("Ошибка при восстановлении аутентификации:", error);
          // В случае ошибки очищаем localStorage
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
        }
      }
    };

    restoreAuth();
  }, [dispatch]);

  return <>{children}</>;
}
