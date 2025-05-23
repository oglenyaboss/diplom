"use client";

import React, { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Table,
  Title,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { invoicesApi } from "@/api/invoices";
import { Invoice, InvoiceType } from "@/types/invoices";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { formatDate, formatNumber } from "@/utils/formatters";
import { useRouter } from "next/navigation";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const router = useRouter();

  useEffect(() => {
    fetchInvoices(activeTab !== "all" ? activeTab : undefined);
  }, [activeTab]);

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

  const getBadgeColor = (type: InvoiceType) => {
    return type === InvoiceType.Receipt ? "green" : "blue";
  };

  const getInvoiceTypeText = (type: InvoiceType) => {
    return type === InvoiceType.Receipt ? "Приходная" : "Расходная";
  };

  const handleViewInvoice = (id: string) => {
    router.push(`/invoices/${id}`);
  };

  return (
    <AuthGuard>
      <AppShell>
        {isLoading ? (
          <LoadingOverlay />
        ) : (
          <Stack>
            <Card withBorder p="md">
              <Group>
                <Title order={3}>Список накладных</Title>
                <SegmentedControl
                  value={activeTab}
                  onChange={setActiveTab}
                  data={[
                    { label: "Все", value: "all" },
                    { label: "Приходные", value: InvoiceType.Receipt },
                    { label: "Расходные", value: InvoiceType.Expense },
                  ]}
                />
              </Group>
            </Card>

            {invoices?.length === 0 || invoices === null ? (
              <Alert color="yellow" title="Нет накладных">
                {activeTab === "all"
                  ? "В системе отсутствуют накладные. Создайте накладную через страницу оборудования."
                  : `В системе отсутствуют ${
                      activeTab === InvoiceType.Receipt
                        ? "приходные"
                        : "расходные"
                    } накладные.`}
              </Alert>
            ) : (
              <Card withBorder p={0}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Номер</Table.Th>
                      <Table.Th>Тип</Table.Th>
                      <Table.Th>Дата</Table.Th>
                      <Table.Th>Позиций</Table.Th>
                      <Table.Th>Сумма</Table.Th>
                      <Table.Th>Получатель</Table.Th>
                      <Table.Th>Действия</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {invoices.map((invoice) => (
                      <Table.Tr key={invoice.id}>
                        <Table.Td>{invoice.number}</Table.Td>
                        <Table.Td>
                          <Badge color={getBadgeColor(invoice.type)}>
                            {getInvoiceTypeText(invoice.type)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {formatDate(new Date(invoice.date))}
                        </Table.Td>
                        <Table.Td>{invoice.items.length}</Table.Td>
                        <Table.Td>
                          {formatNumber(invoice.totalAmount)} ₽
                        </Table.Td>
                        <Table.Td>{invoice.receivedBy.fullName}</Table.Td>
                        <Table.Td>
                          <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconSearch size={16} />}
                            onClick={() => handleViewInvoice(invoice.id!)}
                          >
                            Просмотр
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            )}
          </Stack>
        )}
      </AppShell>
    </AuthGuard>
  );
}
