"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  TextInput,
  Select,
  Textarea,
  Grid,
  LoadingOverlay,
  Stack,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { trackingApi } from "@/api/tracking";
import { CreateEquipmentRequest, EquipmentStatus } from "@/types/tracking";

interface CreateEquipmentModalProps {
  opened: boolean;
  onClose: () => void;
}

// Схема валидации формы
const schema = z.object({
  name: z.string().min(1, "Название обязательно"),
  serial_number: z.string().min(1, "Серийный номер обязателен"),
  category: z.string().min(1, "Категория обязательна"),
  description: z.string().optional(),
  manufacturer: z.string().min(1, "Производитель обязателен"),
  purchase_date: z
    .date()
    .refine((date) => date !== null, "Дата покупки обязательна"),
  warranty_expiry: z.date().nullable().optional(),
  status: z.enum([
    EquipmentStatus.ACTIVE,
    EquipmentStatus.MAINTENANCE,
    EquipmentStatus.DECOMMISSIONED,
  ]),
  location: z.string().min(1, "Местоположение обязательно"),
  current_holder_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateEquipmentModal({
  opened,
  onClose,
}: CreateEquipmentModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      name: "",
      serial_number: "",
      category: "",
      description: "",
      manufacturer: "",
      purchase_date: new Date(),
      warranty_expiry: null,
      status: EquipmentStatus.ACTIVE,
      location: "",
      current_holder_id: "",
    },
    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      // Преобразуем даты в формат ISO для API
      const requestData: CreateEquipmentRequest = {
        ...values,
        purchase_date: values.purchase_date.toISOString().split("T")[0],
        warranty_expiry: values.warranty_expiry
          ? values.warranty_expiry.toISOString().split("T")[0]
          : undefined,
      };

      await trackingApi.createEquipment(requestData);

      notifications.show({
        title: "Успешно",
        message: "Оборудование добавлено",
        color: "green",
      });

      form.reset();
      onClose();
    } catch (error) {
      console.error("Error creating equipment:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось создать оборудование",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Добавить новое оборудование"
      size="lg"
    >
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Название"
                placeholder="Введите название оборудования"
                required
                {...form.getInputProps("name")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Серийный номер"
                placeholder="Введите серийный номер"
                required
                {...form.getInputProps("serial_number")}
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Категория"
                placeholder="Например: Компьютер, Принтер и т.д."
                required
                {...form.getInputProps("category")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Производитель"
                placeholder="Введите производителя"
                required
                {...form.getInputProps("manufacturer")}
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Описание"
            placeholder="Введите описание оборудования"
            {...form.getInputProps("description")}
          />

          <Grid>
            <Grid.Col span={6}>
              <DateInput
                label="Дата покупки"
                placeholder="Выберите дату"
                required
                clearable={false}
                {...form.getInputProps("purchase_date")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <DateInput
                label="Гарантия до"
                placeholder="Выберите дату"
                clearable
                {...form.getInputProps("warranty_expiry")}
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Статус"
                placeholder="Выберите статус"
                required
                data={[
                  { value: EquipmentStatus.ACTIVE, label: "Активно" },
                  {
                    value: EquipmentStatus.MAINTENANCE,
                    label: "На обслуживании",
                  },
                  { value: EquipmentStatus.DECOMMISSIONED, label: "Списано" },
                ]}
                {...form.getInputProps("status")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Местоположение"
                placeholder="Введите местоположение"
                required
                {...form.getInputProps("location")}
              />
            </Grid.Col>
          </Grid>

          <TextInput
            label="ID текущего держателя"
            placeholder="Опционально: ID сотрудника, ответственного за оборудование"
            {...form.getInputProps("current_holder_id")}
          />

          <Grid mt="md">
            <Grid.Col span={6}>
              <Button variant="outline" onClick={onClose} fullWidth>
                Отмена
              </Button>
            </Grid.Col>
            <Grid.Col span={6}>
              <Button type="submit" fullWidth>
                Создать
              </Button>
            </Grid.Col>
          </Grid>
        </Stack>
      </form>
    </Modal>
  );
}
