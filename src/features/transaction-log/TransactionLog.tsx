"use client";

import ErrorPanel from "@/components/ui/ErrorPanel";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { formatCourtDate } from "@/lib/format";
import { COLUMN_LABEL, isSortableOnTab } from "./columns";
import { DATE_RANGE_PRESETS, resolveAppliedDateRange } from "./dateRange";
import ExportButton from "./ExportButton";
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
      order: parseAsStringLiteral(SORT_ORDERS).withDefault(DEFAULT_ORDER),
      range: parseAsStringLiteral(DATE_RANGE_PRESETS).withDefault("today"),
      sort: parseAsStringLiteral(TRANSACTION_SORT_FIELDS).withDefault(DEFAULT_SORT),
      status: parseAsStringLiteral(TRANSACTION_TABS).withDefault("all"),
      to: parseAsString,
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TimeframeControls
          appliedRange={appliedRange}
          onSelectPreset={(preset) =>
            setParams({ from: null, range: preset, to: null })
          }
          onApplyCustom={(from, to) => setParams({ from, range: "custom", to })}
        />
        <ExportButton
          tab={tab}
          range={appliedRange}
          sorting={activeSorting}
          disabled={!data || data.data.length === 0}
        />
      </div>
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
