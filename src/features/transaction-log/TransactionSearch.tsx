"use client";

import { useMemo } from "react";
import FilterSelect from "@/components/ui/FilterSelect";
import { formatLabel } from "@/lib/format";
import { getColumns, metadataColumns } from "./columns";
import MetadataSearch from "./MetadataSearch";
import TransactionTable from "./TransactionTable";
import {
  FEE_TYPE_LABEL,
  FEE_TYPES,
  type MetadataKey,
  PAY_TYPES,
  PAYMENT_STATUSES,
  TRANSACTION_STATUSES,
  type TransactionLogEntry,
  type TransactionSearchFilters,
  type TransactionSorting,
} from "./types";

type FilterKey = keyof TransactionSearchFilters;

const ANY_VALUE = "Any";

const withAnyOption = (
  options: readonly { value: string; label: string }[],
) => [{ value: ANY_VALUE, label: "Any" }, ...options];

const FILTER_CONFIG: {
  key: FilterKey;
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
}[] = [
  {
    key: "feeType",
    id: "search-fee-type",
    label: "Fee Type",
    options: withAnyOption(
      FEE_TYPES.map((value) => ({ value, label: FEE_TYPE_LABEL[value] })),
    ),
  },
  {
    key: "payType",
    id: "search-pay-type",
    label: "Pay Type",
    options: withAnyOption(PAY_TYPES.map((value) => ({ value, label: value }))),
  },
  {
    key: "paymentStatus",
    id: "search-payment-status",
    label: "Payment Status",
    options: withAnyOption(
      PAYMENT_STATUSES.map((value) => ({ value, label: formatLabel(value) })),
    ),
  },
  {
    key: "transactionStatus",
    id: "search-transaction-status",
    label: "Transaction Status",
    options: withAnyOption(
      TRANSACTION_STATUSES.map((value) => ({
        value,
        label: formatLabel(value),
      })),
    ),
  },
];

type Props = {
  filters: TransactionSearchFilters;
  onFilterChange: (key: FilterKey, value: string | null) => void;
  onMetadataSearch: (key: MetadataKey | null, value: string | null) => void;
  rows: TransactionLogEntry[];
  sorting: TransactionSorting;
  onSortingChange: (next: TransactionSorting) => void;
  emptyMessage: string;
};

export default function TransactionSearch({
  filters,
  onFilterChange,
  onMetadataSearch,
  rows,
  sorting,
  onSortingChange,
  emptyMessage,
}: Props) {
  // Metadata columns follow the selected fee; memoized so react-table keeps
  // seeing a stable columns reference between renders.
  const columns = useMemo(
    () => [...getColumns("search"), ...metadataColumns(filters.feeType)],
    [filters.feeType],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-y-6 rounded-md border bg-background p-4 lg:grid-cols-2 lg:gap-y-0 lg:divide-x">
        <div className="lg:pr-6">
          <h3 className="text-sm font-semibold">Filter by Type</h3>
          <div className="mt-3 flex flex-col gap-3">
            {FILTER_CONFIG.map((filter) => (
              <FilterSelect
                key={filter.key}
                id={filter.id}
                label={filter.label}
                value={filters[filter.key] ?? ANY_VALUE}
                options={filter.options}
                onChange={(value) =>
                  onFilterChange(filter.key, value === ANY_VALUE ? null : value)
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 lg:border-t-0 lg:pt-0 lg:pl-6">
          <h3 className="text-sm font-semibold">Direct Lookup</h3>
          <MetadataSearch
            key={filters.feeType ?? "none"}
            feeType={filters.feeType}
            metadataKey={filters.metadataKey}
            metadataValue={filters.metadataValue}
            onSearch={onMetadataSearch}
          />
        </div>
      </div>

      <TransactionTable
        rows={rows}
        columns={columns}
        caption="Transaction log, Search results"
        headerTone="bg-slate-50"
        sorting={sorting}
        onSortingChange={onSortingChange}
        emptyMessage={emptyMessage}
        wrapperClassName="max-h-[60vh] overflow-auto rounded-md border"
      />
    </div>
  );
}
