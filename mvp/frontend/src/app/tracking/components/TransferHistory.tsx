"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Text,
  Alert,
  Button,
  LoadingOverlay,
  Badge,
  Card,
  Tabs,
  Group,
  Skeleton,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconAlertCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { trackingApi } from "@/api/tracking";
import { Transfer, BlockchainHistoryResponse } from "@/types/tracking";
import { useUserFullName, formatEthAddressWithName } from "@/hooks/useUserInfo";

// Вспомогательный компонент для отображения имени пользователя
const UserNameDisplay = ({ userId }: { userId: string | null | undefined }) => {
  const { fullName, loading } = useUserFullName(userId);
  
  if (loading) {
    return <Skeleton height={20} width={100} />;
  }
  
  return (
    <Tooltip label={userId || 'Склад'} disabled={!userId}>
      <Text>{fullName}</Text>
    </Tooltip>
  );
};

// Компонент для отображения Ethereum-адреса с ФИО
const EthAddressWithName = ({ address }: { address: string | null | undefined }) => {
  const [displayText, setDisplayText] = useState<string>(address || "Склад");
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const formatAddress = async () => {
      if (!address) {
        setDisplayText("Склад");
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const formattedText = await formatEthAddressWithName(address);
        setDisplayText(formattedText);
      } catch (error) {
        console.error("Error formatting address:", error);
        setDisplayText(address);
      } finally {
        setIsLoading(false);
      }
    };
    
    formatAddress();
  }, [address]);
  
  if (isLoading) {
    return <Skeleton height={20} width={180} />;
  }
  
  return <Text size="sm">{displayText}</Text>;
};

interface TransferHistoryProps {
  equipmentId: string | null;
}

export default function TransferHistory({ equipmentId }: TransferHistoryProps) {
  const [transferHistory, setTransferHistory] = useState<Transfer[]>([]);
  const [blockchainHistory, setBlockchainHistory] =
    useState<BlockchainHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("database");

  // Загрузка истории передач
  useEffect(() => {
    const fetchHistory = async () => {
      if (!equipmentId) return;

      try {
        setLoading(true);
        const data = await trackingApi.getTransferHistory(equipmentId);
        setTransferHistory(data);
      } catch (error) {
        console.error("Error fetching transfer history:", error);
        notifications.show({
          title: "Ошибка",
          message: "Не удалось загрузить историю передач",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };

    if (equipmentId) {
      fetchHistory();
    } else {
      setTransferHistory([]);
    }
  }, [equipmentId]);

  // Функция для загрузки истории из блокчейна
  const fetchBlockchainHistory = async () => {
    if (!equipmentId) return;

    try {
      setLoading(true);
      const data = await trackingApi.getBlockchainHistory(equipmentId);
      setBlockchainHistory(data);
      setActiveTab("blockchain");
    } catch (error) {
      console.error("Error fetching blockchain history:", error);
      notifications.show({
        title: "Ошибка",
        message: "Не удалось загрузить историю из блокчейна",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!equipmentId) {
    return (
      <Alert
        icon={<IconInfoCircle size={16} />}
        title="Информация"
        color="blue"
      >
        Выберите оборудование, чтобы просмотреть историю передач
      </Alert>
    );
  }

  return (
    <Card withBorder p="md" pos="relative">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Group justify="space-between" mb="md">
          <Tabs.List>
            <Tabs.Tab value="database">История из базы данных</Tabs.Tab>
            <Tabs.Tab value="blockchain">История из блокчейна</Tabs.Tab>
          </Tabs.List>

          <Button size="xs" onClick={fetchBlockchainHistory} disabled={loading}>
            Обновить из блокчейна
          </Button>
        </Group>

        <Tabs.Panel value="database">
          {transferHistory?.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              История передач пуста
            </Alert>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Дата передачи</Table.Th>
                  <Table.Th>От кого</Table.Th>
                  <Table.Th>Кому</Table.Th>
                  <Table.Th>Причина</Table.Th>
                  <Table.Th>Блокчейн TX</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {transferHistory?.map((transfer) => {
                  const date = new Date(transfer.transfer_date);
                  const formattedDate = date.toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <Table.Tr key={transfer.id}>
                      <Table.Td>{formattedDate}</Table.Td>
                      <Table.Td>
                        <UserNameDisplay userId={transfer.from_holder_id} />
                      </Table.Td>
                      <Table.Td>
                        <UserNameDisplay userId={transfer.to_holder_id} />
                      </Table.Td>
                      <Table.Td>{transfer.transfer_reason}</Table.Td>
                      <Table.Td>
                        {transfer.blockchain_tx_id ? (
                          <Badge color="teal">Подтверждено</Badge>
                        ) : (
                          <Badge color="gray">Не записано</Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="blockchain">
          {!blockchainHistory ? (
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              Нажмите на кнопку Обновить из блокчейна, чтобы загрузить историю
            </Alert>
          ) : blockchainHistory.blockchain_history.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              История передач в блокчейне пуста
            </Alert>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Время</Table.Th>
                  <Table.Th>От кого</Table.Th>
                  <Table.Th>Кому</Table.Th>
                  <Table.Th>Заметки</Table.Th>
                  <Table.Th>TX Hash</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {blockchainHistory.blockchain_history.map((record, index) => {
                  const date = new Date(parseInt(record.timestamp) * 1000);
                  const formattedDate = date.toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <Table.Tr key={index}>
                      <Table.Td>{formattedDate}</Table.Td>
                      <Table.Td>
                        <EthAddressWithName address={record.from} />
                      </Table.Td>
                      <Table.Td>
                        <EthAddressWithName address={record.to} />
                      </Table.Td>
                      <Table.Td>{record.notes}</Table.Td>
                      <Table.Td>
                        <Text size="xs" truncate>
                          {record.transaction_hash}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
