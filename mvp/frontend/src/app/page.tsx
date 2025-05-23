"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Center, Loader, Text, Stack } from "@mantine/core";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, token } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    // Небольшая задержка для проверки состояния аутентификации
    const redirectTimer = setTimeout(() => {
      if (isAuthenticated || token) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }, 500);

    return () => clearTimeout(redirectTimer);
  }, [isAuthenticated, token, router]);

  return (
    <Center mih="100vh">
      <Stack align="center">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Загрузка системы...
        </Text>
      </Stack>
    </Center>
  );
}
