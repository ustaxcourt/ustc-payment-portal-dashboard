"use client";

import TotalCard, { TotalCardSkeleton } from "./TotalCard";
import { PERIOD_LABEL, TOTAL_PERIODS } from "./types";
import { useTotals } from "./useTotals";

const GRID = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5";

export default function RevenueTotals() {
  const { data, isPending, isError, error, refetch } = useTotals();

  if (isError) {
    return (
      <section aria-labelledby="revenue-totals-heading">
        <h2 id="revenue-totals-heading" className="sr-only">
          Revenue totals
        </h2>
        <div className="rounded-md border border-destructive/50 p-6 text-sm">
          <p className="font-medium">Could not load the revenue totals.</p>
          <p className="mt-1 text-muted-foreground">{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="revenue-totals-heading">
      <h2 id="revenue-totals-heading" className="sr-only">
        Revenue totals
      </h2>
      <div className={GRID}>
        {TOTAL_PERIODS.map((period) =>
          isPending ? (
            <TotalCardSkeleton key={period} label={PERIOD_LABEL[period]} />
          ) : (
            <TotalCard
              key={period}
              label={PERIOD_LABEL[period]}
              period={data[period]}
            />
          ),
        )}
      </div>
    </section>
  );
}
