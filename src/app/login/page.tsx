"use client";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Sign in to the dashboard
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          Use your United States Tax Court Microsoft account to access the Case
          Services &amp; Finance Dashboard.
        </p>
        <div className="mt-8">
          <Button
            disabled={status === "loading"}
            onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
          >
            {status === "loading" ? "Checking session..." : "Login"}
          </Button>
        </div>
      </div>
    </main>
  );
}