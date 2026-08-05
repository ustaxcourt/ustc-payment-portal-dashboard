/** Rendered in the Court's wall clock, matching the API's day boundaries. */
export const COURT_TIME_ZONE = "America/New_York";

const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: COURT_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const date = new Intl.DateTimeFormat("en-US", {
  timeZone: COURT_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatCourtDateTime = (iso: string | null | undefined): string =>
  iso ? dateTime.format(new Date(iso)) : "—";

export const formatCourtDate = (iso: string | null | undefined): string =>
  iso ? date.format(new Date(iso)) : "—";

export const formatCurrency = (amount: number | null | undefined): string =>
  typeof amount === "number" ? currency.format(amount) : "—";

export const formatLabel = (value: string | null | undefined): string =>
  value ? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "—";
