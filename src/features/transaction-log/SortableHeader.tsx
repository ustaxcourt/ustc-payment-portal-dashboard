"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

const DIRECTION_ICON = {
  asc: ArrowUp,
  desc: ArrowDown,
} as const;

/**
 * A column header that can be sorted. Presentational on purpose — it takes the
 * current direction and a callback rather than reaching into a table instance,
 * so it works for any table and can be exercised without one.
 *
 * The sorted state is carried by `aria-sort` on the enclosing `<th>`, which is
 * where assistive technology looks for it; this renders the visible affordance.
 */
export default function SortableHeader({
  label,
  sorted,
  onToggle,
  className,
}: {
  label: string;
  sorted: SortDirection | false;
  onToggle: () => void;
  className?: string;
}) {
  // Shape carries the state, not just weight, so it survives a greyscale print.
  const Icon = sorted ? DIRECTION_ICON[sorted] : ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-sm py-1 text-left font-medium",
        "outline-none transition-colors",
        // Tinted rather than a fixed colour, so it reads on every header tone.
        "hover:bg-black/5",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span>{label}</span>
      <Icon
        aria-hidden="true"
        className={cn("size-3.5 shrink-0", sorted ? "opacity-100" : "opacity-40")}
      />
    </button>
  );
}
