"use client";

import { useEffect, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import {
  Card,
  Table,
  Title,
  Text,
  Group,
  ActionIcon,
  Menu,
  Button,
  Badge,
  Modal,
  Select,
  Switch,
  Tooltip,
} from "@mantine/core";
import {
  IconDotsVertical,
  IconEdit,
  IconKey,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { authApi } from "@/api/auth";
import AppShell from "@/components/layout/AppShell";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { User, UserRole } from "@/types/user";
import { formatDate } from "@/utils/formatters";
import CreateUserForm from "./components/CreateUserForm";
import EditUserForm from "./components/EditUserForm";
import UserRoleModal from "./components/UserRoleModal";
import AuthServiceStatus from "./components/AuthServiceStatus";
import { notifications } from "@mantine/notifications";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [roleModalOpened, { open: openRoleModal, close: closeRoleModal }] =
    useDisclosure(false);

  // Загрузка списка пользователей
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось загрузить список пользователей",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Обработчик обновления роли пользователя
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await authApi.updateUserRole(userId, newRole);
      notifications.show({
        title: "Успешно",
        message: `Роль пользователя изменена на ${newRole}`,
        color: "green",
      });

      // Обновляем данные в списке
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      closeRoleModal();
    } catch (error) {
      console.error("Error updating user role:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось обновить роль пользователя",
        color: "red",
      });
    }
  };

  // Обновление статуса пользователя (активен/не активен)
  const handleStatusChange = async (user: User) => {
    try {
      await authApi.updateUserStatus(user.id, !user.is_active);
      notifications.show({
        title: "Успешно",
        message: `Статус пользователя ${user.username} изменен`,
        color: "green",
      });

      // Обновляем данные в списке
      setUsers(
        users.map((u) =>
          u.id === user.id ? { ...u, is_active: !u.is_active } : u
        )
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось обновить статус пользователя",
        color: "red",
      });
    }
  };

  // Обработчик создания нового пользователя
  const handleUserCreated = (newUser: User) => {
    setUsers([...users, newUser]);
    closeCreateModal();
  };

  // Обработчик обновления пользователя
  const handleUserUpdated = (updatedUser: User) => {
    setUsers(
      users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
    closeEditModal();
  };

  const openEditUserModal = (user: User) => {
    setSelectedUser(user);
    openEditModal();
  };

  const openRoleChangeModal = (user: User) => {
    setSelectedUser(user);
    openRoleModal();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "red";
      case UserRole.MANAGER:
        return "blue";
      case UserRole.WAREHOUSE:
        return "green";
      case UserRole.EMPLOYEE:
        return "gray";
      default:
        return "gray";
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? "green" : "red";
  };

  return (
    <AuthGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <AppShell>
        <LoadingOverlay visible={isLoading} />

        <Group justify="space-between" mb="lg">
          <Title order={2}>Управление пользователями</Title>
          <Button
            leftSection={<IconUserPlus size={20} />}
            onClick={openCreateModal}
          >
            Добавить пользователя
          </Button>
        </Group>

        <AuthServiceStatus />

        <div style={{ height: "20px" }}></div>

        <Card shadow="sm" p="md" radius="md" withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Имя пользователя</Table.Th>
                <Table.Th>ФИО</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Роль</Table.Th>
                <Table.Th>Статус</Table.Th>
                <Table.Th>Ethereum адрес</Table.Th>
                <Table.Th>Последний вход</Table.Th>
                <Table.Th style={{ width: "100px", textAlign: "right" }}>
                  Действия
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Text fw={500}>{user.username}</Text>
                    <Text size="xs" c="dimmed">
                      {user.department
                        ? `${user.position}, ${user.department}`
                        : user.position}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {user.first_name} {user.last_name}
                  </Table.Td>
                  <Table.Td>{user.email}</Table.Td>
                  <Table.Td>
                    <Badge color={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusBadgeColor(user.is_active)}>
                      {user.is_active ? "Активен" : "Неактивен"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {user.eth_address ? (
                      <Tooltip
                        label="Скопировать адрес"
                        withArrow
                        position="top"
                      >
                        <Text
                          size="xs"
                          style={{ fontFamily: "monospace", cursor: "pointer" }}
                          onClick={() => {
                            navigator.clipboard.writeText(user.eth_address);
                            notifications.show({
                              title: "Скопировано",
                              message:
                                "Ethereum адрес скопирован в буфер обмена",
                              color: "blue",
                            });
                          }}
                        >
                          {`${user.eth_address.substring(
                            0,
                            6
                          )}...${user.eth_address.substring(
                            user.eth_address.length - 4
                          )}`}
                        </Text>
                      </Tooltip>
                    ) : (
                      <Text size="xs" c="dimmed">
                        Не установлен
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {user.last_login
                      ? formatDate(user.last_login)
                      : "Не входил"}
                  </Table.Td>
                  <Table.Td>
                    <Menu position="left-start" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={() => openEditUserModal(user)}
                        >
                          Редактировать
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconKey size={14} />}
                          onClick={() => openRoleChangeModal(user)}
                        >
                          Изменить роль
                        </Menu.Item>
                        <Menu.Item
                          color={user.is_active ? "red" : "green"}
                          leftSection={<IconTrash size={14} />}
                          onClick={() => handleStatusChange(user)}
                        >
                          {user.is_active ? "Деактивировать" : "Активировать"}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}

              {users.length === 0 && !isLoading && (
                <Table.Tr>
                  <Table.Td colSpan={8} style={{ textAlign: "center" }}>
                    <Text c="dimmed" py="sm">
                      Пользователи не найдены
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Модальное окно создания пользователя */}
        <Modal
          opened={createModalOpened}
          onClose={closeCreateModal}
          title="Создание нового пользователя"
          size="lg"
        >
          <CreateUserForm
            onUserCreated={handleUserCreated}
            onCancel={closeCreateModal}
          />
        </Modal>

        {/* Модальное окно редактирования пользователя */}
        <Modal
          opened={editModalOpened}
          onClose={closeEditModal}
          title="Редактирование пользователя"
          size="lg"
        >
          {selectedUser && (
            <EditUserForm
              user={selectedUser}
              onUserUpdated={handleUserUpdated}
              onCancel={closeEditModal}
            />
          )}
        </Modal>

        {/* Модальное окно изменения роли */}
        <Modal
          opened={roleModalOpened}
          onClose={closeRoleModal}
          title="Изменение роли пользователя"
          size="md"
        >
          {selectedUser && (
            <UserRoleModal
              user={selectedUser}
              onSave={handleRoleUpdate}
              onCancel={closeRoleModal}
            />
          )}
        </Modal>
      </AppShell>
    </AuthGuard>
  );
}
