"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginButton() {
  const { status } = useSession();

  return (
    <Button
      disabled={status === "loading"}
      onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
    >
      {status === "loading" ? "Checking session..." : "Login"}
    </Button>
  );
}
