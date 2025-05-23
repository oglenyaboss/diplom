"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  Modal,
  Button,
  Text,
  TextInput,
  Stack,
  Group,
  Divider,
  Select,
  Textarea,
} from "@mantine/core";
import { DatePickerInput, DateValue } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendar, IconFileReport } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { reportsApi } from "@/api/reports";
import { trackingApi } from "@/api/tracking";
import { ReportType } from "@/types/reports";
import { Equipment } from "@/types/tracking";
import ReportsTable from "./components/ReportsTable";
import AuthGuard from "@/components/common/AuthGuard";
import AppShell from "@/components/layout/AppShell";
import LoadingOverlay from "@/components/common/LoadingOverlay";

export default function ReportsPage() {
  const userId = useSelector((state: any) => state.auth.user?.id);
  const [opened, { open, close }] = useDisclosure(false);
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState<string | null>(
    ReportType.Individual
  );
  const [startDate, setStartDate] = useState<DateValue>(new Date());
  const [endDate, setEndDate] = useState<DateValue>(new Date());
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const router = useRouter();

  const handleCreateReport = async () => {
    if (!title || !reportType || !startDate || !endDate) {
      notifications.show({
        title: "Ошибка",
        message: "Заполните обязательные поля",
        color: "red",
      });
      return;
    }

    if (reportType === ReportType.Individual && !equipmentId) {
      notifications.show({
        title: "Ошибка",
        message: "Выберите оборудование для отчета",
        color: "red",
      });
      return;
    }

    try {
      setLoading(true);
      const report = await reportsApi.createReport({
        title,
        type: reportType as ReportType,
        startDate:
          startDate instanceof Date ? startDate : new Date(startDate as string),
        endDate:
          endDate instanceof Date ? endDate : new Date(endDate as string),
        equipmentId: equipmentId || undefined,
        notes: notes || undefined,
        createdBy: {
          id: userId,
        },
      });

      notifications.show({
        title: "Успех",
        message: `Отчет "${title}" успешно создан`,
        color: "green",
      });

      // Закрываем модальное окно и перенаправляем пользователя на страницу отчета
      close();
      router.push(`/reports/${report.id}`);
    } catch (error) {
      console.error("Error creating report:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось создать отчет",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoadingEquipment(true);
      try {
        const equipment = await trackingApi.getEquipmentList();
        setEquipmentList(equipment);
      } catch (error) {
        console.error("Error fetching equipment:", error);
        notifications.show({
          title: "Ошибка",
          message: "Не удалось загрузить список оборудования",
          color: "red",
        });
      } finally {
        setLoadingEquipment(false);
      }
    };

    fetchEquipment();
  }, []);

  const resetForm = () => {
    setTitle("");
    setReportType(ReportType.Individual);
    setStartDate(new Date() as DateValue);
    setEndDate(new Date() as DateValue);
    setEquipmentId(null);
    setNotes("");
  };

  const handleOpenModal = () => {
    resetForm();
    open();
  };

  return (
    <AuthGuard>
      <AppShell>
        {loadingEquipment ? (
          <LoadingOverlay />
        ) : (
          <Stack>
            <ReportsTable onCreateReport={handleOpenModal} />

            <Modal
              opened={opened}
              onClose={close}
              title="Создание отчета о передвижениях"
              size="lg"
            >
              <Stack>
                <TextInput
                  label="Название отчета"
                  placeholder="Введите название отчета"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  required
                />
                <Select
                  label="Тип отчета"
                  placeholder="Выберите тип отчета"
                  data={[
                    { value: ReportType.Individual, label: "По оборудованию" },
                    { value: ReportType.Period, label: "За период" },
                  ]}
                  value={reportType}
                  onChange={setReportType}
                  required
                />{" "}
                <Group grow>
                  <DatePickerInput
                    label="Дата начала"
                    placeholder="Выберите дату начала"
                    value={startDate}
                    onChange={setStartDate}
                    leftSection={<IconCalendar size={16} />}
                    required
                    clearable={false}
                    maxDate={endDate instanceof Date ? endDate : undefined}
                  />

                  <DatePickerInput
                    label="Дата окончания"
                    placeholder="Выберите дату окончания"
                    value={endDate}
                    onChange={setEndDate}
                    leftSection={<IconCalendar size={16} />}
                    required
                    clearable={false}
                    minDate={startDate instanceof Date ? startDate : undefined}
                  />
                </Group>
                <Select
                  label="Оборудование"
                  placeholder="Выберите оборудование"
                  data={equipmentList.map((equipment) => ({
                    value: equipment.id,
                    label: `${equipment.name} (${equipment.serial_number})`,
                  }))}
                  value={equipmentId}
                  onChange={setEquipmentId}
                  required
                  searchable
                />
                <Divider label="Дополнительно" labelPosition="center" />
                <Textarea
                  label="Примечания"
                  placeholder="Введите примечания к отчету"
                  value={notes}
                  onChange={(e) => setNotes(e.currentTarget.value)}
                  minRows={3}
                />
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    * Обязательные поля
                  </Text>
                  <Group>
                    <Button variant="outline" onClick={close}>
                      Отмена
                    </Button>
                    <Button
                      leftSection={<IconFileReport size={16} />}
                      onClick={handleCreateReport}
                      loading={loading}
                    >
                      Создать отчет
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </Modal>
          </Stack>
        )}
      </AppShell>
    </AuthGuard>
  );
}
