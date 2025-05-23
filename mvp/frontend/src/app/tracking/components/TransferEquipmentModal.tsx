"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Textarea,
  Grid,
  LoadingOverlay,
  Stack,
  Text,
  Select,
  Skeleton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { trackingApi } from "@/api/tracking";
import { authApi } from "@/api/auth";
import { Equipment, TransferEquipmentRequest } from "@/types/tracking";
import { useUserFullName } from "@/hooks/useUserInfo";

interface TransferEquipmentModalProps {
  opened: boolean;
  onClose: () => void;
  equipmentId: string | null;
}

// Схема валидации формы
const schema = z.object({
  to_holder_id: z.string().min(1, "ID получателя обязателен"),
  transfer_reason: z.string().min(3, "Причина передачи обязательна"),
});

type FormValues = z.infer<typeof schema>;

export default function TransferEquipmentModal({
  opened,
  onClose,
  equipmentId,
}: TransferEquipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Используем хук для получения имени текущего держателя
  const { fullName, loading: loadingUserName } = useUserFullName(
    equipment?.current_holder_id
  );

  const form = useForm<FormValues>({
    initialValues: {
      to_holder_id: "",
      transfer_reason: "",
    },
    validate: zodResolver(schema),
  });

  // Загрузка списка пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      if (opened) {
        try {
          setLoadingUsers(true);
          const { users } = await authApi.getUsers();
          // Форматируем пользователей для компонента Select
          const formattedUsers = users.map((user) => ({
            value: user.id,
            label: `${user.first_name} ${user.last_name} (${user.username})`,
          }));
          setUsers(formattedUsers);
        } catch (error) {
          console.error("Error fetching users:", error);
          notifications.show({
            title: "Ошибка",
            message: "Не удалось загрузить список пользователей",
            color: "red",
          });
        } finally {
          setLoadingUsers(false);
        }
      }
    };

    fetchUsers();
  }, [opened]);

  // Загрузка информации о выбранном оборудовании
  useEffect(() => {
    const fetchEquipmentDetails = async () => {
      if (equipmentId) {
        try {
          setLoading(true);
          const data = await trackingApi.getEquipment(equipmentId);
          setEquipment(data);
        } catch (error) {
          console.error("Error fetching equipment details:", error);
          notifications.show({
            title: "Ошибка",
            message: "Не удалось загрузить информацию об оборудовании",
            color: "red",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    if (opened && equipmentId) {
      fetchEquipmentDetails();
    }
  }, [equipmentId, opened]);

  const handleSubmit = async (values: FormValues) => {
    if (!equipmentId) return;

    try {
      setLoading(true);

      const transferData: TransferEquipmentRequest = {
        equipment_id: equipmentId,
        to_holder_id: values.to_holder_id,
        transfer_reason: values.transfer_reason,
        // Если есть текущий держатель, указываем его как отправителя
        from_holder_id: equipment?.current_holder_id || null,
      };

      await trackingApi.transferEquipment(transferData);

      notifications.show({
        title: "Успешно",
        message: "Оборудование передано",
        color: "green",
      });

      form.reset();
      onClose();
    } catch (error) {
      console.error("Error transferring equipment:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось передать оборудование",
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
      title="Передача оборудования"
      size="md"
    >
      <LoadingOverlay
        visible={loading || loadingUsers}
        overlayProps={{ blur: 2 }}
      />

      {equipment ? (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Text fw={500}>Оборудование: {equipment.name}</Text>
            <Text size="sm">Серийный номер: {equipment.serial_number}</Text>
            <Text size="sm">
              Текущий держатель:{" "}
              {loadingUserName ? (
                <Skeleton height={18} width={120} />
              ) : (
                fullName
              )}
            </Text>

            <Select
              label="Новый держатель"
              placeholder="Выберите нового держателя"
              required
              data={users}
              searchable
              nothingFoundMessage="Пользователь не найден"
              {...form.getInputProps("to_holder_id")}
            />

            <Textarea
              label="Причина передачи"
              placeholder="Укажите причину передачи оборудования"
              required
              minRows={3}
              {...form.getInputProps("transfer_reason")}
            />

            <Grid mt="md">
              <Grid.Col span={6}>
                <Button variant="outline" onClick={onClose} fullWidth>
                  Отмена
                </Button>
              </Grid.Col>
              <Grid.Col span={6}>
                <Button type="submit" fullWidth>
                  Передать
                </Button>
              </Grid.Col>
            </Grid>
          </Stack>
        </form>
      ) : (
        !loading && <Text>Выберите оборудование для передачи</Text>
      )}
    </Modal>
  );
}
