"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { IDLE_LOGOUT_TIMEOUT_MS } from "../lib/session";

function IdleLogout() {
  const { status } = useSession();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const signOutForInactivity = () => {
      void signOut({ callbackUrl: "/api/auth/federated-logout" });
    };

    const resetTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(
        signOutForInactivity,
        IDLE_LOGOUT_TIMEOUT_MS,
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "mousemove",
    ];

    resetTimer();

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status]);

  return null;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <IdleLogout />
      {children}
    </SessionProvider>
  );
}
