import { COURT_TIME_ZONE } from "@/lib/format";

const courtDayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: COURT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Court-time calendar day the instant falls on, as a UTC-midnight Date —
 *  a plain year/month/day triple that survives UTC date arithmetic. */
export const getCourtCalendarDate = (value = new Date()): Date => {
  const parts = courtDayParts.formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
};

/** UTC instant of Court-time midnight on the given calendar day. ET midnight
 *  is 04:00Z under EDT or 05:00Z under EST; the 04:00Z candidate lands on the
 *  requested Court calendar day only when EDT is in effect. */
export const courtMidnightUtc = (calendarDay: Date): Date => {
  const edt = new Date(
    Date.UTC(
      calendarDay.getUTCFullYear(),
      calendarDay.getUTCMonth(),
      calendarDay.getUTCDate(),
      4,
    ),
  );
  if (getCourtCalendarDate(edt).getTime() === calendarDay.getTime()) return edt;
  return new Date(
    Date.UTC(
      calendarDay.getUTCFullYear(),
      calendarDay.getUTCMonth(),
      calendarDay.getUTCDate(),
      5,
    ),
  );
};
