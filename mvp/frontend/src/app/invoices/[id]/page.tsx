"use client";

import React, { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconPrinter,
  IconCalendar,
  IconUser,
  IconCash,
  IconListCheck,
} from "@tabler/icons-react";
import { invoicesApi } from "@/api/invoices";
import { Invoice, InvoiceType } from "@/types/invoices";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { formatDate, formatNumber } from "@/utils/formatters";
import { useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";

interface InvoiceViewPageProps {
  params: {
    id: string;
  };
}

export default function InvoiceViewPage({ params }: InvoiceViewPageProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const printRef = React.useRef<HTMLDivElement>(null);
  const resolvedParams = React.use(params);
  const invoiceId = resolvedParams.id;

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      setIsLoading(true);
      const data = await invoicesApi.getInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error("Error fetching invoice:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Накладная №${invoice?.number}`,
    onAfterPrint: () => {
      console.log("Print completed");
    },
    pageStyle: `
        @page {
            margin: 20mm;
        }
        @media print {
            body {
            -webkit-print-color-adjust: exact;
            }
        }
        `,
  });

  const getInvoiceTypeText = (type: InvoiceType) => {
    return type === InvoiceType.Receipt
      ? "Приходная накладная"
      : "Расходная накладная";
  };

  const getBadgeColor = (type: InvoiceType) => {
    return type === InvoiceType.Receipt ? "green" : "blue";
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AppShell>
          <LoadingOverlay />
        </AppShell>
      </AuthGuard>
    );
  }

  if (!invoice) {
    return (
      <AuthGuard>
        <AppShell>
          <Card withBorder p="md">
            <Stack>
              <Title order={3}>Накладная не найдена</Title>
              <Text>Запрошенная накладная не существует или была удалена.</Text>
              <Button
                leftSection={<IconArrowLeft size={16} />}
                onClick={handleBack}
              >
                Вернуться назад
              </Button>
            </Stack>
          </Card>
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppShell>
        <Stack>
          <Group>
            <Button
              leftSection={<IconArrowLeft size={16} />}
              variant="light"
              onClick={handleBack}
            >
              Назад
            </Button>
            <Button
              leftSection={<IconPrinter size={16} />}
              onClick={handlePrint}
            >
              Печать
            </Button>
          </Group>

          <div ref={printRef}>
            <Card withBorder p="lg">
              <Stack>
                <Group justify="space-between">
                  <Title order={2}>
                    {getInvoiceTypeText(invoice.type)} №{invoice.number}
                  </Title>
                  <Badge size="lg" color={getBadgeColor(invoice.type)}>
                    {invoice.type === InvoiceType.Receipt ? "Приход" : "Расход"}
                  </Badge>
                </Group>

                <Divider />

                <Grid>
                  <Grid.Col span={6}>
                    <Paper p="md" withBorder>
                      <Stack>
                        <Group>
                          <IconCalendar size={20} />
                          <Text fw={500}>Дата:</Text>
                          <Text>{formatDate(new Date(invoice.date))}</Text>
                        </Group>

                        <Group>
                          <IconUser size={20} />
                          <Text fw={500}>Получил:</Text>
                          <Text>
                            {invoice.receivedBy.fullName}
                            {invoice.receivedBy.position &&
                              ` (${invoice.receivedBy.position})`}
                          </Text>
                        </Group>

                        <Group>
                          <IconUser size={20} />
                          <Text fw={500}>Выдал:</Text>
                          <Text>
                            {invoice.issuedBy.fullName}
                            {invoice.issuedBy.position &&
                              ` (${invoice.issuedBy.position})`}
                          </Text>
                        </Group>

                        {invoice.transactionId && (
                          <Group>
                            <IconListCheck size={20} />
                            <Text fw={500}>ID транзакции:</Text>
                            <Text>{invoice.transactionId}</Text>
                          </Group>
                        )}
                      </Stack>
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Paper p="md" withBorder>
                      <Stack>
                        <Group>
                          <IconCash size={20} />
                          <Text fw={500}>Общая сумма:</Text>
                          <Text fw={700} size="lg">
                            {formatNumber(invoice.totalAmount)} ₽
                          </Text>
                        </Group>

                        <Group>
                          <IconListCheck size={20} />
                          <Text fw={500}>Количество позиций:</Text>
                          <Text>{invoice.items.length}</Text>
                        </Group>

                        {invoice.notes && (
                          <>
                            <Divider />
                            <Text fw={500}>Примечания:</Text>
                            <Text>{invoice.notes}</Text>
                          </>
                        )}
                      </Stack>
                    </Paper>
                  </Grid.Col>
                </Grid>

                <Divider label="Позиции" labelPosition="center" />

                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Наименование</Table.Th>
                      <Table.Th>Серийный номер</Table.Th>
                      <Table.Th>Категория</Table.Th>
                      <Table.Th>Кол-во</Table.Th>
                      <Table.Th>Цена</Table.Th>
                      <Table.Th>Сумма</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {invoice.items.map((item, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>{item.name}</Table.Td>
                        <Table.Td>{item.serialNumber}</Table.Td>
                        <Table.Td>{item.category}</Table.Td>
                        <Table.Td>{item.quantity}</Table.Td>
                        <Table.Td>{formatNumber(item.price)} ₽</Table.Td>
                        <Table.Td>{formatNumber(item.totalAmount)} ₽</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                  <Table.Tfoot>
                    <Table.Tr>
                      <Table.Th colSpan={5} style={{ textAlign: "right" }}>
                        Итого:
                      </Table.Th>
                      <Table.Th>{formatNumber(invoice.totalAmount)} ₽</Table.Th>
                    </Table.Tr>
                  </Table.Tfoot>
                </Table>

                <Divider />

                <Group justify="space-between">
                  <Text>Документ сформирован автоматически</Text>
                  <Text>
                    Дата создания:{" "}
                    {formatDate(
                      invoice.createdAt
                        ? new Date(invoice.createdAt)
                        : new Date()
                    )}
                  </Text>
                </Group>
              </Stack>
            </Card>
          </div>
        </Stack>
      </AppShell>
    </AuthGuard>
  );
}
