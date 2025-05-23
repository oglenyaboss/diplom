"use client";

import { useState } from "react";
import { Tabs, Stack, Title, Group, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconTransferIn,
  IconClipboardList,
  IconHistory,
  IconFileAnalytics,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import EquipmentTable from "./components/EquipmentTable";
import TransferHistory from "./components/TransferHistory";
import RecentOperations from "./components/RecentOperations";
import CreateEquipmentModal from "./components/CreateEquipmentModal";
import TransferEquipmentModal from "./components/TransferEquipmentModal";
import TrackingServiceStatus from "./components/TrackingServiceStatus";
import TrackingStats from "./components/TrackingStats";
import TrackingInstructions from "./components/TrackingInstructions";
import AuthGuard from "@/components/common/AuthGuard";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import AppShell from "@/components/layout/AppShell";

export default function TrackingPage() {
  const [activeTab, setActiveTab] = useState<string | null>("equipment");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(
    null
  );
  const [isLoading] = useState(false);
  const router = useRouter();

  // Модальные окна
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [
    transferModalOpened,
    { open: openTransferModal, close: closeTransferModal },
  ] = useDisclosure(false);

  // Функция для выбора оборудования и открытия модального окна передачи
  const handleTransferClick = (equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
    openTransferModal();
  };

  return (
    <AuthGuard>
      {isLoading ? (
        <LoadingOverlay message="Загрузка данных отслеживания..." />
      ) : (
        <AppShell>
          <Stack gap="lg">
            <Group justify="space-between" mb="lg">
              <Title order={1}>Система отслеживания оборудования</Title>
              <Group>
                <Button
                  leftSection={<IconPlus size={18} />}
                  onClick={openCreateModal}
                >
                  Добавить оборудование
                </Button>
                {selectedEquipmentId && (
                  <Button
                    leftSection={<IconTransferIn size={18} />}
                    onClick={() => openTransferModal()}
                    variant="outline"
                  >
                    Передать оборудование
                  </Button>
                )}
                <Button
                  leftSection={<IconFileAnalytics size={18} />}
                  onClick={() => router.push("/reports")}
                  variant="outline"
                >
                  Отчеты
                </Button>
              </Group>
            </Group>

            <TrackingServiceStatus />
            <TrackingStats />
            <TrackingInstructions />

            <Tabs value={activeTab} onChange={setActiveTab} mb="xl">
              <Tabs.List>
                <Tabs.Tab
                  value="equipment"
                  leftSection={<IconClipboardList size={16} />}
                >
                  Оборудование
                </Tabs.Tab>
                <Tabs.Tab
                  value="history"
                  leftSection={<IconHistory size={16} />}
                >
                  История передач
                </Tabs.Tab>
                <Tabs.Tab
                  value="operations"
                  leftSection={<IconHistory size={16} />}
                >
                  Недавние операции
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="equipment">
                <EquipmentTable
                  onSelectEquipment={setSelectedEquipmentId}
                  onTransferClick={handleTransferClick}
                  selectedEquipmentId={selectedEquipmentId}
                />
              </Tabs.Panel>

              <Tabs.Panel value="history">
                <TransferHistory equipmentId={selectedEquipmentId} />
              </Tabs.Panel>

              <Tabs.Panel value="operations">
                <RecentOperations />
              </Tabs.Panel>
            </Tabs>

            {/* Модальные окна */}
            <CreateEquipmentModal
              opened={createModalOpened}
              onClose={closeCreateModal}
            />
            <TransferEquipmentModal
              opened={transferModalOpened}
              onClose={closeTransferModal}
              equipmentId={selectedEquipmentId}
            />
          </Stack>
        </AppShell>
      )}
    </AuthGuard>
  );
}
