"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import StatusTabs from "./StatusTabs";
import {
  DATE_RANGE_PRESETS,
  resolveAppliedDateRange,
} from "./dateRange";
import TimeframeControls from "./TimeframeControls";
import TransactionTable from "./TransactionTable";
import { TRANSACTION_TABS } from "./types";
import { useTransactionLog } from "./useTransactionLog";

export default function TransactionLog() {
  const [filters, setFilters] = useQueryStates(
    {
      from: parseAsString,
      range: parseAsStringLiteral(DATE_RANGE_PRESETS).withDefault("today"),
      status: parseAsStringLiteral(TRANSACTION_TABS).withDefault("all"),
      to: parseAsString,
    },
    {
      clearOnDefault: true,
    },
  );

  const appliedRange = resolveAppliedDateRange(
    filters.range,
    filters.from,
    filters.to,
  );

  const { data, isPending, isError, error, refetch } = useTransactionLog(
    filters.status,
    appliedRange,
  );

  return (
    <section className="flex w-full flex-col gap-3">
      <TimeframeControls
        appliedRange={appliedRange}
        onSelectPreset={(preset) =>
          setFilters({ from: null, range: preset, to: null })
        }
        onApplyCustom={(from, to) => setFilters({ from, range: "custom", to })}
      />

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
            selected={filters.status}
            counts={data?.counts}
            onSelect={(status) => setFilters({ status })}
          />
          <TransactionTable
            rows={data?.data ?? []}
            tab={filters.status}
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
