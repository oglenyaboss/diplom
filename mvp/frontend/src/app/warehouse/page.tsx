"use client";

import React, { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Group,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconEdit,
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
  IconChartBar,
} from "@tabler/icons-react";
import { warehouseApi } from "@/api/warehouse";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { useRouter } from "next/navigation";
import { WarehouseItem, WarehouseItemStatus } from "@/types/warehouse";
import { formatDate, formatNumber } from "@/utils/formatters";
import WarehouseServiceStatus from "./components/WarehouseServiceStatus";

export default function WarehousePage() {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WarehouseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const itemsPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    fetchWarehouseItems();
  }, []);

  // Fetch items from the warehouse
  const fetchWarehouseItems = async () => {
    try {
      setIsLoading(true);
      const fetchedItems = await warehouseApi.getItems();
      // Handle null or undefined response by setting to empty array
      const safeItems = fetchedItems || [];
      setItems(safeItems);

      // Extract unique categories for the filter
      const uniqueCategories = Array.from(
        new Set(
          safeItems
            .filter((item) => item?.category)
            .map((item) => item.category)
        )
      );
      setCategories(uniqueCategories);

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching warehouse items:", error);
      setItems([]);
      setCategories([]);
      setIsLoading(false);
    }
  };

  // Filter items based on search term and filters
  useEffect(() => {
    // Ensure items is an array
    let result = Array.isArray(items) ? [...items] : [];

    // Apply search filter
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(lowercasedTerm)) ||
          (item.serial_number &&
            item.serial_number.toLowerCase().includes(lowercasedTerm)) ||
          (item.manufacturer &&
            item.manufacturer.toLowerCase().includes(lowercasedTerm))
      );
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }

    setFilteredItems(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [items, searchTerm, statusFilter, categoryFilter]);

  // Calculate pagination
  const totalPages = filteredItems.length
    ? Math.ceil(filteredItems.length / itemsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedItems = filteredItems.length
    ? filteredItems.slice(startIndex, startIndex + itemsPerPage)
    : [];

  // Status badge color mapper
  const getStatusColor = (status: WarehouseItemStatus) => {
    switch (status) {
      case WarehouseItemStatus.AVAILABLE:
        return "green";
      case WarehouseItemStatus.RESERVED:
        return "blue";
      case WarehouseItemStatus.UNAVAILABLE:
        return "red";
      default:
        return "gray";
    }
  };

  // Status translation mapper
  const getStatusLabel = (status: WarehouseItemStatus) => {
    switch (status) {
      case WarehouseItemStatus.AVAILABLE:
        return "Доступно";
      case WarehouseItemStatus.RESERVED:
        return "Зарезервировано";
      case WarehouseItemStatus.UNAVAILABLE:
        return "Недоступно";
      default:
        return status;
    }
  };

  // Handle item deletion
  const handleDeleteItem = async (id: string) => {
    if (window.confirm("Вы уверены, что хотите удалить этот элемент?")) {
      try {
        await warehouseApi.deleteItem(id);
        fetchWarehouseItems(); // Refresh the list
      } catch (error) {
        console.error("Error deleting item:", error);
        alert("Не удалось удалить элемент. Пожалуйста, попробуйте еще раз.");
      }
    }
  };

  // Navigate to create new item page
  const handleAddNewItem = () => {
    router.push("/warehouse/create");
  };

  // Navigate to view item details
  const handleViewItem = (id: string) => {
    router.push(`/warehouse/${id}`);
  };

  // Navigate to edit item page
  const handleEditItem = (id: string) => {
    router.push(`/warehouse/${id}/edit`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter(null);
    setCategoryFilter(null);
  };

  return (
    <AuthGuard>
      {isLoading ? (
        <LoadingOverlay message="Загрузка данных склада..." />
      ) : (
        <AppShell>
          <Stack gap="lg">
            <Flex justify="space-between" align="center">
              <Title order={1}>Управление складом</Title>
              <Group>
                <Button
                  variant="outline"
                  color="blue"
                  leftSection={<IconChartBar size={20} />}
                  onClick={() => router.push("/warehouse/analytics")}
                >
                  Аналитика склада
                </Button>
                <Button
                  leftSection={<IconPlus size={20} />}
                  onClick={handleAddNewItem}
                >
                  Добавить оборудование
                </Button>
              </Group>
            </Flex>

            {/* Service Status Component */}
            <WarehouseServiceStatus />

            {/* Filters */}
            <Card withBorder p="md">
              <Stack>
                <Title order={3}>Фильтры</Title>
                <Grid>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <TextInput
                      placeholder="Поиск по названию, серийному номеру..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.currentTarget.value)}
                      leftSection={<IconSearch size={20} />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Select
                      placeholder="Фильтр по статусу"
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
                      value={statusFilter}
                      onChange={setStatusFilter}
                      clearable
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Select
                      placeholder="Фильтр по категории"
                      data={categories.map((category) => ({
                        value: category,
                        label: category,
                      }))}
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                      clearable
                    />
                  </Grid.Col>
                </Grid>
                <Flex justify="flex-end">
                  <Button variant="outline" onClick={clearFilters}>
                    Сбросить фильтры
                  </Button>
                </Flex>
              </Stack>
            </Card>

            {/* Items List */}
            <Card withBorder p="md">
              <Stack>
                <Group justify="space-between">
                  <Title order={3}>Оборудование на складе</Title>
                  <Text c="dimmed">
                    Всего элементов: {filteredItems.length}
                  </Text>
                </Group>

                {!items || items.length === 0 ? (
                  <Card p="xl" withBorder bg="gray.0">
                    <Stack align="center" gap="md">
                      <Text fw={500} ta="center" size="lg">
                        Склад пуст
                      </Text>
                      <Text ta="center" c="dimmed" size="sm">
                        На складе пока нет оборудования. Добавьте первый
                        элемент, нажав кнопку выше.
                      </Text>
                      <Button
                        variant="light"
                        color="blue"
                        leftSection={<IconPlus size={16} />}
                        onClick={handleAddNewItem}
                        mt="sm"
                      >
                        Добавить первое оборудование
                      </Button>
                    </Stack>
                  </Card>
                ) : filteredItems.length > 0 ? (
                  <>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Название</Table.Th>
                          <Table.Th>Категория</Table.Th>
                          <Table.Th>Производитель</Table.Th>
                          <Table.Th>Количество</Table.Th>
                          <Table.Th>Статус</Table.Th>
                          <Table.Th>Гарантия до</Table.Th>
                          <Table.Th>Действия</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {displayedItems.map((item) => (
                          <Table.Tr key={item.id}>
                            <Table.Td>
                              <Text fw={500}>{item.name}</Text>
                              <Text size="xs" c="dimmed">
                                S/N: {item.serial_number || "Н/Д"}
                              </Text>
                            </Table.Td>
                            <Table.Td>{item.category || "Н/Д"}</Table.Td>
                            <Table.Td>{item.manufacturer || "Н/Д"}</Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Text>{formatNumber(item.quantity || 0)}</Text>
                                {item.quantity <= item.min_quantity && (
                                  <Badge color="red" size="sm">
                                    Мало
                                  </Badge>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={getStatusColor(item.status)}>
                                {getStatusLabel(item.status)}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {item.warranty_expiry
                                ? formatDate(item.warranty_expiry, {
                                    format: "short",
                                  })
                                : "Н/Д"}
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Tooltip label="Просмотр">
                                  <ActionIcon
                                    variant="subtle"
                                    color="blue"
                                    onClick={() => handleViewItem(item.id)}
                                  >
                                    <IconEye size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Редактировать">
                                  <ActionIcon
                                    variant="subtle"
                                    color="green"
                                    onClick={() => handleEditItem(item.id)}
                                  >
                                    <IconEdit size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Удалить">
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    <IconTrash size={18} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <Flex justify="center" mt="md">
                        <Pagination
                          total={totalPages}
                          value={currentPage}
                          onChange={setCurrentPage}
                          withEdges
                        />
                      </Flex>
                    )}
                  </>
                ) : (
                  <Text ta="center" c="dimmed" py="xl">
                    Нет оборудования, соответствующего указанным критериям
                  </Text>
                )}
              </Stack>
            </Card>

            {/* Stats */}
            <Grid>
              <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                <Card withBorder p="md">
                  <Title order={4} mb="sm">
                    Общее количество
                  </Title>
                  <Text size="xl" fw={700}>
                    {formatNumber(
                      items && items.length
                        ? items.reduce(
                            (sum, item) => sum + (item?.quantity || 0),
                            0
                          )
                        : 0
                    )}
                  </Text>
                  <Text size="sm" c="dimmed">
                    единиц оборудования
                  </Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                <Card withBorder p="md">
                  <Title order={4} mb="sm">
                    Низкий запас
                  </Title>
                  <Text size="xl" fw={700} c="red">
                    {formatNumber(
                      items && items.length
                        ? items.filter(
                            (item) => item?.quantity <= item?.min_quantity
                          ).length
                        : 0
                    )}
                  </Text>
                  <Text size="sm" c="dimmed">
                    позиций требуют пополнения
                  </Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                <Card withBorder p="md">
                  <Title order={4} mb="sm">
                    Доступно
                  </Title>
                  <Text size="xl" fw={700} c="green">
                    {formatNumber(
                      items && items.length
                        ? items.filter(
                            (item) =>
                              item?.status === WarehouseItemStatus.AVAILABLE
                          ).length
                        : 0
                    )}
                  </Text>
                  <Text size="sm" c="dimmed">
                    позиций в наличии
                  </Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                <Card withBorder p="md">
                  <Title order={4} mb="sm">
                    Категории
                  </Title>
                  <Text size="xl" fw={700} c="blue">
                    {categories.length}
                  </Text>
                  <Text size="sm" c="dimmed">
                    различных категорий
                  </Text>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </AppShell>
      )}
    </AuthGuard>
  );
}
