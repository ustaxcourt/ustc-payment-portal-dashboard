"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast-context";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { AppTooltipProvider } from "./AppTooltipProvider";
import { useIdleLogout } from "./useIdleLogout";


const SESSION_REFETCH_INTERVAL_SECONDS = Math.max(
  1,
  Math.floor(SESSION_MAX_AGE_SECONDS / 2),
);

function IdleLogout() {
  useIdleLogout();
  return null;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false } },
      }),
  );

  return (
    <SessionProvider
      refetchInterval={SESSION_REFETCH_INTERVAL_SECONDS}
      refetchOnWindowFocus
    >
      <IdleLogout />

      <NuqsAdapter>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AppTooltipProvider>
              {children}
            </AppTooltipProvider>
          </ToastProvider>
        </QueryClientProvider>
      </NuqsAdapter>
    </SessionProvider>
  );
}
