import {
  Alert,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  Stack,
  Textarea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconFileCheck,
  IconPrinter,
  IconDownload as IconSave,
} from "@tabler/icons-react";
import { useReactToPrint } from "react-to-print";
import { useRef, useState } from "react";
import { ReceiptTemplate } from "./ReceiptTemplate";
import { invoicesApi } from "@/api/invoices";
import {
  CreateInvoiceRequest,
  InvoiceItem,
  InvoiceType,
  PersonInfo,
} from "@/types/invoices";
import { notifications } from "@mantine/notifications";

interface EnhancedReceiptGeneratorProps {
  equipmentInfo: {
    id: string;
    name: string;
    serialNumber: string;
    manufacturer: string;
    category: string;
    description?: string;
    price?: number;
  };
  receivedBy: PersonInfo;
  issuedBy: PersonInfo;
  receiptNumber: string;
  quantity: number;
  transactionId?: string;
  type: InvoiceType;
}

export function EnhancedReceiptGenerator({
  equipmentInfo,
  receivedBy,
  issuedBy,
  receiptNumber,
  quantity,
  transactionId,
  type,
}: EnhancedReceiptGeneratorProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoiceTitle =
    type === InvoiceType.Receipt
      ? `Приходная накладная №${receiptNumber}`
      : `Расходная накладная №${receiptNumber}`;

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: invoiceTitle,
    onAfterPrint: close,
    pageStyle: `
      @page {
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
      }
    `,
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Формируем объект позиции в накладной
      const invoiceItem: InvoiceItem = {
        itemId: equipmentInfo.id,
        name: equipmentInfo.name,
        serialNumber: equipmentInfo.serialNumber,
        category: equipmentInfo.category,
        manufacturer: equipmentInfo.manufacturer,
        quantity: quantity,
        price: equipmentInfo.price || 0,
        totalAmount: (equipmentInfo.price || 0) * quantity,
      };

      // Формируем запрос на создание накладной
      const invoiceRequest: CreateInvoiceRequest = {
        number: receiptNumber,
        type: type,
        date: new Date(),
        items: [invoiceItem],
        receivedBy: receivedBy,
        issuedBy: issuedBy,
        totalAmount: invoiceItem.totalAmount,
        notes: notes,
        transactionId: transactionId,
      };

      // Отправляем запрос на сервер
      await invoicesApi.createInvoice(invoiceRequest);

      // Обновляем состояние компонента
      setSaved(true);

      // Показываем уведомление об успешном сохранении
      notifications.show({
        title: "Успешно сохранено",
        message: `${invoiceTitle} успешно сохранена в системе`,
        color: "green",
      });
    } catch (err) {
      console.error("Error saving invoice:", err);
      setError(
        "Произошла ошибка при сохранении накладной. Пожалуйста, попробуйте снова."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        onClick={open}
        variant="light"
        leftSection={<IconPrinter size={16} />}
      >
        {saved ? "Накладная сохранена" : "Оформить накладную"}
      </Button>

      <Modal opened={opened} onClose={close} size="xl" title={invoiceTitle}>
        <LoadingOverlay visible={saving} zIndex={1000} />

        <Stack gap="md">
          {error && (
            <Alert color="red" title="Ошибка">
              {error}
            </Alert>
          )}

          {saved && (
            <Alert
              color="green"
              title="Накладная сохранена"
              icon={<IconFileCheck />}
            >
              Накладная успешно сохранена в системе
            </Alert>
          )}

          <div ref={contentRef}>
            <ReceiptTemplate
              receiptNumber={receiptNumber}
              date={new Date()}
              equipmentInfo={{
                name: equipmentInfo.name,
                serialNumber: equipmentInfo.serialNumber,
                manufacturer: equipmentInfo.manufacturer,
                category: equipmentInfo.category,
                description: equipmentInfo.description,
              }}
              receivedBy={{
                name: receivedBy.fullName,
                position: receivedBy.position || "",
              }}
              issuedBy={{
                name: issuedBy.fullName,
                position: issuedBy.position || "",
              }}
            />
          </div>

          <Textarea
            label="Дополнительные примечания"
            placeholder="Введите дополнительную информацию при необходимости"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            disabled={saved}
          />

          <Group grow>
            {!saved && (
              <Button
                onClick={handleSave}
                color="blue"
                leftSection={<IconSave size={16} />}
                loading={saving}
              >
                Сохранить
              </Button>
            )}

            <Button
              onClick={handlePrint}
              variant={saved ? "filled" : "light"}
              leftSection={<IconPrinter size={16} />}
            >
              Распечатать
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
