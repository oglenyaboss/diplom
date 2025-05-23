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
  IconFileAnalytics,
  IconListCheck,
} from "@tabler/icons-react";
import { reportsApi } from "@/api/reports";
import { MovementReport, ReportType } from "@/types/reports";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { formatDate } from "@/utils/formatters";
import { useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";

interface ReportViewPageProps {
  params: {
    id: string;
  };
}

export default function ReportViewPage({ params }: ReportViewPageProps) {
  const [report, setReport] = useState<MovementReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const printRef = React.useRef<HTMLDivElement>(null);
  const resolvedParams = React.use(params);
  const reportId = resolvedParams.id;

  useEffect(() => {
    if (reportId) {
      fetchReportData();
    }
  }, [reportId]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const data = await reportsApi.getReport(reportId);
      setReport(data);
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Отчет о передвижениях №${report?.number}`,
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

  const getReportTypeText = (type: ReportType) => {
    switch (type) {
      case ReportType.Individual:
        return "Отчет по оборудованию";
      case ReportType.Department:
        return "Отчет по подразделению";
      case ReportType.Period:
        return "Отчет за период";
      default:
        return "Отчет о передвижениях";
    }
  };

  const getBadgeColor = (type: ReportType) => {
    switch (type) {
      case ReportType.Individual:
        return "blue";
      case ReportType.Department:
        return "green";
      case ReportType.Period:
        return "orange";
      default:
        return "gray";
    }
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

  if (!report) {
    return (
      <AuthGuard>
        <AppShell>
          <Card withBorder p="md">
            <Stack>
              <Title order={3}>Отчет не найден</Title>
              <Text>Запрошенный отчет не существует или был удален.</Text>
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
                    {getReportTypeText(report.type)} №{report.number}
                  </Title>
                  <Badge size="lg" color={getBadgeColor(report.type)}>
                    {report.title}
                  </Badge>
                </Group>

                <Divider />

                <Grid>
                  <Grid.Col span={6}>
                    <Paper p="md" withBorder>
                      <Stack>
                        <Group>
                          <IconCalendar size={20} />
                          <Text fw={500}>Период:</Text>
                          <Text>
                            {formatDate(report.startDate)} -{" "}
                            {formatDate(report.endDate)}
                          </Text>
                        </Group>

                        <Group>
                          <IconUser size={20} />
                          <Text fw={500}>Создал:</Text>
                          <Text>
                            {report.createdBy.name}
                            {report.createdBy.position &&
                              ` (${report.createdBy.position})`}
                          </Text>
                        </Group>

                        <Group>
                          <IconFileAnalytics size={20} />
                          <Text fw={500}>Тип отчета:</Text>
                          <Text>{getReportTypeText(report.type)}</Text>
                        </Group>
                      </Stack>
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Paper p="md" withBorder>
                      <Stack>
                        <Group>
                          <IconCalendar size={20} />
                          <Text fw={500}>Дата создания:</Text>
                          <Text>{formatDate(report.createdAt)}</Text>
                        </Group>

                        <Group>
                          <IconListCheck size={20} />
                          <Text fw={500}>Количество передач:</Text>
                          <Text>{report.transfers.length}</Text>
                        </Group>

                        {report.notes && (
                          <>
                            <Divider />
                            <Text fw={500}>Примечания:</Text>
                            <Text>{report.notes}</Text>
                          </>
                        )}
                      </Stack>
                    </Paper>
                  </Grid.Col>
                </Grid>

                <Divider
                  label="Перемещения оборудования"
                  labelPosition="center"
                />

                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Дата</Table.Th>
                      <Table.Th>Оборудование</Table.Th>
                      <Table.Th>Серийный номер</Table.Th>
                      <Table.Th>От кого</Table.Th>
                      <Table.Th>Кому</Table.Th>
                      <Table.Th>Причина</Table.Th>
                      <Table.Th>Блокчейн ID</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {report.transfers.map((transfer, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>{formatDate(transfer.transferDate)}</Table.Td>
                        <Table.Td>{transfer.equipmentName}</Table.Td>
                        <Table.Td>{transfer.serialNumber}</Table.Td>
                        <Table.Td>
                          {transfer.fromHolder.name}
                          {transfer.fromHolder.position &&
                            ` (${transfer.fromHolder.position})`}
                        </Table.Td>
                        <Table.Td>
                          {transfer.toHolder.name}
                          {transfer.toHolder.position &&
                            ` (${transfer.toHolder.position})`}
                        </Table.Td>
                        <Table.Td>{transfer.transferReason}</Table.Td>
                        <Table.Td>
                          {transfer.blockchainTxId ? (
                            <Badge color="teal">Подтверждено</Badge>
                          ) : (
                            <Badge color="gray">Не записано</Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                <Divider />

                <Group justify="space-between">
                  <Text>Документ сформирован автоматически</Text>
                  <Text>Дата формирования: {formatDate(new Date())}</Text>
                </Group>
              </Stack>
            </Card>
          </div>
        </Stack>
      </AppShell>
    </AuthGuard>
  );
}
