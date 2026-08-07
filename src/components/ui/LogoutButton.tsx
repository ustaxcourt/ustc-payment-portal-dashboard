"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  LAST_ACTIVITY_STORAGE_KEY,
  LOGOUT_SIGNAL_STORAGE_KEY,
} from "@/lib/session";

function broadcastLogout() {
  try {
    window.localStorage.setItem(
      LOGOUT_SIGNAL_STORAGE_KEY,
      Date.now().toString(),
    );
    window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  } catch {
    return;
  }
}

export default function LogoutButton() {
  return (
    <Button
      onClick={() => {
        broadcastLogout();
        void signOut({ callbackUrl: "/api/auth/federated-logout" });
      }}
    >
      Logout
    </Button>
  );
}
