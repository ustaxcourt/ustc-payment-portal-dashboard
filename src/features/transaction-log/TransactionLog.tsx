"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { formatCourtDate } from "@/lib/format";
import { COLUMN_LABEL, isSortableOnTab } from "./columns";
import StatusTabs from "./StatusTabs";
import {
  DATE_RANGE_PRESETS,
  resolveAppliedDateRange,
} from "./dateRange";
import TimeframeControls from "./TimeframeControls";
import TransactionSearch from "./TransactionSearch";
import TransactionTable from "./TransactionTable";
import {
  DEFAULT_ORDER,
  DEFAULT_SORT,
  FEE_TYPES,
  PAY_TYPES,
  PAYMENT_STATUSES,
  SORT_ORDERS,
  TRANSACTION_SORT_FIELDS,
  TRANSACTION_STATUSES,
  VIEW_TABS,
  type TransactionSearchFilters,
  type ViewTab,
} from "./types";
import { useTransactionLog } from "./useTransactionLog";

export default function TransactionLog() {
  const [params, setParams] = useQueryStates(
    {
      from: parseAsString,
      order: parseAsStringLiteral(SORT_ORDERS).withDefault(DEFAULT_ORDER),
      range: parseAsStringLiteral(DATE_RANGE_PRESETS).withDefault("today"),
      sort: parseAsStringLiteral(TRANSACTION_SORT_FIELDS).withDefault(DEFAULT_SORT),
      status: parseAsStringLiteral(VIEW_TABS).withDefault("all"),
      to: parseAsString,
      feeType: parseAsStringLiteral(FEE_TYPES),
      payType: parseAsStringLiteral(PAY_TYPES),
      paymentStatus: parseAsStringLiteral(PAYMENT_STATUSES),
      transactionStatus: parseAsStringLiteral(TRANSACTION_STATUSES),
    },
    {
      clearOnDefault: true,
    },
  );

  const tab = params.status;
  const sorting = { sort: params.sort, order: params.order };
  const appliedRange = resolveAppliedDateRange(
    params.range,
    params.from,
    params.to,
  );

  const activeSorting = isSortableOnTab(sorting.sort, tab)
    ? sorting
    : { sort: DEFAULT_SORT, order: DEFAULT_ORDER };

  const selectTab = (next: ViewTab) => {
    setParams(
      isSortableOnTab(params.sort, next)
        ? { status: next }
        : { status: next, sort: DEFAULT_SORT, order: DEFAULT_ORDER },
    );
  };

  const searchFilters: TransactionSearchFilters | undefined =
    tab === "search"
      ? {
          feeType: params.feeType,
          payType: params.payType,
          paymentStatus: params.paymentStatus,
          transactionStatus: params.transactionStatus,
        }
      : undefined;

  const hasSearchCriteria = Boolean(
    searchFilters?.feeType ||
      searchFilters?.payType ||
      searchFilters?.paymentStatus ||
      searchFilters?.transactionStatus,
  );

  const clearSearch = () =>
    setParams({
      feeType: null,
      payType: null,
      paymentStatus: null,
      transactionStatus: null,
    });

  const { data, isPending, isError, error, refetch } = useTransactionLog(
    tab,
    appliedRange,
    activeSorting,
    searchFilters,
    tab !== "search" || hasSearchCriteria,
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
          <div className="flex items-end justify-between gap-3 border-b">
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
              feeType={params.feeType}
              payType={params.payType}
              paymentStatus={params.paymentStatus}
              transactionStatus={params.transactionStatus}
              onFeeTypeChange={(feeType) => setParams({ feeType })}
              onPayTypeChange={(payType) => setParams({ payType })}
              onPaymentStatusChange={(paymentStatus) =>
                setParams({ paymentStatus })
              }
              onTransactionStatusChange={(transactionStatus) =>
                setParams({ transactionStatus })
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
              tab={tab}
              sorting={activeSorting}
              onSortingChange={setParams}
              emptyMessage={
                isPending ? "Loading transactions…" : "No transactions to show."
              }
            />
          )}
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
