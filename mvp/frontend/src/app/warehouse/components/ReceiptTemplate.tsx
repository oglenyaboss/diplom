import { Box, Text, Flex, Stack, Divider } from "@mantine/core";

interface ReceiptTemplateProps {
  receiptNumber: string;
  date: Date;
  equipmentInfo: {
    name: string;
    serialNumber: string;
    manufacturer: string;
    category: string;
    description?: string;
  };
  receivedBy: {
    name: string;
    position: string;
  };
  issuedBy: {
    name: string;
    position: string;
  };
}

export function ReceiptTemplate({
  receiptNumber,
  date,
  equipmentInfo,
  receivedBy,
  issuedBy,
}: ReceiptTemplateProps) {
  return (
    <Box p="xl" maw={800} mx="auto">
      <Stack gap="xl">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Text fz="xl" fw={700}>
            ПРИХОДНАЯ НАКЛАДНАЯ №{receiptNumber}
          </Text>
          <Text>Дата: {date.toLocaleDateString("ru-RU")}</Text>
        </Flex>

        <Divider />

        {/* Equipment Information */}
        <Stack gap="md">
          <Text fw={600} fz="lg">
            Информация об оборудовании
          </Text>

          <Flex gap="xl">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={500}>Наименование:</Text>
              <Text>{equipmentInfo.name}</Text>
            </Stack>

            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={500}>Серийный номер:</Text>
              <Text>{equipmentInfo.serialNumber}</Text>
            </Stack>
          </Flex>

          <Flex gap="xl">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={500}>Производитель:</Text>
              <Text>{equipmentInfo.manufacturer}</Text>
            </Stack>

            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={500}>Категория:</Text>
              <Text>{equipmentInfo.category}</Text>
            </Stack>
          </Flex>

          {equipmentInfo.description && (
            <Stack gap="xs">
              <Text fw={500}>Описание:</Text>
              <Text>{equipmentInfo.description}</Text>
            </Stack>
          )}
        </Stack>

        <Divider />

        {/* Signatures */}
        <Stack gap="lg">
          <Text fw={600} fz="lg">
            Подписи
          </Text>

          <Flex justify="space-between">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={500}>Принял:</Text>
              <Text>{receivedBy.name}</Text>
              <Text fz="sm" c="dimmed">
                {receivedBy.position}
              </Text>
              <Box
                mt="md"
                pt="sm"
                w={200}
                style={{ borderTop: "1px dashed var(--mantine-color-gray-4)" }}
              >
                <Text fz="sm" ta="center">
                  Подпись
                </Text>
              </Box>
            </Stack>

            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={500}>Выдал:</Text>
              <Text>{issuedBy.name}</Text>
              <Text fz="sm" c="dimmed">
                {issuedBy.position}
              </Text>
              <Box
                mt="md"
                pt="sm"
                w={200}
                style={{ borderTop: "1px dashed var(--mantine-color-gray-4)" }}
              >
                <Text fz="sm" ta="center">
                  Подпись
                </Text>
              </Box>
            </Stack>
          </Flex>
        </Stack>
      </Stack>
    </Box>
  );
}
