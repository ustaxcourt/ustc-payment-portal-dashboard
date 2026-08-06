"use client";

import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { IDLE_LOGOUT_TIMEOUT_MS } from "../lib/session";

const LAST_ACTIVITY_STORAGE_KEY = "ustc-payment-portal:last-activity";
const IDLE_CHECK_INTERVAL_MS = 1000;
const LOGIN_PATH = "/login";

function readLastActivity() {
  try {
    const storedValue = window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
    if (storedValue === null) {
      return null;
    }

    const parsedValue = Number.parseInt(storedValue, 10);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  } catch {
    return null;
  }
}

function writeLastActivity(timestamp: number) {
  try {
    window.localStorage.setItem(
      LAST_ACTIVITY_STORAGE_KEY,
      timestamp.toString(),
    );
  } catch {
    return;
  }
}

function clearLastActivity() {
  try {
    window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  } catch {
    return;
  }
}

function IdleLogout() {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const intervalRef = useRef<number | null>(null);
  const signOutStartedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      clearLastActivity();

      if (status === "unauthenticated" && pathname !== LOGIN_PATH) {
        router.replace(LOGIN_PATH);
      }

      signOutStartedRef.current = false;
      return;
    }

    const signOutForInactivity = () => {
      if (signOutStartedRef.current) {
        return;
      }

      signOutStartedRef.current = true;
      clearLastActivity();
      void signOut({ callbackUrl: "/api/auth/federated-logout" });
    };

    const markActivity = () => {
      const now = Date.now();
      writeLastActivity(now);
    };

    const checkForInactivity = () => {
      const lastActivity = readLastActivity();

      if (lastActivity === null) {
        markActivity();
        return false;
      }

      if (Date.now() - lastActivity >= IDLE_LOGOUT_TIMEOUT_MS) {
        signOutForInactivity();
        return true;
      }

      return false;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!checkForInactivity()) {
          markActivity();
        }
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_STORAGE_KEY) {
        checkForInactivity();
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "mousemove",
    ];

    if (!checkForInactivity()) {
      markActivity();
    }
    intervalRef.current = window.setInterval(
      checkForInactivity,
      IDLE_CHECK_INTERVAL_MS,
    );

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, markActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [pathname, router, status]);

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
