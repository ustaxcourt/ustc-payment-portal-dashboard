"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Case Services & Finance Dashboard
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          United States Tax Court &mdash; payment portal transaction activity.
        </p>
        <p className="mt-8 text-sm text-muted-foreground">
          This dashboard is not yet available.
        </p>

        {!session ? (
          <Button onClick={() => signIn("azure-ad")}>Login</Button>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>{session.user?.name}</p>
            <Button onClick={() => signOut()}>Logout</Button>
          </div>
        )}
      </div>
    </main>
  );
}