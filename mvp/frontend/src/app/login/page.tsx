"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  loginStart,
  loginSuccess,
  loginFailure,
  updateUser,
} from "@/store/authSlice";
import { authApi } from "@/api/auth";
import {
  Button,
  Paper,
  PasswordInput,
  TextInput,
  Title,
  Text,
  Container,
  Stack,
  Center,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { notifications } from "@mantine/notifications";

const schema = z.object({
  username: z.string().min(1, "Логин обязателен"),
  password: z.string().min(1, "Пароль обязателен"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      username: "",
      password: "",
    },
    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      dispatch(loginStart());

      // Очищаем старые данные в localStorage, если они есть
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      // Выполняем вход
      const response = await authApi.login(values);
      
      // Сохраняем токены в localStorage
      localStorage.setItem("token", response.token);
      localStorage.setItem("refreshToken", response.refresh_token);
      
      // Обновляем состояние redux
      dispatch(loginSuccess(response));

      // После успешного входа загружаем полный профиль пользователя
      try {
        // Используем новый токен для запроса профиля
        const userProfile = await authApi.getProfile();
        dispatch(updateUser(userProfile));
        // Сохраняем профиль в localStorage
        localStorage.setItem("user", JSON.stringify(userProfile));
      } catch (profileError) {
        console.error("Ошибка при загрузке профиля:", profileError);
        // Если не удалось загрузить профиль, все равно продолжаем
        // т.к. основная аутентификация прошла успешно
      }

      notifications.show({
        title: "Успешный вход",
        message: "Добро пожаловать в систему!",
        color: "green",
      });

      router.push("/dashboard");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Ошибка входа в систему";
      dispatch(loginFailure(errorMessage));

      notifications.show({
        title: "Ошибка",
        message: errorMessage,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="xs" px="xs">
      <Center mih="100vh">
        <Paper radius="md" p="xl" withBorder w="100%">
          <Stack gap="md">
            <Center>
              <Title order={2}>Система управления складом</Title>
            </Center>

            <Text c="dimmed" ta="center">
              Войдите в систему, используя ваш логин и пароль
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label="Логин"
                  placeholder="Введите ваш логин"
                  required
                  {...form.getInputProps("username")}
                />

                <PasswordInput
                  label="Пароль"
                  placeholder="Введите ваш пароль"
                  required
                  {...form.getInputProps("password")}
                />

                <Button type="submit" fullWidth loading={isLoading} mt="md">
                  Войти
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
}
