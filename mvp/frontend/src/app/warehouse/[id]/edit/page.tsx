"use client";

import React, { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Button,
  Card,
  Flex,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react";
import { warehouseApi } from "@/api/warehouse";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { useRouter } from "next/navigation";
import { WarehouseItem, WarehouseItemStatus } from "@/types/warehouse";
import { isNotEmpty, useForm } from "@mantine/form";

interface WarehouseItemEditPageProps {
  params: {
    id: string;
  };
}

export default function WarehouseItemEditPage({
  params,
}: WarehouseItemEditPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const resolvedParams = React.use(params);
  const itemId = resolvedParams.id;

  // Form definition
  const form = useForm({
    initialValues: {
      name: "",
      serial_number: "",
      category: "",
      description: "",
      manufacturer: "",
      quantity: 0,
      min_quantity: 0,
      price: 0,
      location: "",
      purchase_date: new Date(),
      warranty_expiry: null as Date | null,
      status: WarehouseItemStatus.AVAILABLE,
    },
    validate: {
      name: isNotEmpty("Название обязательно для заполнения"),
      serial_number: isNotEmpty("Серийный номер обязателен для заполнения"),
      category: isNotEmpty("Категория обязательна для заполнения"),
      manufacturer: isNotEmpty("Производитель обязателен для заполнения"),
      location: isNotEmpty("Местоположение обязательно для заполнения"),
    },
  });

  useEffect(() => {
    fetchItemData();
  }, [itemId]);

  const fetchItemData = async () => {
    try {
      setIsLoading(true);

      // Fetch item details
      const item = await warehouseApi.getItem(itemId);

      // Set form values
      form.setValues({
        name: item.name,
        serial_number: item.serial_number,
        category: item.category,
        description: item.description || "",
        manufacturer: item.manufacturer,
        quantity: item.quantity,
        min_quantity: item.min_quantity,
        location: item.location,
        purchase_date: new Date(item.purchase_date),
        warranty_expiry: item.warranty_expiry
          ? new Date(item.warranty_expiry)
          : null,
        status: item.status,
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching item data:", error);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setIsSaving(true);

      // Format dates back to strings
      const updateData: Partial<WarehouseItem> = {
        ...values,
        purchase_date: values.purchase_date.toISOString(),
        warranty_expiry: values.warranty_expiry?.toISOString() || undefined,
      };

      // Update the item
      await warehouseApi.updateItem(itemId, updateData);

      // Navigate back to item view
      router.push(`/warehouse/${itemId}`);
    } catch (error) {
      console.error("Error updating item:", error);
      alert(
        "Не удалось обновить данные элемента. Пожалуйста, попробуйте еще раз."
      );
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/warehouse/${itemId}`);
  };

  return (
    <AuthGuard>
      {isLoading ? (
        <LoadingOverlay message="Загрузка данных..." />
      ) : (
        <AppShell>
          <Stack gap="lg">
            <Flex justify="space-between" align="center">
              <Group>
                <Button
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleCancel}
                >
                  Назад
                </Button>
                <Title order={2}>Редактирование оборудования</Title>
              </Group>
            </Flex>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Card withBorder p="md">
                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Название"
                      placeholder="Введите название оборудования"
                      required
                      {...form.getInputProps("name")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Серийный номер"
                      placeholder="Введите серийный номер"
                      required
                      {...form.getInputProps("serial_number")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Категория"
                      placeholder="Введите категорию оборудования"
                      required
                      {...form.getInputProps("category")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Производитель"
                      placeholder="Введите производителя"
                      required
                      {...form.getInputProps("manufacturer")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <NumberInput
                      label="Количество"
                      placeholder="Введите текущее количество"
                      min={0}
                      required
                      {...form.getInputProps("quantity")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    {" "}
                    <NumberInput
                      label="Минимальное количество"
                      placeholder="Введите минимальное количество"
                      min={0}
                      required
                      {...form.getInputProps("min_quantity")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <NumberInput
                      label="Цена"
                      placeholder="Введите цену"
                      min={0}
                      required
                      {...form.getInputProps("price")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Местоположение"
                      placeholder="Введите местоположение"
                      required
                      {...form.getInputProps("location")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                      label="Статус"
                      placeholder="Выберите статус"
                      data={[
                        {
                          value: WarehouseItemStatus.AVAILABLE,
                          label: "Доступно",
                        },
                        {
                          value: WarehouseItemStatus.RESERVED,
                          label: "Зарезервировано",
                        },
                        {
                          value: WarehouseItemStatus.UNAVAILABLE,
                          label: "Недоступно",
                        },
                      ]}
                      required
                      {...form.getInputProps("status")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <DateInput
                      label="Дата покупки"
                      placeholder="Выберите дату"
                      valueFormat="DD.MM.YYYY"
                      required
                      {...form.getInputProps("purchase_date")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <DateInput
                      label="Гарантия до"
                      placeholder="Выберите дату окончания гарантии"
                      valueFormat="DD.MM.YYYY"
                      clearable
                      {...form.getInputProps("warranty_expiry")}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label="Описание"
                      placeholder="Введите описание оборудования"
                      minRows={3}
                      {...form.getInputProps("description")}
                    />
                  </Grid.Col>
                </Grid>

                <Group justify="flex-end" mt="xl">
                  <Button variant="outline" onClick={handleCancel}>
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    leftSection={<IconDeviceFloppy size={16} />}
                    loading={isSaving}
                  >
                    Сохранить
                  </Button>
                </Group>
              </Card>
            </form>
          </Stack>
        </AppShell>
      )}
    </AuthGuard>
  );
}
