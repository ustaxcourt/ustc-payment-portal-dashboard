"use client";

import ErrorPanel from "@/components/ui/ErrorPanel";
import { formatCourtDate } from "@/lib/format";
import { COLUMN_LABEL } from "./columns";
import StatusTabs from "./StatusTabs";
import TransactionTable from "./TransactionTable";
import { useTransactionLog } from "./useTransactionLog";
import { useTransactionLogParams } from "./useTransactionLogParams";

export default function TransactionLog() {
  const { setParams, tab, appliedRange, activeSorting, selectTab } =
    useTransactionLogParams();

  const { data, isPending, isError, error, refetch } = useTransactionLog(
    tab,
    appliedRange,
    activeSorting,
  );

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
      <p className="text-sm font-medium">
        {data ? formatCourtDate(data.from) : "Today"}
      </p>

      <h2 className="text-xl font-bold tracking-tight">Transaction Log</h2>

      <p aria-live="polite" className="sr-only">
        {data?.sort && COLUMN_LABEL[data.sort]
          ? `Sorted by ${COLUMN_LABEL[data.sort]}, ${
              data.order === "desc" ? "descending" : "ascending"
            }`
          : ""}
      </p>

      {isError ? (
        <ErrorPanel
          title="Could not load the transaction log."
          message={error.message}
          onRetry={refetch}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <StatusTabs
            selected={tab}
            counts={data?.counts}
            onSelect={selectTab}
          />
          <TransactionTable
            rows={data?.data ?? []}
            tab={tab}
            sorting={activeSorting}
            onSortingChange={setParams}
            emptyMessage={
              isPending ? "Loading transactions…" : "No transactions to show."
            }
          />
          {data ? (
            <p className="mt-2 text-right text-sm text-muted-foreground">
              {typeof data.total === "number" && data.data.length < data.total
                ? `Showing ${data.data.length} of ${data.total} transactions — export to get the full set`
                : `${data.data.length} ${data.data.length === 1 ? "transaction" : "transactions"}`}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
