"use client";

import { useEffect, useState } from "react";
import { Card, Text, Group, Badge, Tooltip, Grid } from "@mantine/core";
import { warehouseApi } from "@/api/warehouse";
import {
  IconDatabase,
  IconServer,
  IconMessageCircle2,
  IconClockHour4,
} from "@tabler/icons-react";

// Type for warehouse service status
type ServiceStatusType = {
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
};

export default function WarehouseServiceStatus() {
  const [status, setStatus] = useState<ServiceStatusType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await warehouseApi.ping();
        setStatus(response);
        setError(null);
      } catch (err) {
        console.error("Error checking warehouse service:", err);
        setError("Не удалось подключиться к сервису склада");
        setStatus(null);
      } finally {
        setLastChecked(new Date());
      }
    };

    checkStatus();

    // Check status every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Card withBorder p="sm" radius="md" bg="red.1">
        <Group>
          <Text size="sm" fw={500} c="red.8">
            {error}
          </Text>
          <Badge color="red">Недоступен</Badge>
        </Group>
        {lastChecked && (
          <Text size="xs" c="gray.6" mt={5}>
            Последняя проверка: {lastChecked.toLocaleTimeString()}
          </Text>
        )}
      </Card>
    );
  }

  if (!status) {
    return (
      <Card withBorder p="sm" radius="md" bg="gray.1">
        <Group>
          <Text size="sm" fw={500} c="gray.7">
            Проверка статуса сервиса склада...
          </Text>
          <Badge color="gray">Проверка</Badge>
        </Group>
      </Card>
    );
  }

  return (
    <Card withBorder p="md" radius="md" bg="green.0">
      <Card.Section bg="green.1" p="sm">
        <Group justify="space-between">
          <Group>
            <IconServer size={18} color="var(--mantine-color-green-7)" />
            <Text size="sm" fw={600} c="green.8">
              Сервис склада: {status.service} v{status.version}
            </Text>
          </Group>
          <Tooltip
            label={`Время сервера: ${new Date(status.time).toLocaleString()}`}
          >
            <Badge color="green" size="md">
              Работает
            </Badge>
          </Tooltip>
        </Group>
      </Card.Section>

      <Card.Section p="sm">
        <Grid>
          {/* Информация о базе данных */}
          {status.database && (
            <Grid.Col span={6}>
              <Group align="flex-start" mt={8} wrap="nowrap">
                <IconDatabase
                  size={18}
                  color={
                    status.database.connected
                      ? "var(--mantine-color-green-7)"
                      : "var(--mantine-color-red-7)"
                  }
                />
                <div>
                  <Group gap={5}>
                    <Text size="xs" fw={600}>
                      База данных:
                    </Text>
                    <Badge
                      size="xs"
                      color={status.database.connected ? "green" : "red"}
                    >
                      {status.database.connected ? "Подключена" : "Отключена"}
                    </Badge>
                  </Group>
                  {status.database.connected && (
                    <Text size="xs">Статус: {status.database.readyState}</Text>
                  )}
                </div>
              </Group>
            </Grid.Col>
          )}

          {/* Информация о RabbitMQ */}
          {status.rabbitMQ && (
            <Grid.Col span={6}>
              <Group align="flex-start" mt={8} wrap="nowrap">
                <IconMessageCircle2
                  size={18}
                  color={
                    status.rabbitMQ.connected
                      ? "var(--mantine-color-green-7)"
                      : "var(--mantine-color-red-7)"
                  }
                />
                <div>
                  <Group gap={5}>
                    <Text size="xs" fw={600}>
                      RabbitMQ:
                    </Text>
                    <Badge
                      size="xs"
                      color={status.rabbitMQ.connected ? "green" : "red"}
                    >
                      {status.rabbitMQ.connected ? "Подключен" : "Отключен"}
                    </Badge>
                  </Group>
                </div>
              </Group>
            </Grid.Col>
          )}

          {/* Информация о времени работы */}
          {status.uptime && (
            <Grid.Col span={6}>
              <Group align="flex-start" mt={8} wrap="nowrap">
                <IconClockHour4 size={18} color="var(--mantine-color-blue-7)" />
                <div>
                  <Text size="xs" fw={600}>
                    Время работы:
                  </Text>
                  <Text size="xs">{status.uptime.formatted}</Text>
                </div>
              </Group>
            </Grid.Col>
          )}

          {/* Информация о системе */}
          {status.system && (
            <Grid.Col span={6}>
              <Group align="flex-start" mt={8} wrap="nowrap">
                <IconServer size={18} color="var(--mantine-color-blue-7)" />
                <div>
                  <Text size="xs" fw={600}>
                    Система:
                  </Text>
                  <Text size="xs">
                    Платформа: {status.system.platform}
                    {status.system.goVersion && (
                      <>
                        <br />
                        Go: {status.system.goVersion}
                      </>
                    )}
                    {status.system.memory && (
                      <>
                        <br />
                        Память: {status.system.memory.free} /{" "}
                        {status.system.memory.total}
                      </>
                    )}
                  </Text>
                </div>
              </Group>
            </Grid.Col>
          )}
        </Grid>
      </Card.Section>

      {lastChecked && (
        <Text size="xs" c="gray.6" mt={5} ta="right">
          Последняя проверка: {lastChecked.toLocaleTimeString()}
        </Text>
      )}
    </Card>
  );
}
