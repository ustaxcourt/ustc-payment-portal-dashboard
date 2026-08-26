"use client";

import { Button } from "@/components/ui/button";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { COLUMN_LABEL, getColumns } from "./columns";
import StatusTabs from "./StatusTabs";
import { TAB_HEADER_TONE, TAB_LABEL } from "./statusStyles";
import TransactionSearch from "./TransactionSearch";
import TransactionTable from "./TransactionTable";
import type { TransactionSearchFilters } from "./types";
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

  const { data, isPending, isError, error, refetch } = useTransactionLog(
    tab,
    appliedRange,
    activeSorting,
    searchFilters,
    queryEnabled,
  );

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
            <StatusTabs
              selected={tab}
              counts={data?.counts}
              onSelect={selectTab}
            />
            <div className="m-2.5">
               {tab === "search" ? (
              <Button type="button" variant="outline" onClick={clearSearch}>
                Clear All
              </Button>
            ) : null}
            </div>
          </div>
          {tab === "search" ? (
            <TransactionSearch
              filters={{
                feeType: params.feeType,
                payType: params.payType,
                paymentStatus: params.paymentStatus,
                transactionStatus: params.transactionStatus,
              }}
              onFilterChange={(key, value) =>
                setParams({ [key]: value } as Pick<
                  TransactionSearchFilters,
                  typeof key
                >)
              }
              rows={hasSearchCriteria ? (data?.data ?? []) : []}
              sorting={activeSorting}
              onSortingChange={setParams}
              emptyMessage={
                !hasSearchCriteria
                  ? "Choose a filter to search transactions."
                  : isPending
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
