"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { COLUMN_LABEL, isSortableOnTab } from "./columns";
import { DATE_RANGE_PRESETS, resolveAppliedDateRange } from "./dateRange";
import StatusTabs from "./StatusTabs";
import TimeframeControls from "./TimeframeControls";
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
  const [params, setParams] = useQueryStates(
    {
      from: parseAsString,
      range: parseAsStringLiteral(DATE_RANGE_PRESETS).withDefault("today"),
      status: parseAsStringLiteral(TRANSACTION_TABS).withDefault("all"),
      to: parseAsString,
      sort: parseAsStringLiteral(TRANSACTION_SORT_FIELDS).withDefault(
        DEFAULT_SORT,
      ),
      order: parseAsStringLiteral(SORT_ORDERS).withDefault(DEFAULT_ORDER),
    },
    {
      clearOnDefault: true,
    },
  );

  const tab = params.status;
  const appliedRange = resolveAppliedDateRange(
    params.range,
    params.from,
    params.to,
  );

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
    appliedRange,
    activeSorting,
  );

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
      <TimeframeControls
        appliedRange={appliedRange}
        onSelectPreset={(preset) =>
          setParams({ from: null, range: preset, to: null })
        }
        onApplyCustom={(from, to) => setParams({ from, range: "custom", to })}
      />

      <h2 className="text-xl font-bold tracking-tight">Transaction Log</h2>

      <p aria-live="polite" className="sr-only">
        {data?.sort && COLUMN_LABEL[data.sort]
          ? `Sorted by ${COLUMN_LABEL[data.sort]}, ${
              data.order === "desc" ? "descending" : "ascending"
            }`
          : ""}
      </p>

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
