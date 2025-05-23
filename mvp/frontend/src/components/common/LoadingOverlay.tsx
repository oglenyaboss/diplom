"use client";

import { Center, Loader, Text, Stack } from "@mantine/core";

interface LoadingOverlayProps {
  message?: string;
  visible?: boolean;
}

export default function LoadingOverlay({
  message = "Загрузка...",
  visible = true,
}: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <Center
      mih="100vh"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        zIndex: 1000,
      }}
    >
      <Stack gap="md" align="center">
        <Loader size="lg" type="bars" />
        <Text>{message}</Text>
      </Stack>
    </Center>
  );
}
