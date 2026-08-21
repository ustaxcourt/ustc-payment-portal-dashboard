import { describe, expect, it } from "vitest";
import { periodRange, periodSubtitle } from "./types";
import type { TotalPeriod } from "./types";

/** Court-local midnight is 04:00Z in EDT and 05:00Z in EST. */
const period = (from: string, to = "2026-02-18T20:00:00.000Z"): TotalPeriod => ({
  from,
  to,
  total: 0,
});

describe("periodSubtitle", () => {
  it("shows the single date for the day", () => {
    expect(periodSubtitle(period("2026-02-18T05:00:00.000Z"), "day")).toBe(
      "Feb 18, 2026",
    );
  });

  it("shows opened-to-now for the week", () => {
    expect(periodSubtitle(period("2026-02-15T05:00:00.000Z"), "week")).toBe(
      "Feb 15, 2026 – Feb 18, 2026",
    );
  });

  it("names the month", () => {
    expect(periodSubtitle(period("2026-02-01T05:00:00.000Z"), "month")).toBe(
      "February",
    );
  });

  // Fiscal, not calendar: the year opens on Oct 1, so Oct–Dec is Q1.
  it.each([
    ["2025-10-01T04:00:00.000Z", "Q1"],
    ["2026-01-01T05:00:00.000Z", "Q2"],
    ["2026-04-01T04:00:00.000Z", "Q3"],
    ["2026-07-01T04:00:00.000Z", "Q4"],
  ])("maps a quarter opening %s to %s", (from, expected) => {
    expect(periodSubtitle(period(from), "quarter")).toBe(expected);
  });

  it("labels the fiscal year by the calendar year it ends in", () => {
    expect(
      periodSubtitle(period("2025-10-01T04:00:00.000Z"), "fiscalYear"),
    ).toBe("FY26");
  });

  it("rolls the fiscal year label over on Oct 1", () => {
    expect(
      periodSubtitle(period("2026-10-01T04:00:00.000Z"), "fiscalYear"),
    ).toBe("FY27");
  });
});

describe("periodRange", () => {
  it("always carries both bounds, even when the period opened today", () => {
    expect(
      periodRange(
        period("2026-02-18T05:00:00.000Z", "2026-02-18T20:00:00.000Z"),
      ),
    ).toBe("Feb 18, 2026 to Feb 18, 2026");
  });

  it("spans the full window for the fiscal year", () => {
    expect(periodRange(period("2025-10-01T04:00:00.000Z"))).toBe(
      "Oct 1, 2025 to Feb 18, 2026",
    );
  });
});
