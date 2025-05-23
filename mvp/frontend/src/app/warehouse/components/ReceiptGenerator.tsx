import { Button, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPrinter } from "@tabler/icons-react";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import { ReceiptTemplate } from "./ReceiptTemplate";

interface ReceiptGeneratorProps {
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
  receiptNumber: string;
}

export function ReceiptGenerator({
  equipmentInfo,
  receivedBy,
  issuedBy,
  receiptNumber,
}: ReceiptGeneratorProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: `Приходная накладная №${receiptNumber}`,
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

  return (
    <>
      <Button
        onClick={open}
        variant="light"
        leftSection={<IconPrinter size={16} />}
      >
        Печать накладной
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        size="xl"
        title="Предпросмотр накладной"
      >
        <Stack gap="md">
          <div ref={contentRef}>
            <ReceiptTemplate
              receiptNumber={receiptNumber}
              date={new Date()}
              equipmentInfo={equipmentInfo}
              receivedBy={receivedBy}
              issuedBy={issuedBy}
            />
          </div>

          <Button onClick={handlePrint} fullWidth>
            Распечатать
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
