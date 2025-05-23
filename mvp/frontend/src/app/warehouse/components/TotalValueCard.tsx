import React from "react";
import { Card, Skeleton, Text, Title } from "@mantine/core";
import { WarehouseItem } from "@/types/warehouse";

interface TotalValueCardProps {
  items: WarehouseItem[];
  isLoading: boolean;
}

export default function TotalValueCard({
  items,
  isLoading,
}: TotalValueCardProps) {
  // Calculate total inventory value
  const totalValue = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  // Format as currency
  const formattedValue = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(totalValue);

  return (
    <Card withBorder p="md" h="100%">
      <Title order={4} mb="md">
        Общая стоимость склада
      </Title>
      {isLoading ? (
        <Skeleton height={40} width="70%" />
      ) : (
        <Text size="xl" fw={700}>
          {formattedValue}
        </Text>
      )}
      {isLoading ? (
        <Skeleton height={16} width="100%" mt="md" />
      ) : (
        <Text size="sm" mt="md" c="dimmed">
          Всего позиций: {items.length}
        </Text>
      )}
    </Card>
  );
}
