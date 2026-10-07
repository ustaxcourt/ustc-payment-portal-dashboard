import { describe, expect, it } from "vitest";
import {
  formatCourtDate,
  formatCourtDateTime,
  formatCourtStamp,
  formatCurrency,
  formatLabel,
  formatWholeCurrency,
} from "./format";

describe("formatCurrency", () => {
  it("renders USD with the symbol and exactly two fraction digits", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("rounds to cents rather than truncating", () => {
    expect(formatCurrency(0.005)).toBe("$0.01");
  });

  it("renders zero as an amount, not as the empty dash", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("renders a negative amount with a leading minus", () => {
    expect(formatCurrency(-60)).toBe("-$60.00");
  });

  it.each([null, undefined])("renders %s as an em dash", (value) => {
    expect(formatCurrency(value)).toBe("—");
  });
});

describe("formatWholeCurrency", () => {
  it("drops the cents entirely", () => {
    expect(formatWholeCurrency(1234.56)).toBe("$1,235");
  });

  it("renders zero as an amount, not as the empty dash", () => {
    expect(formatWholeCurrency(0)).toBe("$0");
  });

  it.each([null, undefined])("renders %s as an em dash", (value) => {
    expect(formatWholeCurrency(value)).toBe("—");
  });
});

describe("court-time formatters", () => {
  const lateEveningUtc = "2026-09-12T02:30:00.000Z";

  it("formats a date-time in Eastern time", () => {
    expect(formatCourtDateTime(lateEveningUtc)).toMatch(
      /^Sep 11, 2026\b.*\b10:30 PM$/,
    );
  });

  it("formats a date in Eastern time", () => {
    expect(formatCourtDate(lateEveningUtc)).toBe("Sep 11, 2026");
  });

  it("splits a stamp into a sortable date and a 24-hour time", () => {
    expect(formatCourtStamp(lateEveningUtc)).toEqual({
      date: "2026-09-11",
      time: "22:30:00",
    });
  });

  it.each([null, undefined])(
    "renders %s as an em dash with no time",
    (value) => {
      expect(formatCourtDateTime(value)).toBe("—");
      expect(formatCourtDate(value)).toBe("—");
      expect(formatCourtStamp(value)).toEqual({ date: "—", time: "" });
    },
  );
});

describe("formatLabel", () => {
  it("unslugs an underscored key and capitalises the first word only", () => {
    expect(formatLabel("PETITION_FILING_FEE")).toBe("PETITION FILING FEE");
    expect(formatLabel("processed")).toBe("Processed");
  });

  it.each([null, undefined, ""])("renders %s as an em dash", (value) => {
    expect(formatLabel(value)).toBe("—");
  });
});
