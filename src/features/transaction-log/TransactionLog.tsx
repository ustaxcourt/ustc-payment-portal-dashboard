"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import StatusFilter from "./StatusFilter";
import TransactionTable from "./TransactionTable";
import { PAYMENT_STATUSES } from "./types";
import { useTransactionLog } from "./useTransactionLog";
import { formatCourtDate } from "@/lib/format";

export default function TransactionLog() {
  // URL-as-state, so the view is shareable and survives refresh.
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(PAYMENT_STATUSES).withDefault("success"),
  );

  const { data, isPending, isError, error, refetch } = useTransactionLog(status);

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Transaction log</h1>
        <p className="text-sm text-muted-foreground">
          {data ? formatCourtDate(data.from) : "Today's transactions"}
        </p>
      </header>

      <StatusFilter
        selected={status}
        counts={data?.counts}
        onSelect={setStatus}
      />

      {isError ? (
        <div className="rounded-md border border-destructive/50 p-6 text-sm">
          <p className="font-medium">Could not load the transaction log.</p>
          <p className="mt-1 text-muted-foreground">{(error as Error).message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : (
        <TransactionTable
          rows={data?.data ?? []}
          status={status}
          emptyMessage={
            isPending ? "Loading transactions…" : "No transactions to show."
          }
        />
      )}
    </section>
  );
}
