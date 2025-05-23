"use client";

import { MantineProvider as Provider } from "@mantine/core";
import { ReactNode } from "react";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";

export function MantineProvider({ children }: { children: ReactNode }) {
  return (
    <Provider
      theme={{
        primaryColor: "blue",
        colors: {
          primary: [
            "#EFF6FF",
            "#DBEAFE",
            "#BFDBFE",
            "#93C5FD",
            "#60A5FA",
            "#3B82F6",
            "#2563EB",
            "#1D4ED8",
            "#1E40AF",
            "#1E3A8A",
          ],
          secondary: [
            "#ECFDF5",
            "#D1FAE5",
            "#A7F3D0",
            "#6EE7B7",
            "#34D399",
            "#10B981",
            "#059669",
            "#047857",
            "#065F46",
            "#064E3B",
          ],
        },
      }}
    >
      {children}
    </Provider>
  );
}
