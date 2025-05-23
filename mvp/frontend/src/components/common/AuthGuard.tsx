"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({
  children,
  allowedRoles = [],
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, token, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [hasAuth, setHasAuth] = useState(false);

  useEffect(() => {
    // Проверяем аутентификацию в Redux store
    if (isAuthenticated && token) {
      // Если нет требований к ролям или роль пользователя соответствует требованиям
      if (
        allowedRoles.length === 0 ||
        (user && allowedRoles.includes(user.role))
      ) {
        setHasAuth(true);
      } else {
        // У пользователя нет нужной роли, перенаправляем на дашборд
        router.push("/dashboard");
      }
      setHasCheckedAuth(true);
      return;
    }

    // Если нет в store, проверяем localStorage
    const storedToken = localStorage.getItem("token");
    const storedRefreshToken = localStorage.getItem("refreshToken");

    if (storedToken && storedRefreshToken) {
      // Если есть токены в localStorage, считаем что аутентификация актуальна
      // Полное восстановление состояния произойдёт в AuthProvider
      setHasAuth(true);
    } else {
      // Если ни в store, ни в localStorage нет, перенаправляем на страницу входа
      router.push("/login");
    }

    setHasCheckedAuth(true);
  }, [isAuthenticated, token, router]);

  // Пока проверяем аутентификацию, ничего не отображаем
  if (!hasCheckedAuth) {
    return null;
  }

  // Если есть аутентификация, отображаем дочерние компоненты
  if (hasAuth) {
    return <>{children}</>;
  }

  // Иначе ничего не отображаем (ждем редиректа)
  return null;
}
