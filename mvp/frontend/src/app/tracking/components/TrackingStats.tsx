"use client";

import { useEffect, useState } from "react";
import {
  Card,
  SimpleGrid,
  Text,
  Group,
  RingProgress,
  Skeleton,
  Title,
} from "@mantine/core";
import { trackingApi } from "@/api/tracking";
import { EquipmentStatus } from "@/types/tracking";

export default function TrackingStats() {
  const [equipmentStats, setEquipmentStats] = useState<{
    total: number;
    active: number;
    maintenance: number;
    decommissioned: number;
    blockchainRegistered: number;
  }>({
    total: 0,
    active: 0,
    maintenance: 0,
    decommissioned: 0,
    blockchainRegistered: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Получаем все оборудование для расчета статистики
        const equipmentList = await trackingApi.getEquipmentList();

        // Рассчитываем статистику
        const stats = {
          total: equipmentList.length,
          active: equipmentList.filter(
            (e) => e.status === EquipmentStatus.ACTIVE
          ).length,
          maintenance: equipmentList.filter(
            (e) => e.status === EquipmentStatus.MAINTENANCE
          ).length,
          decommissioned: equipmentList.filter(
            (e) => e.status === EquipmentStatus.DECOMMISSIONED
          ).length,
          blockchainRegistered: equipmentList.filter(
            (e) => e.blockchain_id !== null
          ).length,
        };

        setEquipmentStats(stats);
      } catch (error) {
        console.error("Error fetching equipment stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Расчет процентов для статусов
  const getPercentage = (value: number) => {
    if (equipmentStats.total === 0) return 0;
    return Math.round((value / equipmentStats.total) * 100);
  };

  const activePercent = getPercentage(equipmentStats.active);
  const maintenancePercent = getPercentage(equipmentStats.maintenance);
  const decommissionedPercent = getPercentage(equipmentStats.decommissioned);
  const blockchainPercent = getPercentage(equipmentStats.blockchainRegistered);

  return (
    <Card withBorder p="md" radius="md" mb="md">
      <Title order={4} mb="md">
        Сводная информация
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <Skeleton visible={loading}>
          <Card withBorder radius="md" p="xs" style={{ height: "100%" }}>
            <Group>
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[{ value: activePercent, color: "green" }]}
                label={
                  <Text ta="center" fz="lg" fw={700}>
                    {activePercent}%
                  </Text>
                }
              />
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Активно
                </Text>
                <Group align="flex-end" gap={5}>
                  <Text fz="xl" fw={700}>
                    {equipmentStats.active}
                  </Text>
                  <Text c="green" size="sm" fw={500}>
                    из {equipmentStats.total}
                  </Text>
                </Group>
              </div>
            </Group>
          </Card>
        </Skeleton>

        <Skeleton visible={loading}>
          <Card withBorder radius="md" p="xs" style={{ height: "100%" }}>
            <Group>
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[{ value: maintenancePercent, color: "yellow" }]}
                label={
                  <Text ta="center" fz="lg" fw={700}>
                    {maintenancePercent}%
                  </Text>
                }
              />
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  На обслуживании
                </Text>
                <Group align="flex-end" gap={5}>
                  <Text fz="xl" fw={700}>
                    {equipmentStats.maintenance}
                  </Text>
                  <Text c="yellow" size="sm" fw={500}>
                    из {equipmentStats.total}
                  </Text>
                </Group>
              </div>
            </Group>
          </Card>
        </Skeleton>

        <Skeleton visible={loading}>
          <Card withBorder radius="md" p="xs" style={{ height: "100%" }}>
            <Group>
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[{ value: decommissionedPercent, color: "red" }]}
                label={
                  <Text ta="center" fz="lg" fw={700}>
                    {decommissionedPercent}%
                  </Text>
                }
              />
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Списано
                </Text>
                <Group align="flex-end" gap={5}>
                  <Text fz="xl" fw={700}>
                    {equipmentStats.decommissioned}
                  </Text>
                  <Text c="red" size="sm" fw={500}>
                    из {equipmentStats.total}
                  </Text>
                </Group>
              </div>
            </Group>
          </Card>
        </Skeleton>

        <Skeleton visible={loading}>
          <Card withBorder radius="md" p="xs" style={{ height: "100%" }}>
            <Group>
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[{ value: blockchainPercent, color: "teal" }]}
                label={
                  <Text ta="center" fz="lg" fw={700}>
                    {blockchainPercent}%
                  </Text>
                }
              />
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  В блокчейне
                </Text>
                <Group align="flex-end" gap={5}>
                  <Text fz="xl" fw={700}>
                    {equipmentStats.blockchainRegistered}
                  </Text>
                  <Text c="teal" size="sm" fw={500}>
                    из {equipmentStats.total}
                  </Text>
                </Group>
              </div>
            </Group>
          </Card>
        </Skeleton>
      </SimpleGrid>
    </Card>
  );
}
