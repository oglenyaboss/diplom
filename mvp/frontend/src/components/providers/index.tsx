"use client";

import { ReactNode } from "react";
import { MantineProvider } from "./mantine-provider";
import { QueryProvider } from "./query-provider";
import { ReduxProvider } from "./redux-provider";
import { Notifications } from "@mantine/notifications";
import AuthProvider from "./auth-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <ReduxProvider>
        <QueryProvider>
          <AuthProvider>
            <Notifications position="top-right" limit={5} />
            {children}
          </AuthProvider>
        </QueryProvider>
      </ReduxProvider>
    </MantineProvider>
  );
}
