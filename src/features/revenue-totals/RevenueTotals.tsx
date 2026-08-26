"use client";

import ErrorPanel from "@/components/ui/ErrorPanel";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  fiscalYearLabel,
  PERIOD_LABEL,
  periodRange,
  periodSubtitle,
  SUBTITLE_IS_DATED,
  TOTAL_PERIODS,
  type PriorYearPeriod,
  type TotalPeriod,
} from "./types";
import { useTotals } from "./useTotals";

const CELL = "border px-4 py-2";
/** Named rather than inline, as `statusStyles.ts` does for the status tints.
 *  The dark variant is what a bare palette class would be missing. */
const HEADER_ROW = "bg-blue-100 dark:bg-blue-950";
const HEADING_ID = "revenue-totals-heading";

const formatTrendAmount = (amount: number): string => {
  const direction = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${direction}${formatCurrency(Math.abs(amount))}`;
};

const trendStyles = (amount: number): string =>
  amount > 0
    ? "text-green-700 dark:text-green-400"
    : amount < 0
      ? "text-red-700 dark:text-red-400"
      : "text-muted-foreground";

function TrendCell({
  current,
  priorYear,
}: {
  current: TotalPeriod;
  priorYear: PriorYearPeriod;
}) {
  if (!priorYear.hasData) {
    return <td className={cn(CELL, "text-lg text-muted-foreground")}>N/A</td>;
  }

  const amount = current.total - priorYear.total;
  const indicator = amount > 0 ? "▲" : amount < 0 ? "▼" : "•";

  return (
    <td className={cn(CELL, "text-lg tabular-nums")}>
      <span className={cn("font-semibold", trendStyles(amount))}>{indicator}</span>{" "}
      <span className="tabular-nums">{formatTrendAmount(amount)}</span>
    </td>
  );
}

/** Mirrors the transaction log's section/h2, so the page has one outline. */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="flex w-full flex-col gap-3"
    >
      {/* The design puts no title above the table; the outline still needs one. */}
      <h2 id={HEADING_ID} className="sr-only">
        Revenue Totals
      </h2>
      {children}
    </section>
  );
}

export default function RevenueTotals() {
  const { data, isPending, isError, error, refetch } = useTotals();

  if (isError) {
    return (
      <Panel>
        <ErrorPanel
          title="Could not load the revenue totals."
          message={error.message}
          onRetry={refetch}
        />
      </Panel>
    );
  }

  // The headers gain a date line once the periods arrive, so a table rendered
  // before them would reflow rather than fill in.
  if (isPending) {
    return (
      <Panel>
        <p role="status" className="text-sm text-muted-foreground">
          Loading revenue totals…
        </p>
      </Panel>
    );
  }

  const currentFiscalYear = fiscalYearLabel(data.current.fiscalYear);
  const priorYearFiscalYear = fiscalYearLabel(data.priorYear.fiscalYear);

  return (
    <Panel>
      <div className="overflow-x-auto">
      <table className="border-collapse text-center">
        <caption className="sr-only">
          Revenue totals for the current day, week, month, fiscal quarter and
          fiscal year, to date
        </caption>
        <thead>
          <tr className={HEADER_ROW}>
            <td className={cn(CELL, "border-0 bg-background")} />
            {TOTAL_PERIODS.map((period) => (
              <th key={period} scope="col" className={cn(CELL, "text-sm font-normal")}>
                <span className="font-bold">{PERIOD_LABEL[period]}</span>
                {` - ${periodSubtitle(data.current[period], period)}`}
                {SUBTITLE_IS_DATED.has(period) ? null : (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {periodRange(data.current[period])}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th
              scope="row"
              className={cn(CELL, "border-0 text-right text-sm font-normal")}
            >
              Current Total
            </th>
            {TOTAL_PERIODS.map((period) => (
              <td key={period} className={cn(CELL, "text-2xl tabular-nums")}>
                {formatCurrency(data.current[period].total)}
              </td>
            ))}
          </tr>
          <tr>
            <th
              scope="row"
              className={cn(CELL, "border-0 text-right text-sm font-normal")}
            >
              {`Year-over-Year Change (${currentFiscalYear} vs ${priorYearFiscalYear})`}
            </th>
            {TOTAL_PERIODS.map((period) => (
              <TrendCell
                key={period}
                current={data.current[period]}
                priorYear={data.priorYear[period]}
              />
            ))}
          </tr>
        </tbody>
        </table>
      </div>
    </Panel>
  );
}
