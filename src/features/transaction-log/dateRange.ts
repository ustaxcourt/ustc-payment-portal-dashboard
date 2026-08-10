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
};

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

const getCourtCalendarDate = (value = new Date()): Date => {
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

export const formatDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
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
    return buildPresetRange("today", now);
  }

  const parsedFrom = parseInputDate(from);
  const parsedTo = parseInputDate(to);

  if (!parsedFrom || !parsedTo || parsedFrom >= parsedTo) {
    return buildPresetRange("today", now);
  }

  return {
    preset,
    from,
    to,
    label: `${from} - ${to}`,
  };
};
