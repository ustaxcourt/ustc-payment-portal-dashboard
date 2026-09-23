"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { broadcastLogout } from "@/lib/sessionStorage";

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
