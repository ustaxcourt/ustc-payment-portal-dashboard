"use client";

import { parseAsStringLiteral, useQueryStates } from "nuqs";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { formatCourtDate } from "@/lib/format";
import { COLUMN_LABEL, isSortableOnTab } from "./columns";
import StatusTabs from "./StatusTabs";
import TransactionTable from "./TransactionTable";
import {
  DEFAULT_ORDER,
  DEFAULT_SORT,
  SORT_ORDERS,
  TRANSACTION_SORT_FIELDS,
  TRANSACTION_TABS,
  type TransactionTab,
} from "./types";
import { useTransactionLog } from "./useTransactionLog";

export default function TransactionLog() {
  const [params, setParams] = useQueryStates({
    status: parseAsStringLiteral(TRANSACTION_TABS).withDefault("all"),
    sort: parseAsStringLiteral(TRANSACTION_SORT_FIELDS).withDefault(
      DEFAULT_SORT,
    ),
    order: parseAsStringLiteral(SORT_ORDERS).withDefault(DEFAULT_ORDER),
  });

  const tab = params.status;
  const sorting = { sort: params.sort, order: params.order };

  const activeSorting = isSortableOnTab(sorting.sort, tab)
    ? sorting
    : { sort: DEFAULT_SORT, order: DEFAULT_ORDER };

  const selectTab = (next: TransactionTab) => {
    setParams(
      isSortableOnTab(params.sort, next)
        ? { status: next }
        : { status: next, sort: DEFAULT_SORT, order: DEFAULT_ORDER },
    );
  };

  const { data, isPending, isError, error, refetch } = useTransactionLog(
    tab,
    activeSorting,
  );

  return (
    <section className="flex w-full flex-col gap-3">
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
        <div>
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
