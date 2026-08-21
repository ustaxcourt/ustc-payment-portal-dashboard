"use client";

import { cn } from "@/lib/utils";
import { TAB_LABEL, TAB_TONE } from "./statusStyles";
import { TRANSACTION_TABS } from "./types";
import type { TransactionCounts, TransactionTab } from "./types";

// Counts cover the whole timeframe, so they hold steady as the selection changes.
export default function StatusTabs({
  selected,
  counts,
  onSelect,
}: {
  selected: TransactionTab;
  counts?: TransactionCounts;
  onSelect: (tab: TransactionTab) => void;
}) {
  return (
    <div
      className="flex items-end gap-2 border-b-2 border-muted-foreground"
      role="tablist"
      aria-label="Filter by payment status"
    >
      {TRANSACTION_TABS.map((option) => {
        const isSelected = option === selected;

        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(option)}
            className={cn(
              "flex items-center gap-3 rounded-t-md px-5 py-3 text-sm transition-colors",
              // Sits on the table's border so the two read as one panel.
              isSelected
                ? "-mb-0.5 border-2 border-b-0 border-muted-foreground bg-background pt-3.5 font-semibold"
                : "border-2 border-b-0 border-border bg-muted text-muted-foreground underline hover:bg-muted/70",
            )}
          >
            <span>{TAB_LABEL[option]}</span>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-sm font-semibold tabular-nums",
                TAB_TONE[option],
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
