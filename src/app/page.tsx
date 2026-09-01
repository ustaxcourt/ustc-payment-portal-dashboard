import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LogoutButton from "@/components/ui/LogoutButton";
import PaymentBreakdownPane from "@/features/payment-breakdown/PaymentBreakdownPane";
import RevenueTotals from "@/features/revenue-totals/RevenueTotals";
import TimeframeBar from "@/features/transaction-log/TimeframeBar";
import TransactionLog from "@/features/transaction-log/TransactionLog";
import { getSessionAuthOptions, hasValidDashboardSession } from "@/lib/auth";
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

  if (!hasValidDashboardSession(session)) {
    const query = toQueryString(await searchParams);
    redirect(loginUrlReturningTo(query ? `/?${query}` : "/"));
  }

  return (
    <>
      <div className="border-b-2 border-foreground">
        <header className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 sm:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Payment Portal
            </h1>
            <p className="text-base font-semibold text-primary">
              Case Services &amp; Finance Dashboard
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {session.user?.email}
              </p>
              <LogoutButton />
            </div>
            <RevenueTotals />
          </div>
        </header>
      </div>

      <Suspense fallback={<div className="bg-muted px-6 py-4 sm:px-8" />}>
        <TimeframeBar />
      </Suspense>

      <main className="grid min-h-0 flex-1 grid-cols-3 gap-6 p-6 sm:p-8">
        <PaymentBreakdownPane />
        <div className="col-span-2 flex min-h-0 flex-col">
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">
                Loading transaction log…
              </p>
            }
          >
            <TransactionLog />
          </Suspense>
        </div>
      </main>
    </>
  );
}
