"use client";

import { useState } from "react";
import {
  TextInput,
  Button,
  Group,
  PasswordInput,
  Stack,
  Text,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { authApi } from "@/api/auth";
import { notifications } from "@mantine/notifications";
import { User } from "@/types/user";

interface EditUserFormProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onCancel: () => void;
}

const schema = z.object({
  first_name: z.string().min(1, "Обязательное поле"),
  last_name: z.string().min(1, "Обязательное поле"),
  email: z.string().email("Некорректный email"),
  department: z.string().optional(),
  position: z.string().optional(),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EditUserForm({
  user,
  onUserUpdated,
  onCancel,
}: EditUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      department: user.department || "",
      position: user.position || "",
      password: "",
    },
    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);

      // Убираем пустые поля, в том числе пароль если он не заполнен
      const updateData = Object.entries(values).reduce((acc, [key, value]) => {
        if (value !== "" && (key !== "password" || value)) {
          return { ...acc, [key]: value };
        }
        return acc;
      }, {});

      // Обновляем профиль пользователя
      await authApi.updateProfile(updateData);

      notifications.show({
        title: "Успешно",
        message: "Данные пользователя обновлены",
        color: "green",
      });

      // Получаем обновленные данные пользователя
      const updatedUser = await authApi.getUser(user.id);

      onUserUpdated(updatedUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      notifications.show({
        title: "Ошибка",
        message:
          error.response?.data?.error ||
          "Не удалось обновить данные пользователя",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Text fw={500}>Пользователь: {user.username}</Text>

        <Group grow>
          <TextInput
            label="Имя"
            placeholder="Введите имя"
            required
            {...form.getInputProps("first_name")}
          />
          <TextInput
            label="Фамилия"
            placeholder="Введите фамилию"
            required
            {...form.getInputProps("last_name")}
          />
        </Group>

        <TextInput
          label="Email"
          placeholder="Введите email"
          required
          {...form.getInputProps("email")}
        />

        <Group grow>
          <TextInput
            label="Должность"
            placeholder="Введите должность"
            {...form.getInputProps("position")}
          />
          <TextInput
            label="Отдел"
            placeholder="Введите отдел"
            {...form.getInputProps("department")}
          />
        </Group>

        <PasswordInput
          label="Новый пароль"
          placeholder="Оставьте пустым, чтобы не менять"
          {...form.getInputProps("password")}
        />

        <Group justify="flex-end">
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" loading={isLoading}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
