"use client";

import { NavLink, Stack, Text, rem } from "@mantine/core";
import {
  IconDashboard,
  IconArrowsExchange,
  IconBell,
  IconUsers,
  IconBuildingWarehouse,
  IconFileInvoice,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useSelector((state: RootState) => state.auth);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;

  return (
    <Stack gap="sm" p="md">
      <Text fw={700} size="lg" mb="md">
        Система управления складом
      </Text>

      <NavLink
        component={Link}
        href="/dashboard"
        label="Дашборд"
        leftSection={
          <IconDashboard style={{ width: rem(20), height: rem(20) }} />
        }
        active={pathname === "/dashboard"}
      />

      <NavLink
        component={Link}
        href="/warehouse"
        label="Склад"
        active={pathname === "/warehouse" || pathname.startsWith("/warehouse/")}
        leftSection={
          <IconBuildingWarehouse style={{ width: rem(20), height: rem(20) }} />
        }
      />

      <NavLink
        component={Link}
        href="/tracking"
        label="Отслеживание"
        leftSection={
          <IconArrowsExchange style={{ width: rem(20), height: rem(20) }} />
        }
        active={pathname === "/tracking" || pathname.startsWith("/tracking/")}
      />

      <NavLink
        component={Link}
        href="/notifications"
        label="Уведомления"
        leftSection={<IconBell style={{ width: rem(20), height: rem(20) }} />}
        active={pathname === "/notifications"}
      />

      <NavLink
        component={Link}
        href="/invoices"
        label="Накладные"
        leftSection={
          <IconFileInvoice style={{ width: rem(20), height: rem(20) }} />
        }
        active={pathname === "/invoices" || pathname.startsWith("/invoices/")}
      />
      <NavLink
        component={Link}
        href="/reports"
        label="Отчеты"
        leftSection={
          <IconFileInvoice style={{ width: rem(20), height: rem(20) }} />
        }
        active={pathname === "/reports" || pathname.startsWith("/reports/")}
      />

      {isAdmin || isManager ? (
        <NavLink
          component={Link}
          href="/users"
          label="Пользователи"
          leftSection={
            <IconUsers style={{ width: rem(20), height: rem(20) }} />
          }
          active={pathname === "/users" || pathname.startsWith("/users/")}
        />
      ) : null}
    </Stack>
  );
}
