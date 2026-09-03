import { courtMidnightUtc, getCourtCalendarDate } from "@/lib/courtCalendar";
import type { TotalPeriodName } from "./types";

/** The instant the period closes, anchored to the server's `from`. The calendar
 *  day is advanced in UTC-day space; `courtMidnightUtc` absorbs DST. */
export const periodEnd = (period: TotalPeriodName, from: string): Date => {
  const opened = getCourtCalendarDate(new Date(from));
  const year = opened.getUTCFullYear();
  const month = opened.getUTCMonth();
  const day = opened.getUTCDate();

  switch (period) {
    case "day":
      return courtMidnightUtc(new Date(Date.UTC(year, month, day + 1)));
    case "week":
      return courtMidnightUtc(new Date(Date.UTC(year, month, day + 7)));
    case "month":
      return courtMidnightUtc(new Date(Date.UTC(year, month + 1, 1)));
    case "quarter":
      // Fiscal quarters open Oct 1, Jan 1, Apr 1, Jul 1; the year closes on the next Oct 1.
      return courtMidnightUtc(new Date(Date.UTC(year, month + 3, 1)));
    default:
      return courtMidnightUtc(new Date(Date.UTC(year + 1, 9, 1)));
  }
};
