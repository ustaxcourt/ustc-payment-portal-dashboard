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

const stampDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: COURT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const stampTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: COURT_TIME_ZONE,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const wholeCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatCourtDateTime = (iso: string | null | undefined): string =>
  iso ? dateTime.format(new Date(iso)) : "—";

export const formatCourtDate = (iso: string | null | undefined): string =>
  iso ? date.format(new Date(iso)) : "—";

export const formatCourtStamp = (
  iso: string | null | undefined,
): { date: string; time: string } =>
  iso
    ? {
        date: stampDate.format(new Date(iso)),
        time: stampTime.format(new Date(iso)),
      }
    : { date: "—", time: "" };

export const formatCurrency = (amount: number | null | undefined): string =>
  typeof amount === "number" ? currency.format(amount) : "—";

export const formatWholeCurrency = (
  amount: number | null | undefined,
): string => (typeof amount === "number" ? wholeCurrency.format(amount) : "—");

export const formatLabel = (value: string | null | undefined): string =>
  value ? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "—";
