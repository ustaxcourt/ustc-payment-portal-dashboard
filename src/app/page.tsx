import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LogoutButton from "@/components/ui/LogoutButton";
import TransactionLog from "@/features/transaction-log/TransactionLog";
import { getSessionAuthOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(getSessionAuthOptions());

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Finance Dashboard</h1>
        <div className="flex flex-col items-end gap-2">
          <p className="text-sm text-muted-foreground">{session.user?.email}</p>
          <LogoutButton />
        </div>
      </header>

      {/* nuqs reads search params, so the log renders inside a boundary. */}
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading transaction log…
          </p>
        }
      >
        <TransactionLog />
      </Suspense>
    </main>
  );
}
