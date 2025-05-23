"use client";

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
import { WarehouseItem } from "@/types/warehouse";

interface WarrantyExpirationsProps {
  items: WarehouseItem[];
  isLoading: boolean;
}

export default function WarrantyExpirations({
  items,
  isLoading,
}: WarrantyExpirationsProps) {
  // Calculate items with upcoming or expired warranty
  const warrantyItems = useMemo(() => {
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    return items
      .filter((item) => {
        // Only include items with warranty_expiry
        if (!item.warranty_expiry) return false;

        const warrantyDate = new Date(item.warranty_expiry);
        return warrantyDate <= oneMonthFromNow;
      })
      .sort((a, b) => {
        const dateA = new Date(a.warranty_expiry!);
        const dateB = new Date(b.warranty_expiry!);
        return dateA.getTime() - dateB.getTime();
      });
  }, [items]);

  // Get severity based on warranty expiration
  const getWarrantyStatus = (warrantyDate: Date) => {
    const now = new Date();

    if (warrantyDate < now) {
      return { color: "red", text: "Гарантия истекла" };
    }

    const daysUntilExpiry = Math.ceil(
      (warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 7) {
      return { color: "orange", text: "Истекает в течение недели" };
    }

    return { color: "yellow", text: "Истекает в течение месяца" };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU");
  };

  return (
    <Card withBorder p="md">
      <Title order={4} mb="md">
        Срок гарантии истекает
      </Title>

      {isLoading ? (
        <Skeleton height={200} />
      ) : warrantyItems.length > 0 ? (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Название</Table.Th>
              <Table.Th>Серийный номер</Table.Th>
              <Table.Th>Производитель</Table.Th>
              <Table.Th>Дата покупки</Table.Th>
              <Table.Th>Гарантия до</Table.Th>
              <Table.Th>Статус</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {warrantyItems.map((item) => {
              const warrantyDate = new Date(item.warranty_expiry!);
              const status = getWarrantyStatus(warrantyDate);

              return (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.name}</Table.Td>
                  <Table.Td>{item.serial_number}</Table.Td>
                  <Table.Td>{item.manufacturer}</Table.Td>
                  <Table.Td>{formatDate(item.purchase_date)}</Table.Td>
                  <Table.Td>{formatDate(item.warranty_expiry!)}</Table.Td>
                  <Table.Td>
                    <Badge color={status.color}>{status.text}</Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      ) : (
        <Group justify="center" p="xl">
          <Text c="dimmed">Нет оборудования с истекающей гарантией</Text>
        </Group>
      )}
    </Card>
  );
}
