"use client";

import { Button } from "@/components/ui/button";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { COLUMN_LABEL, getColumns } from "./columns";
import StatusTabs from "./StatusTabs";
import { TAB_HEADER_TONE, TAB_LABEL } from "./statusStyles";
import TransactionSearch from "./TransactionSearch";
import TransactionTable from "./TransactionTable";
import type { FeeType, TransactionSearchFilters } from "./types";
import { useRetainedCounts } from "./useRetainedCounts";
import { useTransactionLog } from "./useTransactionLog";
import { useTransactionLogParams } from "./useTransactionLogParams";

export default function TransactionLog() {
  const {
    params,
    setParams,
    tab,
    appliedRange,
    activeSorting,
    selectTab,
    searchFilters,
    hasSearchCriteria,
    clearSearch,
    queryEnabled,
  } = useTransactionLogParams();

  const { data, isPending, isPlaceholderData, isError, error, refetch } =
    useTransactionLog(
      tab,
      appliedRange,
      activeSorting,
      searchFilters,
      queryEnabled,
    );

  // Badge counts span the whole timeframe, but an empty search disables its own
  // query, so retain the last counts we saw — scoped to their range, so a
  // timeframe change blanks the badges instead of stranding the old window's.
  // Placeholder data is the prior range's response held during the refetch;
  // feeding it in would cache stale counts under the new range and defeat that.
  const counts = useRetainedCounts(
    isPlaceholderData ? undefined : data?.counts,
    `${appliedRange.from}..${appliedRange.to}`,
  );

  // On the search tab, placeholder data is the previous search's response —
  // hide it from both the table and the footer so a new search in flight
  // doesn't pair an empty/"Searching…" table with a stale transaction count.
  const visibleData =
    tab === "search"
      ? hasSearchCriteria && !isPlaceholderData
        ? data
        : undefined
      : data;

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
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
          <div className="flex items-end justify-between gap-3 border-b-2 border-muted-foreground">
            <StatusTabs selected={tab} counts={counts} onSelect={selectTab} />
            {tab === "search" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mb-1.5"
                onClick={clearSearch}
              >
                Clear All
              </Button>
            ) : null}
          </div>
          {tab === "search" ? (
            <TransactionSearch
              filters={{
                feeType: params.feeType,
                payType: params.payType,
                paymentStatus: params.paymentStatus,
                transactionStatus: params.transactionStatus,
                metadataKey: params.metadataKey,
                metadataValue: params.metadataValue,
              }}
              onFilterChange={(key, value) =>
                setParams(
                  key === "feeType"
                    ? {
                        feeType: value as FeeType | null,
                        metadataKey: null,
                        metadataValue: null,
                      }
                    : ({ [key]: value } as Pick<
                        TransactionSearchFilters,
                        typeof key
                      >),
                )
              }
              onMetadataSearch={(metadataKey, metadataValue) =>
                setParams({ metadataKey, metadataValue })
              }
              rows={visibleData?.data ?? []}
              sorting={activeSorting}
              onSortingChange={setParams}
              emptyMessage={
                !hasSearchCriteria
                  ? "Choose a filter to search transactions."
                  : isPending || isPlaceholderData
                    ? "Searching…"
                    : "No transactions match your search."
              }
            />
          ) : (
            <TransactionTable
              rows={data?.data ?? []}
              columns={getColumns(tab)}
              caption={`Transaction log, ${TAB_LABEL[tab]}`}
              headerTone={TAB_HEADER_TONE[tab]}
              sorting={activeSorting}
              onSortingChange={setParams}
              emptyMessage={
                isPending ? "Loading transactions…" : "No transactions to show."
              }
            />
          )}
          {visibleData ? (
            <p className="mt-2 text-right text-sm text-muted-foreground">
              {typeof visibleData.total === "number" &&
              visibleData.data.length < visibleData.total
                ? `Showing ${visibleData.data.length} of ${visibleData.total} transactions — export to get the full set`
                : `${visibleData.data.length} ${visibleData.data.length === 1 ? "transaction" : "transactions"}`}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
