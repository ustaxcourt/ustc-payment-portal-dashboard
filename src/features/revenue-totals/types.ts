import type { FeeBreakdownRow } from "@/features/transaction-log/types";
import { COURT_TIME_ZONE, formatCourtDate } from "@/lib/format";

/** Mirrors `TransactionTotalsSchema` in the payment portal. */
export const TOTAL_PERIODS = [
  "day",
  "week",
  "month",
  "quarter",
  "fiscalYear",
] as const;

export type TotalPeriodName = (typeof TOTAL_PERIODS)[number];

export type TotalPeriod = {
  /** Court-local midnight the period opened at. */
  from: string;
  /** Instant the period was totalled at — now, not the period end. */
  to: string;
  /** Summed transaction amounts in USD, successful payments only. */
  total: number;
  /** Per-fee counts for the window, computed from the same tallies as `total`. */
  fees: FeeBreakdownRow[];
};

export type TotalsSnapshot = Record<TotalPeriodName, TotalPeriod>;

export type YoYTrend = {
  current: number;
  previous: number | null;
  difference: number | null;
  percentChange: number | null;
  available: boolean;
};

export type YoYTrendSnapshot = Record<TotalPeriodName, YoYTrend>;

export type TotalsResponse = {
  current: TotalsSnapshot;
  yoyTrends: YoYTrendSnapshot;
};

const fiscalYearFromDate = (from: string, offset: number): string => {
  const opened = new Date(from);
  const parts = courtParts.formatToParts(opened);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  return `FY${String(year + offset).slice(-2)}`;
};

export const fiscalYearLabel = (period: TotalPeriod): string =>
  fiscalYearFromDate(period.from, 1);

export const priorFiscalYearLabel = (period: TotalPeriod): string =>
  fiscalYearFromDate(period.from, 0);

export const periodSubtitle = (
  { from, to }: TotalPeriod,
  period: TotalPeriodName,
): string => {
  switch (period) {
    case "day":
      return formatCourtDate(from);
    case "week":
      return `${formatCourtDate(from)} – ${formatCourtDate(to)}`;
    case "month":
      return monthName.format(new Date(from));
    case "quarter": {
      const parts = courtParts.formatToParts(new Date(from));
      const month = Number(parts.find((part) => part.type === "month")?.value);
      return `Q${fiscalQuarter(month)}`;
    }
    default:
      return fiscalYearFromDate(from, 1);
  }
};

export const PERIOD_LABEL: Record<TotalPeriodName, string> = {
  day: "Today",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  fiscalYear: "Fiscal Year",
};

const courtParts = new Intl.DateTimeFormat("en-US", {
  timeZone: COURT_TIME_ZONE,
  year: "numeric",
  month: "numeric",
});

const monthName = new Intl.DateTimeFormat("en-US", {
  timeZone: COURT_TIME_ZONE,
  month: "long",
});

/**
 * Fiscal quarters open in Oct, Jan, Apr, Jul, because the year opens on Oct 1.
 * Shifting by two months puts October at index 0. Total over all twelve months,
 * so an unexpected value cannot render "Qundefined".
 */
const fiscalQuarter = (month: number): number =>
  Math.floor(((month + 2) % 12) / 3) + 1;

/**
 * Periods whose subtitle is already a date, so printing the window beneath
 * them would only restate it.
 */
export const SUBTITLE_IS_DATED = new Set<TotalPeriodName>(["day", "week"]);

/**
 * The window the server summed, shown under "February" / "Q2" / "FY26" — labels
 * that name a period without saying when it opened. A fiscal quarter needs it
 * most, since Q1 runs Oct–Dec.
 */
export const periodRange = ({ from, to }: TotalPeriod): string =>
  `${formatCourtDate(from)} to ${formatCourtDate(to)}`;
