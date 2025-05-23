"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  Text,
  LoadingOverlay,
  Badge,
  Card,
  Title,
  Group,
  Button,
  Select,
  Tooltip,
  Skeleton,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { trackingApi } from "@/api/tracking";
import { Operation } from "@/types/tracking";
import { useUserFullName } from "@/hooks/useUserInfo";

// Компонент для отображения имени пользователя
const UserNameDisplay = ({ userId }: { userId: string | null | undefined }) => {
  const { fullName, loading } = useUserFullName(userId);

  if (loading) {
    return <Skeleton height={20} width={100} />;
  }

  return (
    <Tooltip label={userId || "Склад"} disabled={!userId}>
      <Text>{fullName}</Text>
    </Tooltip>
  );
};

export default function RecentOperations() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState<string | null>("30");

  const fetchOperations = useCallback(async () => {
    try {
      setLoading(true);
      const limitValue = limit ? parseInt(limit) : 30;
      const data = await trackingApi.getRecentOperations(limitValue);
      setOperations(data);
    } catch (error) {
      console.error("Error fetching recent operations:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось загрузить недавние операции",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  return (
    <Card withBorder p="md" pos="relative">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

      <Group justify="space-between" mb="md">
        <Title order={4}>Недавние операции с оборудованием</Title>
        <Group>
          <Select
            label="Количество операций"
            value={limit}
            onChange={setLimit}
            data={[
              { value: "10", label: "10" },
              { value: "30", label: "30" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
            style={{ width: 100 }}
          />
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={fetchOperations}
            variant="outline"
            size="xs"
          >
            Обновить
          </Button>
        </Group>
      </Group>

      {operations.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          Операции отсутствуют
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Дата</Table.Th>
              <Table.Th>Оборудование</Table.Th>
              <Table.Th>Серийный номер</Table.Th>
              <Table.Th>От кого</Table.Th>
              <Table.Th>Кому</Table.Th>
              <Table.Th>Причина</Table.Th>
              <Table.Th>Блокчейн</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {operations.map((operation) => {
              const date = new Date(operation.transfer_date);
              const formattedDate = date.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <Table.Tr key={operation.id}>
                  <Table.Td>{formattedDate}</Table.Td>
                  <Table.Td>{operation.equipment_name}</Table.Td>
                  <Table.Td>{operation.equipment_serial}</Table.Td>
                  <Table.Td>
                    <UserNameDisplay userId={operation.from_holder_id} />
                  </Table.Td>
                  <Table.Td>
                    <UserNameDisplay userId={operation.to_holder_id} />
                  </Table.Td>
                  <Table.Td>{operation.transfer_reason}</Table.Td>
                  <Table.Td>
                    {operation.blockchain_tx_id ? (
                      <Badge color="teal">Подтверждено</Badge>
                    ) : (
                      <Badge color="gray">Не записано</Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}
