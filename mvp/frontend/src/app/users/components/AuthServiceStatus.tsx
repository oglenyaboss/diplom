"use client";

import { useEffect, useState } from "react";
import { Card, Text, Group, Badge, Tooltip } from "@mantine/core";
import { IconServer } from "@tabler/icons-react";
import { authApi } from "@/api/auth";

export default function AuthServiceStatus() {
  const [status, setStatus] = useState<{
    status: string;
    service: string;
    time: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await authApi.ping();
        setStatus(response);
      } catch (err) {
        console.error("Ошибка при проверке статуса auth-service:", err);
        setError("Не удалось получить статус сервиса");
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();

    // Обновляем статус каждые 30 секунд
    const interval = setInterval(checkStatus, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (error) return "red";
    if (isLoading) return "gray";
    if (status?.status === "ok") return "green";
    return "orange";
  };

  const getStatusText = () => {
    if (error) return "Ошибка";
    if (isLoading) return "Проверка...";
    if (status?.status === "ok") return "Работает";
    return "Неизвестно";
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";

    try {
      const date = new Date(timeString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } catch {
      return timeString;
    }
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group mb="xs">
        <Group>
          <IconServer size={24} />
          <Text fw={500}>Сервис авторизации</Text>
        </Group>
        <Tooltip label={error || ""} disabled={!error}>
          <Badge color={getStatusColor()}>{getStatusText()}</Badge>
        </Tooltip>
      </Group>

      {status && (
        <Text size="sm" color="dimmed">
          Последняя проверка: {formatTime(status.time)}
        </Text>
      )}
    </Card>
  );
}
