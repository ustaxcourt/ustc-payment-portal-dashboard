import { formatCourtDate, formatCurrency } from "@/lib/format";
import type { TotalPeriod } from "./types";

export default function TotalCard({
  label,
  period,
}: {
  label: string;
  period: TotalPeriod;
}) {
  // The server reports the range it summed, so the label cannot disagree with
  // the figure above it.
  const range =
    formatCourtDate(period.from) === formatCourtDate(period.to)
      ? formatCourtDate(period.from)
      : `${formatCourtDate(period.from)} – ${formatCourtDate(period.to)}`;

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">
        {formatCurrency(period.total)}
      </p>
      <p className="text-xs text-muted-foreground">{range}</p>
    </div>
  );
}

export function TotalCardSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="h-8 w-28 animate-pulse rounded bg-muted" />
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}
