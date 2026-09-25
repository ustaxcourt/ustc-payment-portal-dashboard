"use client";

import { Button } from "@/components/ui/button";
import FilterSelect from "@/components/ui/FilterSelect";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import MetadataSearch from "./MetadataSearch";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TEXT_TONE } from "./statusStyles";
import {
  FEE_TYPE_LABEL,
  FEE_TYPES,
  type MetadataKey,
  PAY_TYPES,
  PAYMENT_STATUSES,
  type PaymentStatus,
  TRANSACTION_STATUSES,
  type TransactionCounts,
  type TransactionSearchFilters,
} from "./types";

type FilterKey = keyof TransactionSearchFilters;

const ANY_VALUE = "Any";

const withAnyOption = (
  anyLabel: string,
  options: readonly { value: string; label: string }[],
) => [{ value: ANY_VALUE, label: anyLabel }, ...options];

const FEE_TYPE_FILTER: {
  key: FilterKey;
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
} = {
  key: "feeType",
  id: "filter-fee-type",
  label: "Fee Type",
  options: withAnyOption(
    "Any",
    FEE_TYPES.map((value) => ({ value, label: FEE_TYPE_LABEL[value] })),
  ),
};

const FILTER_CONFIG: {
  key: FilterKey;
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
}[] = [
  {
    key: "payType",
    id: "filter-pay-method",
    label: "Pay Method",
    options: withAnyOption(
      "Any method",
      PAY_TYPES.map((value) => ({ value, label: value })),
    ),
  },
  {
    key: "transactionStatus",
    id: "filter-transaction-status",
    label: "Transaction Status",
    options: withAnyOption(
      "Any status",
      TRANSACTION_STATUSES.map((value) => ({
        value,
        label: formatLabel(value),
      })),
    ),
  },
];

type Props = {
  filters: TransactionSearchFilters;
  counts?: TransactionCounts;
  onFilterChange: (key: FilterKey, value: string | null) => void;
  onMetadataSearch: (key: MetadataKey | null, value: string | null) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export default function TransactionFilters({
  filters,
  counts,
  onFilterChange,
  onMetadataSearch,
  onClear,
  hasActiveFilters,
}: Props) {
  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-y-auto lg:min-h-0">
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filters</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={onClear}
          >
            Clear All
          </Button>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Payment Status</h4>
          <RadioGroup
            className="mt-3 gap-4"
            value={filters.paymentStatus ?? "all"}
            onValueChange={(value) =>
              onFilterChange(
                "paymentStatus",
                value === "all" ? null : (value as PaymentStatus),
              )
            }
          >
            {/* biome-ignore lint/a11y/noLabelWithoutControl: RadioGroupItem renders Base UI's hidden <input>, associated via its Labelable context — the linter can't see through the custom component. */}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="all" />
              <span>All Payment Status ({counts?.all ?? "—"})</span>
            </label>
            {PAYMENT_STATUSES.map((status) => (
              // biome-ignore lint/a11y/noLabelWithoutControl: see above.
              <label
                key={status}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <RadioGroupItem value={status} />
                <span className={PAYMENT_STATUS_TEXT_TONE[status]}>
                  {PAYMENT_STATUS_LABEL[status]} ({counts?.[status] ?? "—"})
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="border-t border-status-neutral" />
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 px-4 py-3",
          filters.feeType && "bg-status-neutral-subtle",
        )}
      >
        <FilterSelect
          id={FEE_TYPE_FILTER.id}
          label={FEE_TYPE_FILTER.label}
          value={filters.feeType ?? ANY_VALUE}
          options={FEE_TYPE_FILTER.options}
          onChange={(value) =>
            onFilterChange("feeType", value === ANY_VALUE ? null : value)
          }
          triggerClassName="bg-background"
        />
        {filters.feeType ? (
          <>
            <div className="border-t border-status-neutral" />
            <MetadataSearch
              key={filters.feeType}
              feeType={filters.feeType}
              metadataKey={filters.metadataKey}
              metadataValue={filters.metadataValue}
              onSearch={onMetadataSearch}
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-6 p-4">
        <div className="flex flex-col gap-5">
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
    </aside>
  );
}
