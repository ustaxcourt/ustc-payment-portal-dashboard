import { describe, expect, it } from "vitest";
import type { AppliedDateRange } from "./dateRange";
import { exportFilename } from "./exportFilename";

const range = (from: string, to: string): AppliedDateRange => ({
  preset: "custom",
  from,
  to,
  label: `${from} - ${to}`,
});

describe("exportFilename", () => {
  it("uses a single date when the range is one day", () => {
    expect(exportFilename(range("08/17/2026", "08/17/2026"), "all")).toBe(
      "2026-08-17 - USTC Fee Payment Summary.xlsx",
    );
  });

  it("spans the range when it is wider than a day", () => {
    expect(exportFilename(range("08/01/2026", "08/17/2026"), "all")).toBe(
      "2026-08-01 to 2026-08-17 - USTC Fee Payment Summary.xlsx",
    );
  });

  it("appends the status label on a filtered tab", () => {
    expect(exportFilename(range("08/17/2026", "08/17/2026"), "success")).toBe(
      "2026-08-17 - USTC Fee Payment Summary (Successful).xlsx",
    );
    expect(exportFilename(range("08/01/2026", "08/17/2026"), "failed")).toBe(
      "2026-08-01 to 2026-08-17 - USTC Fee Payment Summary (Failed).xlsx",
    );
  });

  it("contains no characters that filenames forbid", () => {
    const name = exportFilename(range("08/01/2026", "08/17/2026"), "pending");
    expect(name).not.toMatch(/[/\\:*?"<>|]/);
  });
});
