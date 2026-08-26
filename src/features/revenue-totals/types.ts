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

export type TotalsSnapshot = Record<TotalPeriodName, TotalPeriod>;

export type TotalsResponse = {
  current: TotalsSnapshot;
  previous: TotalsSnapshot;
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

/** Labels the instants the server reported; no boundary is recomputed here. */
export const periodSubtitle = (
  { from, to }: TotalPeriod,
  period: TotalPeriodName,
): string => {
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
      return `Q${fiscalQuarter(month)}`;
    default:
      // The year opens in October, so it belongs to the next fiscal year.
      return `FY${String(year + 1).slice(-2)}`;
  }
};
