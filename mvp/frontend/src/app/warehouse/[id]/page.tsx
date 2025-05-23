"use client";

import React, { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Badge,
  Button,
  Card,
  Divider,
  Flex,
  Grid,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconEdit,
  IconPrinter,
  IconFileInvoice,
  IconFileExport,
  IconFileImport,
} from "@tabler/icons-react";
import { warehouseApi } from "@/api/warehouse";
import { invoicesApi } from "@/api/invoices";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { EnhancedReceiptGenerator } from "../components/EnhancedReceiptGenerator";
import { Invoice, InvoiceType } from "@/types/invoices";
import { useRouter } from "next/navigation";
import {
  InventoryTransaction,
  TransactionType,
  WarehouseItem,
  WarehouseItemStatus,
} from "@/types/warehouse";
import { formatDate, formatNumber } from "@/utils/formatters";

interface WarehouseItemViewPageProps {
  params: {
    id: string;
  };
}

export default function WarehouseItemViewPage({
  params,
}: WarehouseItemViewPageProps) {
  const [item, setItem] = useState<WarehouseItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const resolvedParams = React.use(params);
  const itemId = resolvedParams.id;

  useEffect(() => {
    fetchItemData();
    fetchInvoices();
  }, [itemId]);

  const fetchItemData = async () => {
    try {
      setIsLoading(true);

      // Fetch item details
      const itemData = await warehouseApi.getItem(itemId);
      setItem(itemData);

      // Fetch item transaction history
      const transactionHistory = await warehouseApi.getItemTransactions(itemId);
      setTransactions(transactionHistory);

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching item data:", error);
      setIsLoading(false);
    }
  };

  const fetchInvoices = async (type?: string) => {
    try {
      setIsLoading(true);
      const data = await invoicesApi.getInvoices(type);
      setInvoices(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleEditItem = () => {
    router.push(`/warehouse/${itemId}/edit`);
  };

  const handleBackToList = () => {
    router.push("/warehouse");
  };

  const handlePrintItem = () => {
    window.print();
  };

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

  // Transaction type color and label mapper
  const getTransactionInfo = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INTAKE:
        return { color: "green", label: "Приход" };
      case TransactionType.ISSUE:
        return { color: "orange", label: "Выдача" };
      case TransactionType.RETURN:
        return { color: "blue", label: "Возврат" };
      case TransactionType.ADJUSTMENT:
        return { color: "gray", label: "Корректировка" };
      default:
        return { color: "gray", label: type };
    }
  };

  return (
    <AuthGuard>
      {isLoading || !item ? (
        <LoadingOverlay message="Загрузка данных..." />
      ) : (
        <AppShell>
          <Stack gap="lg">
            <Flex justify="space-between" align="center">
              <Group>
                <Button
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleBackToList}
                >
                  Назад к списку
                </Button>
                <Title order={2}>{item.name}</Title>
                <Badge color={getStatusColor(item.status)} size="lg">
                  {getStatusLabel(item.status)}
                </Badge>
              </Group>
              <Group>
                <Button
                  variant="outline"
                  leftSection={<IconPrinter size={16} />}
                  onClick={handlePrintItem}
                >
                  Печать
                </Button>
                <Button
                  leftSection={<IconEdit size={16} />}
                  onClick={handleEditItem}
                >
                  Редактировать
                </Button>
              </Group>
            </Flex>

            <Grid>
              {/* Item Details */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder p="md">
                  <Title order={3} mb="md">
                    Детали оборудования
                  </Title>
                  <Stack gap="sm">
                    <Group>
                      <Text fw={500} w={200}>
                        Серийный номер:
                      </Text>
                      <Text>{item.serial_number}</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Категория:
                      </Text>
                      <Text>{item.category}</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Производитель:
                      </Text>
                      <Text>{item.manufacturer}</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Количество:
                      </Text>
                      <Text component="span">
                        {formatNumber(item.quantity)}
                        {item.quantity <= item.min_quantity && (
                          <Badge color="red" ml="xs">
                            Мало
                          </Badge>
                        )}
                      </Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Минимальное количество:
                      </Text>
                      <Text>{formatNumber(item.min_quantity)}</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Цена:
                      </Text>
                      <Text>{formatNumber(item.price)} ₽</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Местоположение:
                      </Text>
                      <Text>{item.location}</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Дата покупки:
                      </Text>
                      <Text>
                        {formatDate(item.purchase_date, { format: "short" })}
                      </Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Гарантия до:
                      </Text>
                      <Text>
                        {formatDate(item.warranty_expiry, { format: "short" })}
                      </Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={200}>
                        Последняя инвентаризация:
                      </Text>
                      <Text>
                        {formatDate(item.last_inventory, { format: "full" })}
                      </Text>
                    </Group>
                  </Stack>

                  <Divider my="md" />

                  <Title order={4}>Описание</Title>
                  <Text mt="xs">
                    {item.description || "Описание отсутствует"}
                  </Text>
                </Card>
              </Grid.Col>

              {/* Stats and Quick Actions */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack>
                  <Card withBorder p="md">
                    <Title order={3} mb="md">
                      Статистика
                    </Title>
                    <Grid>
                      <Grid.Col span={6}>
                        <Card withBorder>
                          <Text fw={500} size="sm" c="dimmed">
                            Текущий запас
                          </Text>
                          <Text size="xl" fw={700}>
                            {formatNumber(item.quantity)}
                          </Text>
                        </Card>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Card withBorder>
                          <Text fw={500} size="sm" c="dimmed">
                            Необходимо заказать
                          </Text>
                          <Text
                            size="xl"
                            fw={700}
                            c={
                              item.quantity < item.min_quantity
                                ? "red"
                                : "green"
                            }
                          >
                            {item.quantity < item.min_quantity
                              ? formatNumber(item.min_quantity - item.quantity)
                              : "0"}
                          </Text>
                        </Card>
                      </Grid.Col>
                    </Grid>
                  </Card>

                  <Card withBorder p="md">
                    <Title order={3} mb="md">
                      История транзакций
                    </Title>
                    {transactions.length > 0 ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Дата</Table.Th>
                            <Table.Th>Тип</Table.Th>
                            <Table.Th>Количество</Table.Th>
                            <Table.Th>Причина</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {transactions.map((transaction) => {
                            const txInfo = getTransactionInfo(
                              transaction.transaction_type
                            );
                            return (
                              <Table.Tr key={transaction.id}>
                                <Table.Td>
                                  {formatDate(transaction.date, {
                                    format: "short",
                                  })}
                                </Table.Td>
                                <Table.Td>
                                  <Badge color={txInfo.color}>
                                    {txInfo.label}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  {formatNumber(transaction.quantity)}
                                </Table.Td>
                                <Table.Td>{transaction.reason}</Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed" ta="center">
                        Нет записей о транзакциях
                      </Text>
                    )}
                  </Card>

                  <Card withBorder p="md">
                    <Title order={3} mb="md">
                      Документы
                    </Title>
                    <Grid>
                      <Grid.Col span={6}>
                        <Card withBorder shadow="sm" p="md">
                          <Group justify="space-between" align="flex-start">
                            <Stack gap="xs">
                              <Title order={5}>Приходная накладная</Title>
                              <Text size="sm" c="dimmed">
                                Документ для оформления прихода товара на склад
                              </Text>
                            </Stack>
                            <IconFileInvoice size={24} />
                          </Group>
                          <EnhancedReceiptGenerator
                            receiptNumber={item.serial_number || "0000"}
                            equipmentInfo={{
                              id: item.id,
                              name: item.name,
                              serialNumber: item.serial_number || "",
                              manufacturer: item.manufacturer || "",
                              category: item.category || "",
                              description: item.description,
                              price: item.price,
                            }}
                            receivedBy={{
                              fullName: "Иванов И.И.",
                              position: "Кладовщик",
                            }}
                            issuedBy={{
                              fullName: "Петров П.П.",
                              position: "Поставщик",
                            }}
                            quantity={1}
                            type={InvoiceType.Receipt}
                          />
                        </Card>
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <Card withBorder shadow="sm" p="md">
                          <Group justify="space-between" align="flex-start">
                            <Stack gap="xs">
                              <Title order={5}>Расходная накладная</Title>
                              <Text size="sm" c="dimmed">
                                Документ для оформления выдачи товара со склада
                              </Text>
                            </Stack>
                            <IconFileExport size={24} />
                          </Group>
                          <EnhancedReceiptGenerator
                            receiptNumber={item.serial_number || "0000"}
                            equipmentInfo={{
                              id: item.id,
                              name: item.name,
                              serialNumber: item.serial_number || "",
                              manufacturer: item.manufacturer || "",
                              category: item.category || "",
                              description: item.description,
                              price: item.price,
                            }}
                            receivedBy={{
                              fullName: "Сидоров С.С.",
                              position: "Ответственное лицо",
                            }}
                            issuedBy={{
                              fullName: "Иванов И.И.",
                              position: "Кладовщик",
                            }}
                            quantity={1}
                            type={InvoiceType.Expense}
                          />
                        </Card>
                      </Grid.Col>

                      <Grid.Col span={6} mt="md">
                        <Card withBorder shadow="sm" p="md">
                          <Group justify="space-between" align="flex-start">
                            <Stack gap="xs">
                              <Title order={5}>Акт возврата</Title>
                              <Text size="sm" c="dimmed">
                                Документ для оформления возврата товара на склад
                              </Text>
                            </Stack>
                            <IconFileImport size={24} />
                          </Group>
                          <Button
                            variant="light"
                            fullWidth
                            mt="md"
                            leftSection={<IconPrinter size={16} />}
                            onClick={() => {
                              // Будет реализовано позже
                              alert("Функционал в разработке");
                            }}
                          >
                            Сформировать акт
                          </Button>
                        </Card>
                      </Grid.Col>
                    </Grid>
                  </Card>

                  <Card withBorder p="md">
                    <Title order={3} mb="md">
                      Дополнительные действия
                    </Title>
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => {
                        // Логика для экспорта данных товара в XLSX
                        alert("Экспорт в XLSX");
                      }}
                    >
                      Экспортировать в XLSX
                    </Button>
                  </Card>
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </AppShell>
      )}
    </AuthGuard>
  );
}
