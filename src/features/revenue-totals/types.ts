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
};

export type TotalsResponse = Record<TotalPeriodName, TotalPeriod>;

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

/** Fiscal quarters open in Oct, Jan, Apr, Jul — the year opens on Oct 1. */
const FISCAL_QUARTER: Record<number, number> = { 10: 1, 1: 2, 4: 3, 7: 4 };

/** Labels the instants the server reported; no boundary is recomputed here. */
export const periodSubtitle = ({ from, to }: TotalPeriod, period: TotalPeriodName): string => {
  const opened = new Date(from);
  const parts = courtParts.formatToParts(opened);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const year = Number(parts.find((part) => part.type === "year")?.value);

  switch (period) {
    case "day":
      return formatCourtDate(from);
    case "week":
      return `${formatCourtDate(from)} – ${formatCourtDate(to)}`;
    case "month":
      return monthName.format(opened);
    case "quarter":
      return `Q${FISCAL_QUARTER[month]}`;
    default:
      // The year opens in October, so it belongs to the next fiscal year.
      return `FY${String(year + 1).slice(-2)}`;
  }
};
