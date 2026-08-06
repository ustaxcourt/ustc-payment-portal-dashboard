"use client";

import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import {
  IDLE_LOGOUT_TIMEOUT_MS,
  LAST_ACTIVITY_STORAGE_KEY,
  LOGOUT_SIGNAL_STORAGE_KEY,
  SESSION_MAX_AGE_SECONDS,
} from "../lib/session";

const IDLE_CHECK_INTERVAL_MS = 1000;
const LOGIN_PATH = "/login";
const SESSION_REFETCH_INTERVAL_SECONDS = Math.max(
  1,
  Math.floor(SESSION_MAX_AGE_SECONDS / 2),
);

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

function clearLogoutSignal() {
  try {
    window.localStorage.removeItem(LOGOUT_SIGNAL_STORAGE_KEY);
  } catch {
    return;
  }
}

function hasLogoutSignal() {
  try {
    return window.localStorage.getItem(LOGOUT_SIGNAL_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function broadcastLogout() {
  try {
    window.localStorage.setItem(
      LOGOUT_SIGNAL_STORAGE_KEY,
      Date.now().toString(),
    );
  } catch {
    return;
  }
}

function IdleLogout() {
  const { status, update } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const intervalRef = useRef<number | null>(null);
  const previousStatusRef = useRef(status);
  const signOutStartedRef = useRef(false);

  useEffect(() => {
    const syncSession = () => {
      void update();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncSession();
      }
    };

    window.addEventListener("focus", syncSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [update]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const logoutInProgress = signOutStartedRef.current || hasLogoutSignal();

    if (
      status === "authenticated" &&
      pathname === LOGIN_PATH &&
      !logoutInProgress
    ) {
      clearLogoutSignal();
      router.replace("/");
    }

    if (
      previousStatus === "authenticated" &&
      status === "unauthenticated"
    ) {
      clearLastActivity();
      clearLogoutSignal();
    }

    if (status === "unauthenticated" && pathname !== LOGIN_PATH) {
      router.replace(LOGIN_PATH);
    }

    if (status === "unauthenticated") {
      signOutStartedRef.current = false;
    }

    previousStatusRef.current = status;
  }, [pathname, router, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const signOutForInactivity = () => {
      if (signOutStartedRef.current) {
        return;
      }

      signOutStartedRef.current = true;
      broadcastLogout();
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
        checkForInactivity();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === LOGOUT_SIGNAL_STORAGE_KEY &&
        event.newValue !== null
      ) {
        signOutStartedRef.current = true;
        clearLastActivity();
        void signOut({ redirect: false });

        return;
      }

      if (event.key === LAST_ACTIVITY_STORAGE_KEY && event.newValue !== null) {
        checkForInactivity();
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "mousemove",
    ];

    if (readLastActivity() === null) {
      markActivity();
    }
    checkForInactivity();
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
  }, [status, update]);

  return null;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      refetchInterval={SESSION_REFETCH_INTERVAL_SECONDS}
      refetchOnWindowFocus
    >
      <IdleLogout />
      {children}
    </SessionProvider>
  );
}
