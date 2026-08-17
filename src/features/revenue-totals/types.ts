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
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  fiscalYear: "This fiscal year",
};
