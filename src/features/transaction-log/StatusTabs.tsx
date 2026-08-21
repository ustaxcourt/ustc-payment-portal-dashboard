"use client";

import { cn } from "@/lib/utils";
import { TAB_LABEL, TAB_TONE } from "./statusStyles";
import { VIEW_TABS } from "./types";
import type { TransactionCounts, TransactionTab, ViewTab } from "./types";

const isStatusTab = (tab: ViewTab): tab is TransactionTab => tab !== "search";

// Counts cover the whole timeframe, so they hold steady as the selection changes.
export default function StatusTabs({
  selected,
  counts,
  onSelect,
}: {
  selected: ViewTab;
  counts?: TransactionCounts;
  onSelect: (tab: ViewTab) => void;
}) {
  return (
    <div
      className="flex items-end gap-2"
      role="tablist"
      aria-label="Filter by payment status"
    >
      {VIEW_TABS.map((option) => {
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
                ? "-mb-px border border-b-background bg-background font-semibold"
                : "border border-transparent bg-muted text-muted-foreground underline hover:bg-muted/70",
            )}
          >
            <span>{TAB_LABEL[option]}</span>
            {isStatusTab(option) ? (
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-sm font-semibold tabular-nums",
                  TAB_TONE[option],
                )}
              >
                {counts ? counts[option] : "—"}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
