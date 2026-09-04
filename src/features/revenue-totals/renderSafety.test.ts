import { describe, expect, it } from "vitest";
import { projectedTotal } from "./projection";
import { periodRange, periodSubtitle } from "./types";

/**
 * The route guards these fields because the formatters cannot. This pins the
 * throw, so if the guard is ever relaxed the failure is visible here rather
 * than as a blank dashboard.
 */
describe("an unparseable date reaches Intl and throws", () => {
  const broken = { from: "not-a-date", to: "also-not-a-date", total: 0 };

  it("throws from the range", () => {
    expect(() => periodRange(broken)).toThrow(RangeError);
  });

  it("throws from the subtitle", () => {
    expect(() => periodSubtitle(broken, "quarter")).toThrow(RangeError);
  });

  it("throws on an empty from, which formatCourtDate alone would tolerate", () => {
    expect(() =>
      periodSubtitle({ from: "", to: "", total: 0 }, "month"),
    ).toThrow(RangeError);
  });

  it("throws from the projection", () => {
    expect(() => projectedTotal("day", broken)).toThrow(RangeError);
  });
});
