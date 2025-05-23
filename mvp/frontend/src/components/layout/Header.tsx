"use client";

import {
  Burger,
  Group,
  ActionIcon,
  Text,
  Badge,
  Menu,
  Avatar,
  Divider,
} from "@mantine/core";
import {
  IconBell,
  IconUser,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { logout } from "@/store/authSlice";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HeaderProps {
  opened: boolean;
  setOpened: (opened: boolean) => void;
}

export default function Header({ opened, setOpened }: HeaderProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { unreadCount } = useSelector(
    (state: RootState) => state.notifications
  );
  const dispatch = useDispatch();
  const router = useRouter();

  return (
    <Group px="md" h="100%" justify="space-between">
      <Group>
        <Burger opened={opened} onClick={() => setOpened(!opened)} size="sm" />
        <Text size="lg" fw={700}>
          СУС
        </Text>
      </Group>

      <Group>
        <Menu position="bottom-end" withArrow>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              radius="xl"
              size="lg"
              aria-label="Уведомления"
            >
              <IconBell />
              {unreadCount > 0 && (
                <Badge
                  size="xs"
                  variant="filled"
                  color="red"
                  className="absolute -top-1 -right-1"
                >
                  {unreadCount}
                </Badge>
              )}
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Уведомления</Menu.Label>
            <Menu.Item component={Link} href="/notifications">
              Просмотреть все
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Menu position="bottom-end" withArrow>
          <Menu.Target>
            <Avatar
              radius="xl"
              variant="filled"
              color="blue"
              className="cursor-pointer"
            >
              {user?.first_name?.[0] || user?.username?.[0] || "U"}
            </Avatar>
          </Menu.Target>
          <Menu.Dropdown>
            {user && (
              <>
                <Menu.Label>
                  {user.first_name} {user.last_name}
                </Menu.Label>
                <Menu.Label>{user.role}</Menu.Label>
                <Divider />
              </>
            )}
            <Menu.Item
              leftSection={<IconUser size={16} />}
              component={Link}
              href="/profile"
            >
              Профиль
            </Menu.Item>
            <Menu.Item
              leftSection={<IconSettings size={16} />}
              component={Link}
              href="/profile/settings"
            >
              Настройки
            </Menu.Item>
            <Divider />
            <Menu.Item
              leftSection={<IconLogout size={16} />}
              color="red"
              onClick={() => {
                dispatch(logout());
                router.push("/login");
              }}
            >
              Выйти
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
