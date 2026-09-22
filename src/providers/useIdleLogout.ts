"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import {
  IDLE_LOGOUT_TIMEOUT_MS,
  LAST_ACTIVITY_STORAGE_KEY,
  LOGOUT_SIGNAL_STORAGE_KEY,
} from "@/lib/session";
import {
  broadcastLogout,
  clearSessionMarkers,
  readLastActivity,
  writeLastActivity,
} from "@/lib/sessionStorage";

const IDLE_CHECK_INTERVAL_MS = 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 5000;
const LOGIN_PATH = "/login";
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "scroll",
  "mousemove",
];

function logSignOut(reason: string) {
  console.info("[session] signing out", { reason });
}

export function useIdleLogout() {
  const { status, update } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const clockSeededRef = useRef(false);
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
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      clearSessionMarkers();
      clockSeededRef.current = false;
      signOutStartedRef.current = false;

      if (pathname !== LOGIN_PATH) {
        router.replace(LOGIN_PATH);
      }

      return;
    }

    if (!clockSeededRef.current) {
      clockSeededRef.current = true;
      signOutStartedRef.current = false;
      writeLastActivity(Date.now());
    }

    if (pathname === LOGIN_PATH && !signOutStartedRef.current) {
      router.replace("/");
    }
  }, [pathname, router, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let lastWriteAt = 0;

    const startSignOut = (reason: string, run: () => void) => {
      if (signOutStartedRef.current) {
        return;
      }

      signOutStartedRef.current = true;
      logSignOut(reason);
      run();
    };

    const markActivity = () => {
      const now = Date.now();

      if (now - lastWriteAt < ACTIVITY_WRITE_THROTTLE_MS) {
        return;
      }

      lastWriteAt = now;
      writeLastActivity(now);
    };

    const checkForInactivity = () => {
      const lastActivity = readLastActivity();

      if (lastActivity === null) {
        return;
      }

      if (Date.now() - lastActivity >= IDLE_LOGOUT_TIMEOUT_MS) {
        startSignOut("idle-timeout", () => {
          broadcastLogout();
          void signOut({ callbackUrl: "/api/auth/federated-logout" });
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForInactivity();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.newValue === null) {
        return;
      }

      if (event.key === LOGOUT_SIGNAL_STORAGE_KEY) {
        startSignOut("logout-in-another-tab", () => {
          void signOut({ redirect: false });
        });

        return;
      }

      if (event.key === LAST_ACTIVITY_STORAGE_KEY) {
        checkForInactivity();
      }
    };

    if (readLastActivity() === null) {
      writeLastActivity(Date.now());
    }
    checkForInactivity();

    const intervalId = window.setInterval(
      checkForInactivity,
      IDLE_CHECK_INTERVAL_MS,
    );

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.clearInterval(intervalId);

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [status]);
}
