"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { formatCourtDate } from "@/lib/format";
import StatusTabs from "./StatusTabs";
import TransactionTable from "./TransactionTable";
import { TRANSACTION_TABS } from "./types";
import { useTransactionLog } from "./useTransactionLog";

export default function TransactionLog() {
  const [tab, setTab] = useQueryState(
    "status",
    parseAsStringLiteral(TRANSACTION_TABS).withDefault("all"),
  );

  const { data, isPending, isError, error, refetch } = useTransactionLog(tab);

  return (
    <section className="flex w-full flex-col gap-3">
      {/* Placeholder for the timeframe selector. */}
      <p className="text-sm font-medium">
        {data ? formatCourtDate(data.from) : "Today"}
      </p>

      <h2 className="text-xl font-bold tracking-tight">Transaction Log</h2>

      {isError ? (
        <div className="rounded-md border border-destructive/50 p-6 text-sm">
          <p className="font-medium">Could not load the transaction log.</p>
          <p className="mt-1 text-muted-foreground">
            {(error as Error).message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : (
        <div>
          <StatusTabs
            selected={tab}
            counts={data?.counts}
            onSelect={setTab}
          />
          <TransactionTable
            rows={data?.data ?? []}
            tab={tab}
            emptyMessage={
              isPending ? "Loading transactions…" : "No transactions to show."
            }
          />
          {data ? (
            <p className="mt-2 text-right text-sm text-muted-foreground">
              {data.data.length < data.total
                ? `Showing ${data.data.length} of ${data.total} transactions`
                : `${data.data.length} ${data.data.length === 1 ? "transaction" : "transactions"}`}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
