"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { formatCurrency, formatWholeCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { projectedFees } from "./projection";
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

const CELL = "px-3 py-1 text-left";
const PERIOD_HEADER = cn(CELL, "border-b text-sm font-normal");
const TABLE = "w-full min-w-[60rem] table-fixed border-collapse";
const HEADING_ID = "revenue-totals-heading";
const CAPTION_ID = "revenue-totals-caption";

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
  const { difference, percentChange } = trend;

  const percent = formatTrendPercent(percentChange) ?? "N/A";

  const { glyph, sign, className } = getTrendTone(difference ?? 0);
  const showGlyph = (difference ?? 0) !== 0;

  return (
    <td className={cn(CELL, "text-sm tabular-nums", className)}>
      <span className="whitespace-nowrap">
        {showGlyph && (
          <>
            <span aria-hidden="true">{glyph}</span>{" "}
          </>
        )}
        {sign}
        {formatCurrency(Math.abs(difference ?? 0))}
      </span>{" "}
      <span className="whitespace-nowrap">({percent})</span>
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

function Columns() {
  return (
    <colgroup>
      <col className="w-56" />
      {TOTAL_PERIODS.map((period) => (
        <col key={period} />
      ))}
    </colgroup>
  );
}

const PLACEHOLDER_ROWS = [
  { row: "current", height: "h-6" },
  { row: "trend", height: "h-5" },
  { row: "projected", height: "h-5" },
];

function useHorizontalOverflow() {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () =>
      setOverflowing(element.scrollWidth > element.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, overflowing };
}

function ScrollArea({ children }: { children: ReactNode }) {
  const { ref, overflowing } = useHorizontalOverflow();
  const scrollable = overflowing
    ? ({ tabIndex: 0, role: "region", "aria-labelledby": CAPTION_ID } as const)
    : {};

  return (
    <div
      ref={ref}
      {...scrollable}
      className="overflow-x-auto rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </div>
  );
}

function LoadingTotals() {
  return (
    <Panel>
      <p role="status" className="sr-only">
        Loading revenue totals…
      </p>
      <div className="overflow-hidden">
        <table aria-hidden="true" className={TABLE}>
          <Columns />
          <thead>
            <tr>
              <td />
              {TOTAL_PERIODS.map((period) => (
                <td key={period} className={PERIOD_HEADER}>
                  <span className="font-semibold">{PERIOD_LABEL[period]}</span>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLACEHOLDER_ROWS.map(({ row, height }) => (
              <tr key={row}>
                <td />
                {TOTAL_PERIODS.map((period) => (
                  <td key={period} className={CELL}>
                    <div
                      className={cn(height, "w-28 rounded bg-muted motion-safe:animate-pulse")}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
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

  if (isPending) {
    return <LoadingTotals />;
  }

  const currentFiscalYear = fiscalYearLabel(data.current.fiscalYear);
  const priorYearFiscalYear = priorFiscalYearLabel(data.current.fiscalYear);

  return (
    <Panel>
      <ScrollArea>
        <table className={TABLE}>
          <caption id={CAPTION_ID} className="sr-only">
            Revenue totals for the current day, week, month, fiscal quarter and
            fiscal year, to date
          </caption>
          <Columns />
          <thead>
            <tr>
              <td />
              {TOTAL_PERIODS.map((period) => (
                <th key={period} scope="col" className={PERIOD_HEADER}>
                  <span className="font-semibold">{PERIOD_LABEL[period]}</span>
                  <span className="sr-only">,</span>{" "}
                  <span aria-hidden="true" className="text-muted-foreground">
                    ·{" "}
                  </span>
                  <span className="text-muted-foreground">
                    {periodSubtitle(data.current[period], period)}
                  </span>
                  {/* The design shows only the subtitle; the summed window still
                      reads out where the subtitle alone doesn't date it. */}
                  {SUBTITLE_IS_DATED.has(period) ? null : (
                    <>
                      <span className="sr-only">,</span>{" "}
                      <span className="sr-only">{periodRange(data.current[period])}</span>
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th
                scope="row"
                className={cn(CELL, "text-right text-sm font-semibold whitespace-nowrap")}
              >
                Current Total
              </th>
              {TOTAL_PERIODS.map((period) => (
                <td
                  key={period}
                  className={cn(CELL, "font-mono text-base font-semibold tabular-nums")}
                >
                  {formatCurrency(data.current[period].total)}
                </td>
              ))}
            </tr>
            <tr>
              <th
                scope="row"
                className={cn(CELL, "text-right text-sm font-normal")}
              >
                {`YoY Trend (${currentFiscalYear} vs. ${priorYearFiscalYear})`}
              </th>
              {TOTAL_PERIODS.map((period) => (
                <TrendCell
                  key={period}
                  trend={data.yoyTrends[period]}
                />
              ))}
            </tr>
            <tr>
              <th
                scope="row"
                className={cn(
                  CELL,
                  "text-right text-xs font-normal whitespace-nowrap text-muted-foreground",
                )}
              >
                Projected Total
                <span className="sr-only">
                  , estimated from the rate collected so far
                </span>
              </th>
              {TOTAL_PERIODS.map((period) => (
                <td
                  key={period}
                  className={cn(CELL, "font-mono text-sm tabular-nums italic text-muted-foreground")}
                >
                  {formatWholeCurrency(
                    projectedFees(period, data.current[period]),
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </ScrollArea>
    </Panel>
  );
}
