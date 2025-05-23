"use client";

import React, { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import AuthGuard from "@/components/common/AuthGuard";
import { Button, Card, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconReload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { warehouseApi } from "@/api/warehouse";
import { WarehouseItem } from "@/types/warehouse";
import TotalValueCard from "../components/TotalValueCard";
import CategoryDistributionChart from "../components/CategoryDistributionChart";
import LowStockAlerts from "../components/LowStockAlerts";
import WarrantyExpirations from "../components/WarrantyExpirations";
import PurchaseHistoryChart from "../components/PurchaseHistoryChart";

export default function WarehouseAnalyticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await warehouseApi.getItems();

      // Убедимся, что мы устанавливаем массив элементов, а не весь ответ
      if (response && Array.isArray(response.items)) {
        setItems(response.items);
      } else if (Array.isArray(response)) {
        setItems(response);
      } else {
        // Если ни один из вариантов не подходит, используем пустой массив
        console.error("Unexpected API response format:", response);
        setItems([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching warehouse items:", err);
      setError("Не удалось загрузить данные. Пожалуйста, попробуйте еще раз.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBack = () => {
    router.push("/warehouse");
  };

  return (
    <AuthGuard>
      <AppShell>
        <Stack gap="lg">
          <Group justify="space-between">
            <Group>
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={handleBack}
              >
                Назад к складу
              </Button>
              <Title order={2}>Аналитика склада</Title>
            </Group>
            <Button
              leftSection={<IconReload size={16} />}
              onClick={fetchData}
              loading={isLoading}
            >
              Обновить данные
            </Button>
          </Group>

          {error ? (
            <Card withBorder p="md">
              <Text c="red">{error}</Text>
            </Card>
          ) : (
            <Grid>
              {/* Total Value Card */}
              <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                <TotalValueCard items={items} isLoading={isLoading} />
              </Grid.Col>

              {/* Low Stock Alerts */}
              <Grid.Col span={{ base: 12, md: 6, lg: 8 }}>
                <LowStockAlerts items={items} isLoading={isLoading} />
              </Grid.Col>

              {/* Category Distribution Chart */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <CategoryDistributionChart
                  items={items}
                  isLoading={isLoading}
                />
              </Grid.Col>

              {/* Purchase History Chart */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <PurchaseHistoryChart items={items} isLoading={isLoading} />
              </Grid.Col>

              {/* Warranty Expirations */}
              <Grid.Col span={12}>
                <WarrantyExpirations items={items} isLoading={isLoading} />
              </Grid.Col>
            </Grid>
          )}
        </Stack>
      </AppShell>
    </AuthGuard>
  );
}
