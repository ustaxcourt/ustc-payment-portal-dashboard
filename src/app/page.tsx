import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Suspense } from "react";
import LogoutButton from "@/components/ui/LogoutButton";
import PaymentBreakdownPane from "@/features/payment-breakdown/PaymentBreakdownPane";
import RevenueTotals from "@/features/revenue-totals/RevenueTotals";
import TimeframeBar from "@/features/transaction-log/TimeframeBar";
import TransactionLog from "@/features/transaction-log/TransactionLog";
import { getSessionAuthOptions, hasValidDashboardSession } from "@/lib/auth";
import { loginUrlReturningTo } from "@/lib/callbackUrl";
import Image from "next/image";

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
      <div className="border-b bg-slate-100">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4A556F]">
            <Image
              src="/ustc-seal.png"
              alt="United States Tax Court seal"
              width={28}
              height={28}
              unoptimized
            />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg font-bold leading-none text-foreground">
                Case Services &amp; Finance Dashboard
              </h1>
              <p className="text-sm leading-none text-muted-foreground">
                Financial operations overview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user?.email}
            </span>

            <div className="h-6 w-px bg-border" />

            <LogoutButton />
          </div>
        </header>
      </div>

      <div className="mt-6 mb-6">
        <RevenueTotals />
      </div>

      <Suspense fallback={<div className="bg-muted px-6 py-4 sm:px-8" />}>
        <TimeframeBar />
      </Suspense>

      <main
        id="main-content"
        tabIndex={-1}
        className="grid min-h-0 flex-1 grid-cols-3 gap-6 p-6 sm:p-8"
      >
        <Suspense fallback={<div aria-hidden="true" />}>
          <PaymentBreakdownPane />
        </Suspense>
        <div className="col-span-2 flex min-h-0 flex-col">
          <Suspense
            fallback={
              <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
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
