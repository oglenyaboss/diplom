"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Group,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Loader,
  Pagination,
  TextInput,
  Select,
  Stack,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconTransferIn,
  IconLockPin as IconBlockchain,
  IconSearch,
  IconDotsVertical,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { trackingApi } from "@/api/tracking";
import { authApi } from "@/api/auth";
import { Equipment, EquipmentStatus } from "@/types/tracking";
import { User } from "@/types/user";
import EditEquipmentModal from "./EditEquipmentModal";

interface EquipmentTableProps {
  onSelectEquipment: (id: string | null) => void;
  onTransferClick: (id: string) => void;
  selectedEquipmentId: string | null;
}

const statusColors = {
  [EquipmentStatus.ACTIVE]: "green",
  [EquipmentStatus.MAINTENANCE]: "yellow",
  [EquipmentStatus.DECOMMISSIONED]: "red",
};

const statusLabels = {
  [EquipmentStatus.ACTIVE]: "Активно",
  [EquipmentStatus.MAINTENANCE]: "На обслуживании",
  [EquipmentStatus.DECOMMISSIONED]: "Списано",
};

export default function EquipmentTable({
  onSelectEquipment,
  onTransferClick,
  selectedEquipmentId,
}: EquipmentTableProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(
    null
  );

  // Состояние для фильтрации и пагинации
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Загрузка пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const { users: usersList } = await authApi.getUsers();
        setUsers(usersList);
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
    };

    fetchUsers();
  }, []);

  // Функция для получения имени пользователя по ID
  const getUserName = (userId: string | null): string => {
    if (!userId) return "Склад";

    const user = users.find((u) => u.id === userId);
    if (!user) return userId; // Если пользователь не найден, возвращаем ID

    return `${user.first_name} ${user.last_name}`;
  };

  // Загрузка данных оборудования
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const data = await trackingApi.getEquipmentList();
      setEquipment(data);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось загрузить список оборудования",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  // Обработчики действий
  const handleEdit = (item: Equipment) => {
    setCurrentEquipment(item);
    openEditModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Вы уверены, что хотите удалить это оборудование?")) {
      try {
        await trackingApi.deleteEquipment(id);
        notifications.show({
          title: "Успешно",
          message: "Оборудование удалено",
          color: "green",
        });
        fetchEquipment();
      } catch (error) {
        console.error("Error deleting equipment:", error);
        notifications.show({
          title: "Ошибка",
          message: "Не удалось удалить оборудование",
          color: "red",
        });
      }
    }
  };

  const handleRegisterBlockchain = async (id: string) => {
    try {
      setLoading(true);
      await trackingApi.registerInBlockchain(id);
      notifications.show({
        title: "Успешно",
        message: "Оборудование зарегистрировано в блокчейне",
        color: "teal",
      });
      fetchEquipment();
    } catch (error) {
      console.error("Error registering in blockchain:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось зарегистрировать оборудование в блокчейне",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация и пагинация
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter ? item.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const paginatedEquipment = filteredEquipment.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);

  if ((loading && equipment.length === 0) || loadingUsers) {
    return <Loader size="xl" />;
  }

  return (
    <Stack>
      <Group justify="space-between">
        <TextInput
          placeholder="Поиск по названию, серийному номеру или категории"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Фильтр по статусу"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: "", label: "Все статусы" },
            { value: EquipmentStatus.ACTIVE, label: "Активно" },
            { value: EquipmentStatus.MAINTENANCE, label: "На обслуживании" },
            { value: EquipmentStatus.DECOMMISSIONED, label: "Списано" },
          ]}
          style={{ width: 200 }}
          clearable
        />
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Название</Table.Th>
            <Table.Th>Серийный номер</Table.Th>
            <Table.Th>Категория</Table.Th>
            <Table.Th>Производитель</Table.Th>
            <Table.Th>Статус</Table.Th>
            <Table.Th>Местоположение</Table.Th>
            <Table.Th>Текущий владелец</Table.Th>
            <Table.Th>Блокчейн айди</Table.Th>
            <Table.Th>Блокчейн</Table.Th>
            <Table.Th>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paginatedEquipment.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text ta="center">Оборудование не найдено</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            paginatedEquipment.map((item) => (
              <Table.Tr
                key={item.id}
                bg={
                  selectedEquipmentId === item.id
                    ? "var(--mantine-color-blue-light)"
                    : undefined
                }
                onClick={() => onSelectEquipment(item.id)}
                style={{ cursor: "pointer" }}
              >
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>{item.serial_number}</Table.Td>
                <Table.Td>{item.category}</Table.Td>
                <Table.Td>{item.manufacturer}</Table.Td>
                <Table.Td>
                  <Badge color={statusColors[item.status]}>
                    {statusLabels[item.status]}
                  </Badge>
                </Table.Td>
                <Table.Td>{item.location}</Table.Td>
                <Table.Td>{getUserName(item.current_holder_id)}</Table.Td>
                <Table.Td>{item.blockchain_id || "Не указано"}</Table.Td>
                <Table.Td>
                  {item.blockchain_id ? (
                    <Badge color="teal">Зарегистрировано</Badge>
                  ) : (
                    <Badge color="gray">Не зарегистрировано</Badge>
                  )}
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <Menu withinPortal position="bottom-end" shadow="sm">
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                        >
                          Редактировать
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTransferIn size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTransferClick(item.id);
                          }}
                        >
                          Передать
                        </Menu.Item>
                        {!item.blockchain_id && (
                          <Menu.Item
                            leftSection={<IconBlockchain size={16} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegisterBlockchain(item.id);
                            }}
                          >
                            Регистрировать в блокчейне
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                        <Menu.Item
                          leftSection={<IconTrash size={16} />}
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          Удалить
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            value={page}
            onChange={setPage}
            total={totalPages}
            withEdges
          />
        </Group>
      )}

      {currentEquipment && (
        <EditEquipmentModal
          opened={editModalOpened}
          onClose={() => {
            closeEditModal();
            setCurrentEquipment(null);
          }}
          equipment={currentEquipment}
          onUpdate={fetchEquipment}
        />
      )}
    </Stack>
  );
}
