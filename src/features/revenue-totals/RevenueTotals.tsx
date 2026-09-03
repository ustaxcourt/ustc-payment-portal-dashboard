"use client";

import ErrorPanel from "@/components/ui/ErrorPanel";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  fiscalYearLabel,
  PERIOD_LABEL,
  periodRange,
  periodSubtitle,
  priorFiscalYearLabel,
  SUBTITLE_IS_DATED,
  TOTAL_PERIODS,
  type YoYTrend,
} from "./types";
import { useTotals } from "./useTotals";

const CELL = "border px-4 py-1.5";
const HEADER_ROW = "bg-totals-header";
const HEADING_ID = "revenue-totals-heading";

const formatTrendPercent = (percentChange: number | null): string | null => {
  if (typeof percentChange !== "number" || !Number.isFinite(percentChange)) {
    return null;
  }

  return `${Math.round(Math.abs(percentChange))}%`;
};

function TrendCell({
  trend,
}: {
  trend: YoYTrend;
}) {
  const amount = trend.difference;
  const percent = formatTrendPercent(trend.percentChange);
  const { glyph, sign, className } = getTrendTone(amount);
  const showGlyph = amount !== 0;

  return (
    <td className={cn(CELL, "text-lg tabular-nums")}>
      {showGlyph && (
        <>
          <span className={cn("font-semibold", className)}>
            {glyph}
          </span>{" "}
        </>
      )}

      <span className="tabular-nums">
        {sign}
        {formatCurrency(Math.abs(amount))}
      </span>{" "}
      ({percent ?? "N/A"})
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

type TrendTone = {
  glyph: string;
  sign: "+" | "-" | "";
  className: string;
};

const getTrendTone = (amount: number): TrendTone => {
  if (amount > 0) {
    return {
      glyph: "▲",
      sign: "+",
      className: "text-status-success-foreground",
    };
  }

  if (amount < 0) {
    return {
      glyph: "▼",
      sign: "-",
      className: "text-status-failed-foreground",
    };
  }

  return {
    glyph: "•",
    sign: "",
    className: "text-muted-foreground",
  };
};

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
  const priorYearFiscalYear = priorFiscalYearLabel(data.current.fiscalYear);

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
              <th
                key={period}
                scope="col"
                className={cn(CELL, "min-w-32 text-sm font-normal")}
              >
                <span className="font-bold">{PERIOD_LABEL[period]}</span>
                {` - ${periodSubtitle(data.current[period], period)}`}
                {/* The design shows only the subtitle; the summed window still
                    reads out where the subtitle alone doesn't date it. */}
                {SUBTITLE_IS_DATED.has(period) ? null : (
                  <span className="sr-only">{periodRange(data.current[period])}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th
              scope="row"
              className={cn(CELL, "border-0 text-right text-sm font-normal whitespace-nowrap")}
            >
              Current Total
            </th>
            {TOTAL_PERIODS.map((period) => (
              <td key={period} className={cn(CELL, "text-lg tabular-nums")}>
                {formatCurrency(data.current[period].total)}
              </td>
            ))}
          </tr>
          <tr>
            <th
              scope="row"
              className={cn(CELL, "border-0 text-right text-sm font-normal")}
            >
              {`YoY Trend (${currentFiscalYear} vs ${priorYearFiscalYear})`}
            </th>
            {TOTAL_PERIODS.map((period) => (
              <TrendCell
                key={period}
                trend={data.yoyTrends[period]}
              />
            ))}
          </tr>
        </tbody>
        </table>
      </div>
    </Panel>
  );
}
