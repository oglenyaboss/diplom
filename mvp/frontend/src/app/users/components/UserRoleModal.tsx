"use client";

import { useState } from "react";
import { Button, Group, Select, Text } from "@mantine/core";
import { User, UserRole } from "@/types/user";

interface UserRoleModalProps {
  user: User;
  onSave: (userId: string, newRole: string) => void;
  onCancel: () => void;
}

export default function UserRoleModal({
  user,
  onSave,
  onCancel,
}: UserRoleModalProps) {
  const [role, setRole] = useState<string>(user.role);

  const handleSave = () => {
    onSave(user.id, role);
  };

  return (
    <div>
      <Text mb="md">
        Изменение роли для пользователя <b>{user.username}</b>
      </Text>

      <Select
        label="Выберите роль"
        placeholder="Выберите роль"
        data={[
          { value: UserRole.ADMIN, label: "Администратор" },
          { value: UserRole.MANAGER, label: "Менеджер" },
          { value: UserRole.WAREHOUSE, label: "Сотрудник склада" },
          { value: UserRole.EMPLOYEE, label: "Обычный сотрудник" },
        ]}
        value={role}
        onChange={(value) => setRole(value || "")}
        mb="md"
      />

      <Group justify="flex-end">
        <Button variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button onClick={handleSave}>Сохранить</Button>
      </Group>
    </div>
  );
}
