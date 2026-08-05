"use client";

import { cn } from "@/lib/utils";
import type { PaymentStatus, TransactionCounts } from "./types";

import { STATUS_LABEL, STATUS_TONE } from "./statusStyles";

const OPTIONS: PaymentStatus[] = ["success", "failed", "pending"];

// Counts cover the whole timeframe, so they hold steady as the selection changes.
export default function StatusFilter({
  selected,
  counts,
  onSelect,
}: {
  selected: PaymentStatus;
  counts?: TransactionCounts;
  onSelect: (status: PaymentStatus) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Filter by payment status"
    >
      {OPTIONS.map((option) => {
        const isSelected = option === selected;

        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(option)}
            className={cn(
              "flex items-center gap-3 rounded-md border px-4 py-3 transition-colors",
              isSelected
                ? "border-foreground bg-background font-semibold"
                : "border-transparent bg-muted hover:bg-muted/70",
            )}
          >
            <span>{STATUS_LABEL[option]}</span>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-sm font-semibold tabular-nums",
                STATUS_TONE[option],
              )}
            >
              {counts ? counts[option] : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
