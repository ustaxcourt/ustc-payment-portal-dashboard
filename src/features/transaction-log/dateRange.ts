import { COURT_TIME_ZONE } from "@/lib/format";

export const DATE_RANGE_PRESETS = [
  "today",
  "last7",
  "monthToDate",
  "custom",
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export type AppliedDateRange = {
  preset: DateRangePreset;
  from: string;
  to: string;
  label: string;
  requestedFrom?: string | null;
  requestedTo?: string | null;
};

export const MIN_CUSTOM_RANGE_YEAR = 2026;

const courtDayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: COURT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const PRESET_LABEL: Record<Exclude<DateRangePreset, "custom">, string> = {
  today: "Today",
  last7: "Last 7 days",
  monthToDate: "Month to date",
};

const pad = (value: number) => String(value).padStart(2, "0");

export const getCourtCalendarDate = (value = new Date()): Date => {
  const parts = courtDayParts.formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
};

const shiftUtcDays = (value: Date, days: number): Date => {
  const shifted = new Date(value);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
};

const toInputDate = (value: Date): string => {
  const month = pad(value.getUTCMonth() + 1);
  const day = pad(value.getUTCDate());
  const year = value.getUTCFullYear();

  return `${month}/${day}/${year}`;
};

/** UTC instant of Court-time midnight on the given calendar day. ET midnight
 *  is 04:00Z under EDT or 05:00Z under EST; the 04:00Z candidate lands on the
 *  requested Court calendar day only when EDT is in effect. */
const courtMidnightUtc = (calendarDay: Date): Date => {
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

/** The applied range as exact ISO instants — inclusive Court-midnight start,
 *  exclusive next-midnight end. The API keeps ISO timestamps as-is, so this
 *  works without server-side day expansion. */
export const courtDayIsoBounds = (
  range: Pick<AppliedDateRange, "from" | "to">,
): { from: string; to: string } => {
  const fromDay = parseInputDate(range.from);
  const toDay = parseInputDate(range.to);
  if (!fromDay || !toDay) return { from: range.from, to: range.to };

  return {
    from: courtMidnightUtc(fromDay).toISOString(),
    to: courtMidnightUtc(shiftUtcDays(toDay, 1)).toISOString(),
  };
};

const buildPresetRange = (
  preset: Exclude<DateRangePreset, "custom">,
  now = new Date(),
): AppliedDateRange => {
  const today = getCourtCalendarDate(now);

  if (preset === "today") {
    const value = toInputDate(today);
    return { preset, from: value, to: value, label: PRESET_LABEL[preset] };
  }

  if (preset === "last7") {
    return {
      preset,
      from: toInputDate(shiftUtcDays(today, -6)),
      to: toInputDate(today),
      label: PRESET_LABEL[preset],
    };
  }

  return {
    preset,
    from: toInputDate(
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    ),
    to: toInputDate(today),
    label: PRESET_LABEL[preset],
  };
};

const buildInvalidCustomRange = (
  from: string | null,
  to: string | null,
  now = new Date(),
): AppliedDateRange => {
  const fallback = buildPresetRange("today", now);
  const requestedLabel = [from ?? "missing From", to ?? "missing To"].join(
    " - ",
  );

  return {
    ...fallback,
    preset: "custom",
    label: `Invalid custom range (${requestedLabel}); showing Today`,
    requestedFrom: from,
    requestedTo: to,
  };
};

export const parseInputDate = (value: string): Date | null => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return null;
  }

  const [monthText, dayText, yearText] = value.split("/");
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate;
};

export const getCustomRangeValidationError = (
  from: string,
  to: string,
  today = getCourtCalendarDate(),
): string | null => {
  const parsedFrom = parseInputDate(from);
  const parsedTo = parseInputDate(to);

  if (!parsedFrom || !parsedTo) {
    return "Dates must be valid.";
  }

  if (parsedFrom > parsedTo) {
    return "The From date must be on or before the To date.";
  }

  if (parsedFrom > today || parsedTo > today) {
    return "Dates cannot be in the future.";
  }

  if (
    parsedFrom.getUTCFullYear() < MIN_CUSTOM_RANGE_YEAR ||
    parsedTo.getUTCFullYear() < MIN_CUSTOM_RANGE_YEAR
  ) {
    return `Please enter a date from January 1, ${MIN_CUSTOM_RANGE_YEAR} or later.`;
  }

  return null;
};

export const toDatePickerValue = (value: string): string => {
  const parsed = parseInputDate(value);

  if (!parsed) {
    return "";
  }

  const month = pad(parsed.getUTCMonth() + 1);
  const day = pad(parsed.getUTCDate());
  const year = parsed.getUTCFullYear();

  return `${year}-${month}-${day}`;
};

export const fromDatePickerValue = (value: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${monthText}/${dayText}/${yearText}`;
};

export const resolveAppliedDateRange = (
  preset: DateRangePreset,
  from: string | null,
  to: string | null,
  now = new Date(),
): AppliedDateRange => {
  if (preset !== "custom") {
    return buildPresetRange(preset, now);
  }

  if (!from || !to) {
    return buildInvalidCustomRange(from, to, now);
  }

  if (getCustomRangeValidationError(from, to, getCourtCalendarDate(now))) {
    return buildInvalidCustomRange(from, to, now);
  }

  return {
    preset,
    from,
    to,
    label: `${from} - ${to}`,
    requestedFrom: from,
    requestedTo: to,
  };
};
