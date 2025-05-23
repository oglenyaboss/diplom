// filepath: /Users/dog/WebstormProjects/diplom/mvp/frontend/src/app/dashboard/page.tsx
"use client";

import AppShell from "@/components/layout/AppShell";
import {
  Card,
  Grid,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  rem,
  Table,
  RingProgress,
} from "@mantine/core";
import { IconPackage, IconBell } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { warehouseApi } from "@/api/warehouse";
import { trackingApi } from "@/api/tracking";
import { notificationApi } from "@/api/notification";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { EquipmentStatus, Equipment, Operation } from "@/types/tracking";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { formatDate } from "@/utils/formatters";

export default function DashboardPage() {
  const [warehouseStats, setWarehouseStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
  });
  const [trackingStats, setTrackingStats] = useState({
    totalEquipment: 0,
    activeTransfers: 0,
  });
  const [notificationStats, setNotificationStats] = useState({
    totalNotifications: 0,
    importantNotifications: 0,
  });
  const [transferStats, setTransferStats] = useState({
    weeklyTransfers: 0,
    monthlyTransfers: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
  });
  const [recentOperations, setRecentOperations] = useState<Operation[]>([]);
  const [expiringWarranty, setExpiringWarranty] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Получаем данные склада
        const items = await warehouseApi.getItems();
        const lowStockItems = items.filter(
          (item) => item.quantity <= item.min_quantity
        );

        // Получаем данные по оборудованию
        const equipment = await trackingApi.getEquipmentList();
        const activeEquipment = equipment.filter(
          (item) =>
            item.status === EquipmentStatus.ACTIVE &&
            item.current_holder_id !== null
        );

        // Получаем недавние операции
        try {
          // Получаем операции для отображения в интерфейсе (небольшое количество)
          const recentOps = await trackingApi.getRecentOperations(5);
          setRecentOperations(recentOps);

          // Получаем больше операций для корректного расчета статистики
          const statsOperations = await trackingApi.getRecentOperations(100);

          // Анализируем операции для подсчета статистики передач
          // Создаем даты для сравнения (неделя и месяц назад)
          const today = new Date();
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          const monthAgo = new Date();
          monthAgo.setDate(today.getDate() - 30);

          let weeklyCount = 0;
          let monthlyCount = 0;
          let pendingCount = 0;

          // Если у нас есть операции, проанализируем их
          if (statsOperations && statsOperations.length > 0) {
            // Считаем операции за неделю и месяц
            weeklyCount = statsOperations.filter((op) => {
              const opDate = new Date(op.transfer_date);
              return opDate >= weekAgo;
            }).length;

            monthlyCount = statsOperations.filter((op) => {
              const opDate = new Date(op.transfer_date);
              return opDate >= monthAgo;
            }).length;

            // Получаем количество ожидающих передач
            pendingCount = statsOperations.filter(
              (op) => !op.blockchain_tx_id
            ).length;
          }

          setTransferStats({
            weeklyTransfers: weeklyCount,
            monthlyTransfers: monthlyCount,
            pendingTransfers: pendingCount,
            completedTransfers: statsOperations.filter(
              (op) => op.blockchain_tx_id
            ).length,
          });
        } catch (error) {
          console.error("Error fetching recent operations:", error);
        }

        // Находим оборудование с истекающей гарантией (срок истекает в течение 30 дней)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const equipmentWithExpiringWarranty = equipment.filter((item) => {
          if (!item.warranty_expiry) return false;

          const warrantyDate = new Date(item.warranty_expiry);
          const now = new Date();

          return warrantyDate > now && warrantyDate <= thirtyDaysFromNow;
        });

        setExpiringWarranty(equipmentWithExpiringWarranty);

        // Получаем данные уведомлений, если есть авторизованный пользователь
        let notificationsData = {
          totalNotifications: 0,
          importantNotifications: 0,
        };

        if (user && user.id) {
          try {
            // Получаем все уведомления пользователя
            const userNotifications =
              await notificationApi.getUserNotifications(user.id);

            // Получаем количество непрочитанных уведомлений
            const unreadCount = await notificationApi.getUnreadCount(user.id);

            // Считаем количество важных уведомлений (низкий запас или заканчивается гарантия)
            const importantNotifications = userNotifications.filter(
              (n) =>
                (n.type === "low_stock" || n.type === "warranty_expiration") &&
                !n.is_read
            ).length;

            notificationsData = {
              totalNotifications: userNotifications.length,
              importantNotifications: importantNotifications,
            };
          } catch (error) {
            console.error("Error fetching notifications:", error);
            // Если произошла ошибка при получении уведомлений, не прерываем загрузку дашборда
          }
        }

        setWarehouseStats({
          totalItems: items.length,
          lowStockItems: lowStockItems.length,
        });

        setTrackingStats({
          totalEquipment: equipment.length,
          activeTransfers: activeEquipment.length,
        });

        // Устанавливаем данные уведомлений
        setNotificationStats(notificationsData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <AuthGuard>
      {isLoading ? (
        <LoadingOverlay message="Загрузка данных..." />
      ) : (
        <AppShell>
          <Stack gap="lg">
            <Title order={1}>Панель управления</Title>

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder p="lg" radius="md" className="h-full">
                  <Group gap="xs">
                    <Title order={3}>Склад</Title>
                  </Group>
                  <Text size="xl" fw={700} mt="md">
                    {warehouseStats.totalItems}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Единиц оборудования
                  </Text>
                  <Badge color="red" mt="xs" variant="light" size="sm">
                    {warehouseStats.lowStockItems} с низким запасом
                  </Badge>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder p="lg" radius="md" className="h-full">
                  <Group gap="xs">
                    <IconPackage
                      style={{ width: rem(30), height: rem(30) }}
                      color="green"
                    />
                    <Title order={3}>Отслеживание</Title>
                  </Group>
                  <Text size="xl" fw={700} mt="md">
                    {trackingStats.totalEquipment}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Отслеживаемого оборудования
                  </Text>
                  <Badge color="blue" mt="xs" variant="light" size="sm">
                    {trackingStats.activeTransfers} в использовании
                  </Badge>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder p="lg" radius="md" className="h-full">
                  <Group gap="xs">
                    <Title order={3}>Передачи</Title>
                  </Group>
                  <Text size="xl" fw={700} mt="md">
                    {transferStats.weeklyTransfers || "-"}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Передач за неделю
                  </Text>
                  <Badge color="green" mt="xs" variant="light" size="sm">
                    {transferStats.monthlyTransfers || "-"} за месяц
                  </Badge>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Card withBorder p="lg" radius="md" className="h-full">
                  <Group gap="xs">
                    <IconBell
                      style={{ width: rem(30), height: rem(30) }}
                      color="red"
                    />
                    <Title order={3}>Уведомления</Title>
                  </Group>
                  <Text size="xl" fw={700} mt="md">
                    {notificationStats.totalNotifications || "-"}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Новых уведомлений
                  </Text>
                  <Badge color="orange" mt="xs" variant="light" size="sm">
                    {notificationStats.importantNotifications || "-"} требуют
                    внимания
                  </Badge>
                </Card>
              </Grid.Col>
            </Grid>

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 12, md: 6 }}>
                <Card withBorder p="lg" radius="md">
                  <Title order={3} mb="md">
                    Статистика передач
                  </Title>
                  <Group>
                    <div style={{ flex: 1 }}>
                      <Card withBorder p="md" radius="md">
                        <Title order={4} mb="xs">
                          Завершенные vs. ожидающие
                        </Title>
                        <Group>
                          <RingProgress
                            size={120}
                            thickness={12}
                            sections={[
                              {
                                value: transferStats.pendingTransfers
                                  ? (transferStats.pendingTransfers * 100) /
                                    (transferStats.pendingTransfers +
                                      transferStats.completedTransfers)
                                  : 0,
                                color: "orange",
                              },
                              {
                                value: transferStats.completedTransfers
                                  ? (transferStats.completedTransfers * 100) /
                                    (transferStats.pendingTransfers +
                                      transferStats.completedTransfers)
                                  : 0,
                                color: "green",
                              },
                            ]}
                            label={
                              <Text fw={700} ta="center" size="lg">
                                {transferStats.pendingTransfers +
                                  transferStats.completedTransfers}
                              </Text>
                            }
                          />
                          <div>
                            <Group>
                              <Badge color="green" size="lg" variant="filled">
                                {transferStats.completedTransfers} завершено
                              </Badge>
                            </Group>
                            <Group mt="xs">
                              <Badge color="orange" size="lg" variant="filled">
                                {transferStats.pendingTransfers} в процессе
                              </Badge>
                            </Group>
                          </div>
                        </Group>
                      </Card>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Card withBorder p="md" radius="md">
                        <Title order={4} mb="xs">
                          Статистика за период
                        </Title>
                        <Stack>
                          <Group>
                            <Text fw={500}>За последнюю неделю:</Text>
                            <Badge color="blue" size="lg">
                              {transferStats.weeklyTransfers} передач
                            </Badge>
                          </Group>
                          <Group>
                            <Text fw={500}>За последний месяц:</Text>
                            <Badge color="blue" size="lg">
                              {transferStats.monthlyTransfers} передач
                            </Badge>
                          </Group>
                        </Stack>
                      </Card>
                    </div>
                  </Group>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 12, md: 6 }}>
                <Card withBorder p="lg" radius="md">
                  <Title order={3} mb="md">
                    Оборудование с истекающей гарантией
                  </Title>
                  {expiringWarranty.length > 0 ? (
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Название</Table.Th>
                          <Table.Th>Серийный номер</Table.Th>
                          <Table.Th>Дата окончания</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {expiringWarranty.map((equipment) => (
                          <Table.Tr key={equipment.id}>
                            <Table.Td>{equipment.name}</Table.Td>
                            <Table.Td>{equipment.serial_number}</Table.Td>
                            <Table.Td>
                              {formatDate(equipment.warranty_expiry || "", {
                                format: "short",
                              })}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Text c="dimmed">
                      Нет оборудования с истекающей гарантией
                    </Text>
                  )}
                </Card>
              </Grid.Col>
            </Grid>

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 12 }}>
                <Card withBorder p="lg" radius="md">
                  <Title order={3} mb="md">
                    Последние транзакции
                  </Title>
                  {recentOperations.length > 0 ? (
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Оборудование</Table.Th>
                          <Table.Th>Дата</Table.Th>
                          <Table.Th>Тип</Table.Th>
                          <Table.Th>Получатель</Table.Th>
                          <Table.Th>Статус</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {recentOperations.map((operation) => (
                          <Table.Tr key={operation.id}>
                            <Table.Td>
                              {operation.equipment_name}
                              <Text size="xs" c="dimmed">
                                S/N: {operation.equipment_serial}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {formatDate(operation.transfer_date, {
                                format: "full",
                              })}
                            </Table.Td>
                            <Table.Td>
                              <Badge color="blue">
                                {operation.from_holder_id
                                  ? "Передача"
                                  : "Выдача"}
                              </Badge>
                            </Table.Td>
                            <Table.Td>ID: {operation.to_holder_id}</Table.Td>
                            <Table.Td>
                              <Badge
                                color={
                                  operation.blockchain_tx_id
                                    ? "green"
                                    : "orange"
                                }
                              >
                                {operation.blockchain_tx_id
                                  ? "Подтверждено"
                                  : "В процессе"}
                              </Badge>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Text c="dimmed">Нет недавних операций</Text>
                  )}
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </AppShell>
      )}
    </AuthGuard>
  );
}
