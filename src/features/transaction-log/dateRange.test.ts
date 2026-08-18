import { describe, expect, it } from "vitest";
import {
  MIN_CUSTOM_RANGE_YEAR,
  fromDatePickerValue,
  getCourtCalendarDate,
  getCustomRangeValidationError,
  parseInputDate,
  resolveAppliedDateRange,
  toDatePickerValue,
} from "./dateRange";

describe("parseInputDate", () => {
  it("accepts a valid MM/DD/YYYY date", () => {
    expect(parseInputDate("08/18/2026")?.toISOString()).toBe(
      "2026-08-18T00:00:00.000Z",
    );
  });

  it("rejects an impossible calendar date", () => {
    expect(parseInputDate("02/30/2026")).toBeNull();
  });
});

describe("date picker conversions", () => {
  it("converts between MM/DD/YYYY and YYYY-MM-DD", () => {
    expect(toDatePickerValue("08/18/2026")).toBe("2026-08-18");
    expect(fromDatePickerValue("2026-08-18")).toBe("08/18/2026");
  });

  it("returns null for an invalid date picker value", () => {
    expect(fromDatePickerValue("2026-02-30")).toBeNull();
  });
});

describe("getCourtCalendarDate", () => {
  it("normalizes to the court day rather than the UTC day", () => {
    const instant = new Date("2026-08-18T02:30:00.000Z");

    expect(getCourtCalendarDate(instant).toISOString()).toBe(
      "2026-08-17T00:00:00.000Z",
    );
  });
});

describe("getCustomRangeValidationError", () => {
  const today = new Date("2026-08-18T00:00:00.000Z");

  it("accepts a valid custom range", () => {
    expect(
      getCustomRangeValidationError("08/05/2026", "08/18/2026", today),
    ).toBeNull();
  });

  it("rejects a reversed range", () => {
    expect(
      getCustomRangeValidationError("08/18/2026", "08/05/2026", today),
    ).toBe("The From date must be on or before the To date.");
  });

  it("rejects dates before the supported year on either end", () => {
    expect(
      getCustomRangeValidationError(
        `${String(12).padStart(2, "0")}/31/${MIN_CUSTOM_RANGE_YEAR - 1}`,
        "01/01/2026",
        today,
      ),
    ).toBe(
      `Please enter a date from January 1, ${MIN_CUSTOM_RANGE_YEAR} or later.`,
    );

    expect(
      getCustomRangeValidationError(
        `01/01/${MIN_CUSTOM_RANGE_YEAR - 1}`,
        `${String(12).padStart(2, "0")}/31/${MIN_CUSTOM_RANGE_YEAR - 1}`,
        today,
      ),
    ).toBe(
      `Please enter a date from January 1, ${MIN_CUSTOM_RANGE_YEAR} or later.`,
    );
  });
});

describe("resolveAppliedDateRange", () => {
  const now = new Date("2026-08-18T16:00:00.000Z");

  it("builds the last 7 days preset from the court day", () => {
    expect(resolveAppliedDateRange("last7", null, null, now)).toEqual({
      preset: "last7",
      from: "08/12/2026",
      to: "08/18/2026",
      label: "Last 7 days",
    });
  });

  it("keeps a valid custom range and requested values", () => {
    expect(
      resolveAppliedDateRange("custom", "08/05/2026", "08/18/2026", now),
    ).toEqual({
      preset: "custom",
      from: "08/05/2026",
      to: "08/18/2026",
      label: "08/05/2026 - 08/18/2026",
      requestedFrom: "08/05/2026",
      requestedTo: "08/18/2026",
    });
  });

  it("surfaces an invalid custom range label while falling back to today", () => {
    expect(
      resolveAppliedDateRange("custom", "08/18/2026", "08/05/2026", now),
    ).toEqual({
      preset: "custom",
      from: "08/18/2026",
      to: "08/18/2026",
      label: "Invalid custom range (08/18/2026 - 08/05/2026); showing Today",
      requestedFrom: "08/18/2026",
      requestedTo: "08/05/2026",
    });
  });
});
