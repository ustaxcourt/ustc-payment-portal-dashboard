"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { broadcastLogout } from "@/lib/sessionStorage";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        broadcastLogout();
        void signOut({ callbackUrl: "/login" });
      }}
      className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
    >
      <LogOut className="h-5 w-5" />
      <span>Logout</span>
    </button>
  );
}
