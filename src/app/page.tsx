import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LogoutButton from "@/components/ui/LogoutButton";
import RevenueTotals from "@/features/revenue-totals/RevenueTotals";
import TransactionLog from "@/features/transaction-log/TransactionLog";
import { getSessionAuthOptions } from "@/lib/auth";
import { loginUrlReturningTo } from "@/lib/callbackUrl";

type SearchParams = Record<string, string | string[] | undefined>;

const toQueryString = (params: SearchParams): string => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const entry of value) query.append(key, entry);
    } else if (typeof value === "string") {
      query.set(key, value);
    }
  }

  return query.toString();
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(getSessionAuthOptions());

  if (!session) {
    const query = toQueryString(await searchParams);
    redirect(loginUrlReturningTo(query ? `/?${query}` : "/"));
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

      <RevenueTotals />

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
