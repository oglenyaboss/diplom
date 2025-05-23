"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Text,
  Badge,
  Card,
  Button,
  Group,
  ActionIcon,
  LoadingOverlay,
  Menu,
  Tooltip,
  Select,
  ScrollArea,
} from "@mantine/core";
import {
  IconEye,
  IconPrinter,
  IconDotsVertical,
  IconFileAnalytics,
  IconTrash,
  IconSearch,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { reportsApi } from "@/api/reports";
import { MovementReport, ReportType, ReportStatus } from "@/types/reports";
import { formatDate } from "@/utils/formatters";

interface ReportsTableProps {
  onCreateReport?: () => void;
}

export default function ReportsTable({ onCreateReport }: ReportsTableProps) {
  const [reports, setReports] = useState<MovementReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const router = useRouter();

  const fetchReports = async () => {
    try {
      setLoading(true);
      let data: MovementReport[];

      if (filter) {
        data = await reportsApi.getReports(filter as ReportType);
      } else {
        data = await reportsApi.getReports();
      }

      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось загрузить отчеты",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const handleViewReport = (id: string) => {
    router.push(`/reports/${id}`);
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await reportsApi.deleteReport(id);
      notifications.show({
        title: "Успех",
        message: "Отчет успешно удален",
        color: "green",
      });
      fetchReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось удалить отчет",
        color: "red",
      });
    }
  };

  const getReportTypeText = (type: ReportType) => {
    switch (type) {
      case ReportType.Individual:
        return "По оборудованию";
      case ReportType.Department:
        return "По подразделению";
      case ReportType.Period:
        return "За период";
      default:
        return "Неизвестный тип";
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

  return (
    <Card withBorder p="md" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="md">
        <Group>
          <IconFileAnalytics size={24} />
          <Text fw={500} size="lg">
            Отчеты о передвижениях оборудования
          </Text>
        </Group>

        <Group>
          <Select
            placeholder="Фильтр по типу"
            allowDeselect
            value={filter}
            onChange={setFilter}
            data={[
              { value: ReportType.Individual, label: "По оборудованию" },
              { value: ReportType.Department, label: "По подразделению" },
              { value: ReportType.Period, label: "За период" },
            ]}
            style={{ width: 200 }}
          />

          <Button onClick={onCreateReport}>Создать отчет</Button>
        </Group>
      </Group>

      <ScrollArea>
        {reports.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            Отчеты отсутствуют
          </Text>
        ) : (
          <Table striped highlightOnHover horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Номер</Table.Th>
                <Table.Th>Название</Table.Th>
                <Table.Th>Тип</Table.Th>
                <Table.Th>Период</Table.Th>
                <Table.Th>Создан</Table.Th>
                <Table.Th>Записей</Table.Th>
                <Table.Th style={{ width: 120 }}>Действия</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reports.map((report) => {
                return (
                  <Table.Tr key={report.id}>
                    <Table.Td>{report.number}</Table.Td>
                    <Table.Td>{report.title}</Table.Td>
                    <Table.Td>
                      <Badge color={getBadgeColor(report.type)}>
                        {getReportTypeText(report.type)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {formatDate(report.startDate)} -{" "}
                      {formatDate(report.endDate)}
                    </Table.Td>
                    <Table.Td>{formatDate(report.createdAt)}</Table.Td>
                    <Table.Td>{report.transfers.length}</Table.Td>
                    <Table.Td>
                      <Group justify="center" gap="xs">
                        <Tooltip label="Просмотр">
                          <ActionIcon
                            onClick={() => handleViewReport(report._id)}
                            color="blue"
                            radius="xl"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon radius="xl">
                              <IconDotsVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconPrinter size={16} />}
                              onClick={() => handleViewReport(report._id)}
                            >
                              Печать
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconTrash size={16} />}
                              color="red"
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              Удалить
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </ScrollArea>
    </Card>
  );
}
