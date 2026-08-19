"use client";

import { formatCurrency } from "@/lib/format";
import { PERIOD_LABEL, periodSubtitle, TOTAL_PERIODS } from "./types";
import { useTotals } from "./useTotals";

const CELL = "border px-4 py-2";

export default function RevenueTotals() {
  const { data, isPending, isError, error, refetch } = useTotals();

  if (isError) {
    return (
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
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-center">
        <caption className="sr-only">
          Revenue totals for the current day, week, month, fiscal quarter and
          fiscal year, to date
        </caption>
        <thead>
          <tr className="bg-blue-100">
            <td className={`${CELL} border-0 bg-background`} />
            {TOTAL_PERIODS.map((period) => (
              <th key={period} scope="col" className={`${CELL} text-sm font-normal`}>
                <span className="font-bold">{PERIOD_LABEL[period]}</span>
                {data ? ` - ${periodSubtitle(data[period], period)}` : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className={`${CELL} border-0 text-right text-sm font-normal`}>
              Total
            </th>
            {TOTAL_PERIODS.map((period) => (
              <td key={period} className={`${CELL} text-2xl tabular-nums`}>
                {isPending ? (
                  <span className="mx-auto block h-7 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  formatCurrency(data[period].total)
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
