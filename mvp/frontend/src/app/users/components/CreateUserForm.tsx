"use client";

import { useState } from "react";
import {
  TextInput,
  Button,
  Group,
  PasswordInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { authApi } from "@/api/auth";
import { notifications } from "@mantine/notifications";
import { User, UserRole } from "@/types/user";

interface CreateUserFormProps {
  onUserCreated: (user: User) => void;
  onCancel: () => void;
}

const schema = z.object({
  username: z.string().min(3, "Минимум 3 символа"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  first_name: z.string().min(1, "Обязательное поле"),
  last_name: z.string().min(1, "Обязательное поле"),
  department: z.string().optional(),
  position: z.string().optional(),
  role: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateUserForm({
  onUserCreated,
  onCancel,
}: CreateUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      department: "",
      position: "",
      role: UserRole.EMPLOYEE,
    },
    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const response = await authApi.createUser(values);

      notifications.show({
        title: "Успешно",
        message: "Пользователь успешно создан",
        color: "green",
      });

      onUserCreated(response.user);
    } catch (error: any) {
      console.error("Error creating user:", error);
      notifications.show({
        title: "Ошибка",
        message:
          error.response?.data?.error || "Не удалось создать пользователя",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Group grow>
          <TextInput
            label="Логин"
            placeholder="Введите логин"
            required
            {...form.getInputProps("username")}
          />
          <TextInput
            label="Email"
            placeholder="Введите email"
            required
            {...form.getInputProps("email")}
          />
        </Group>

        <PasswordInput
          label="Пароль"
          placeholder="Введите пароль"
          required
          {...form.getInputProps("password")}
        />

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

        <Select
          label="Роль"
          placeholder="Выберите роль"
          data={[
            { value: UserRole.ADMIN, label: "Администратор" },
            { value: UserRole.MANAGER, label: "Менеджер" },
            { value: UserRole.WAREHOUSE, label: "Сотрудник склада" },
            { value: UserRole.EMPLOYEE, label: "Обычный сотрудник" },
          ]}
          {...form.getInputProps("role")}
        />

        <Text size="xs" c="dimmed">
          * После создания пользователя Ethereum адрес будет сгенерирован
          автоматически
        </Text>

        <Group justify="flex-end">
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" loading={isLoading}>
            Создать
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
