import { describe, expect, it } from "vitest";
import { periodEnd, projectedTotal } from "./projection";
import type { TotalPeriod } from "./types";

/** Court-local midnight is 04:00Z in EDT and 05:00Z in EST; in 2026, EDT runs
 *  Mar 8 – Nov 1, so DST days are 23 or 25 hours long. */
const HOUR = 60 * 60 * 1000;

const lengthInHours = (from: string, end: Date): number =>
  (end.getTime() - Date.parse(from)) / HOUR;

describe("periodEnd", () => {
  describe("day", () => {
    it("ends at the next court midnight", () => {
      expect(periodEnd("day", "2026-02-18T05:00:00.000Z").toISOString()).toBe(
        "2026-02-19T05:00:00.000Z",
      );
    });

    it("spring-forward day is 23 hours, not 24", () => {
      const from = "2026-03-08T05:00:00.000Z";
      const end = periodEnd("day", from);
      expect(end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
      expect(lengthInHours(from, end)).toBe(23);
    });

    it("fall-back day is 25 hours, not 24", () => {
      const from = "2026-11-01T04:00:00.000Z";
      const end = periodEnd("day", from);
      expect(end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
      expect(lengthInHours(from, end)).toBe(25);
    });
  });

  describe("week", () => {
    it("ends seven court days after it opened", () => {
      expect(periodEnd("week", "2026-02-15T05:00:00.000Z").toISOString()).toBe(
        "2026-02-22T05:00:00.000Z",
      );
    });

    it("a week crossing spring-forward is 167 hours", () => {
      const from = "2026-03-08T05:00:00.000Z";
      const end = periodEnd("week", from);
      expect(end.toISOString()).toBe("2026-03-15T04:00:00.000Z");
      expect(lengthInHours(from, end)).toBe(167);
    });
  });

  describe("month", () => {
    it("ends at court midnight on the first of the next month", () => {
      expect(periodEnd("month", "2026-02-01T05:00:00.000Z").toISOString()).toBe(
        "2026-03-01T05:00:00.000Z",
      );
    });

    it("February gains a day in a leap year", () => {
      expect(periodEnd("month", "2028-02-01T05:00:00.000Z").toISOString()).toBe(
        "2028-03-01T05:00:00.000Z",
      );
    });

    it("a month spanning spring-forward ends on EDT midnight", () => {
      expect(periodEnd("month", "2026-03-01T05:00:00.000Z").toISOString()).toBe(
        "2026-04-01T04:00:00.000Z",
      );
    });

    it("December rolls the year over", () => {
      expect(periodEnd("month", "2026-12-01T05:00:00.000Z").toISOString()).toBe(
        "2027-01-01T05:00:00.000Z",
      );
    });
  });

  describe("quarter", () => {
    it.each([
      ["2025-10-01T04:00:00.000Z", "2026-01-01T05:00:00.000Z"],
      ["2026-01-01T05:00:00.000Z", "2026-04-01T04:00:00.000Z"],
      ["2026-04-01T04:00:00.000Z", "2026-07-01T04:00:00.000Z"],
      ["2026-07-01T04:00:00.000Z", "2026-10-01T04:00:00.000Z"],
    ])("a quarter opening %s ends at %s", (from, expected) => {
      expect(periodEnd("quarter", from).toISOString()).toBe(expected);
    });
  });

  describe("fiscalYear", () => {
    it("ends at court midnight on the next Oct 1", () => {
      expect(
        periodEnd("fiscalYear", "2025-10-01T04:00:00.000Z").toISOString(),
      ).toBe("2026-10-01T04:00:00.000Z");
    });
  });
});

const period = (total: number, from: string, to: string): TotalPeriod => ({
  from,
  to,
  total,
});

describe("projectedTotal", () => {
  it("projects $500 by noon to $1,000 for the day (the ticket's example)", () => {
    expect(
      projectedTotal(
        "day",
        period(500, "2026-02-18T05:00:00.000Z", "2026-02-18T17:00:00.000Z"),
      ),
    ).toBe(1000);
  });

  it("projects $0 collected as $0", () => {
    expect(
      projectedTotal(
        "day",
        period(0, "2026-02-18T05:00:00.000Z", "2026-02-18T17:00:00.000Z"),
      ),
    ).toBe(0);
  });

  it("extrapolates a refund-heavy negative net honestly", () => {
    expect(
      projectedTotal(
        "day",
        period(-200, "2026-02-18T05:00:00.000Z", "2026-02-18T17:00:00.000Z"),
      ),
    ).toBe(-400);
  });

  it("rounds to the nearest whole dollar", () => {
    expect(
      projectedTotal(
        "day",
        period(100, "2026-02-18T05:00:00.000Z", "2026-02-18T12:00:00.000Z"),
      ),
    ).toBe(343);
  });

  it("returns the total as-is when no time has elapsed", () => {
    expect(
      projectedTotal(
        "day",
        period(60, "2026-02-18T05:00:00.000Z", "2026-02-18T05:00:00.000Z"),
      ),
    ).toBe(60);
  });

  it("equals the total once the period has fully elapsed", () => {
    expect(
      projectedTotal(
        "day",
        period(750, "2026-02-18T05:00:00.000Z", "2026-02-19T05:00:00.000Z"),
      ),
    ).toBe(750);
  });

  it("projects over the spring-forward day's real 23 hours", () => {
    expect(
      projectedTotal(
        "day",
        period(500, "2026-03-08T05:00:00.000Z", "2026-03-08T16:00:00.000Z"),
      ),
    ).toBe(1045);
  });

  it("doubles the total at the midpoint of any period", () => {
    const from = "2026-01-01T05:00:00.000Z";
    const end = periodEnd("quarter", from).getTime();
    const midpoint = new Date((Date.parse(from) + end) / 2).toISOString();
    expect(projectedTotal("quarter", period(1000, from, midpoint))).toBe(2000);
  });
});
