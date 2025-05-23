import React, { useMemo } from "react";
import {
  Badge,
  Card,
  Group,
  Skeleton,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { WarehouseItem, WarehouseItemStatus } from "@/types/warehouse";

interface LowStockAlertsProps {
  items: WarehouseItem[];
  isLoading: boolean;
}

export default function LowStockAlerts({
  items,
  isLoading,
}: LowStockAlertsProps) {
  // Find items with quantity below or equal to min_quantity
  const lowStockItems = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.quantity <= item.min_quantity &&
          item.status === WarehouseItemStatus.AVAILABLE
      )
      .sort(
        (a, b) => a.quantity / a.min_quantity - b.quantity / b.min_quantity
      );
  }, [items]);

  // Get severity based on stock level
  const getSeverity = (item: WarehouseItem) => {
    const ratio = item.quantity / item.min_quantity;
    if (ratio === 0) return "red"; // Out of stock
    if (ratio <= 0.5) return "orange"; // Critical
    return "yellow"; // Warning
  };

  return (
    <Card withBorder p="md" h="100%">
      <Title order={4} mb="md">
        Оповещения о низком запасе
      </Title>

      {isLoading ? (
        <Skeleton height={200} />
      ) : lowStockItems.length > 0 ? (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Название</Table.Th>
              <Table.Th>Категория</Table.Th>
              <Table.Th>Запас</Table.Th>
              <Table.Th>Требуемый минимум</Table.Th>
              <Table.Th>Статус</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lowStockItems.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>{item.category}</Table.Td>
                <Table.Td>{item.quantity}</Table.Td>
                <Table.Td>{item.min_quantity}</Table.Td>
                <Table.Td>
                  <Badge color={getSeverity(item)}>
                    {item.quantity === 0
                      ? "Нет в наличии"
                      : item.quantity <= item.min_quantity / 2
                      ? "Критический запас"
                      : "Низкий запас"}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Group justify="center" p="xl">
          <Text c="dimmed">Нет оповещений о низком запасе</Text>
        </Group>
      )}
    </Card>
  );
}
