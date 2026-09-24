"use client";

import { useMemo } from "react";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { COLUMN_LABEL, getColumns, metadataColumns } from "./columns";
import { PAYMENT_STATUS_LABEL } from "./statusStyles";
import TransactionFilters from "./TransactionFilters";
import TransactionTable from "./TransactionTable";
import type { FeeType, PaymentStatus, TransactionSearchFilters } from "./types";
import { useRetainedCounts } from "./useRetainedCounts";
import { useTransactionLog } from "./useTransactionLog";
import { useTransactionLogParams } from "./useTransactionLogParams";

export default function TransactionLog() {
  const {
    setParams,
    appliedRange,
    activeSorting,
    searchFilters,
    hasSearchCriteria,
    clearSearch,
  } = useTransactionLogParams();

  const { data, isPending, isPlaceholderData, isError, error, refetch } =
    useTransactionLog(appliedRange, activeSorting, searchFilters);

  // Counts span the whole timeframe; retained across refetches (scoped to
  // their range) so the sidebar's badges don't blank out while filtering.
  const counts = useRetainedCounts(
    isPlaceholderData ? undefined : data?.counts,
    `${appliedRange.from}..${appliedRange.to}`,
  );

  // Metadata columns follow the selected fee; memoized so react-table keeps
  // seeing a stable columns reference between renders.
  const columns = useMemo(
    () => [...getColumns(), ...metadataColumns(searchFilters.feeType)],
    [searchFilters.feeType],
  );

  const onFilterChange = (
    key: keyof TransactionSearchFilters,
    value: string | null,
  ) => {
    if (key === "feeType") {
      setParams({
        feeType: value as FeeType | null,
        metadataKey: null,
        metadataValue: null,
      });
      return;
    }
    if (key === "paymentStatus") {
      // Write forward to the canonical `status` key and clear the legacy one.
      setParams({ status: value as PaymentStatus | null, paymentStatus: null });
      return;
    }
    setParams({ [key]: value } as Pick<TransactionSearchFilters, typeof key>);
  };

  const statusLabel = searchFilters.paymentStatus
    ? PAYMENT_STATUS_LABEL[searchFilters.paymentStatus]
    : "All";

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col">
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
        <div className="flex min-h-0 flex-1 flex-col rounded-md border-2 table-border">
          <div className="flex items-center justify-between rounded-t-[calc(var(--radius-md)-2px)] border-b-2 table-border bg-status-neutral-subtle px-4 py-2">
            <h2 className="text-base font-bold tracking-tight">
              Transaction Log
              {typeof data?.total === "number" ? ` (${data.total})` : ""}
            </h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <TransactionFilters
              filters={searchFilters}
              counts={counts}
              onFilterChange={onFilterChange}
              onMetadataSearch={(metadataKey, metadataValue) =>
                setParams({ metadataKey, metadataValue })
              }
              onClear={clearSearch}
              hasActiveFilters={hasSearchCriteria}
            />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <TransactionTable
                rows={data?.data ?? []}
                columns={columns}
                caption={`Transaction log, ${statusLabel}`}
                headerTone="bg-status-neutral-subtle"
                sorting={activeSorting}
                onSortingChange={setParams}
                wrapperClassName="min-h-0 flex-1 overflow-auto rounded-br-[calc(var(--radius-md)-2px)] border table-border"
                emptyMessage={
                  isPending
                    ? "Loading transactions…"
                    : hasSearchCriteria
                      ? "No transactions match your filters."
                      : "No transactions to show."
                }
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
