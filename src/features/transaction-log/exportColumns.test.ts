import { describe, expect, it } from "vitest";
import { getColumns } from "./columns";
import { exportColumns } from "./exportColumns";
import type { TransactionLogEntry } from "./types";

const row: TransactionLogEntry = {
  agencyTrackingId: "agency-1",
  paygovTrackingId: "paygov-1",
  feeName: "Filing Fee",
  fee: "PETITION_FILING_FEE",
  transactionAmount: 1234.56,
  clientName: "payment-portal",
  transactionReferenceId: "550e8400-e29b-41d4-a716-446655440000",
  paymentStatus: "failed",
  transactionStatus: "pending_settlement",
  paymentMethod: "plastic_card",
  returnCode: 102,
  returnDetail: "Insufficient funds",
  // 23:30 UTC on Aug 17 is 19:30 on Aug 17 in Court time (EDT).
  createdAt: "2026-08-17T23:30:45.000Z",
  lastUpdatedAt: "2026-08-18T03:59:59.000Z",
};

const headers = (tab: Parameters<typeof exportColumns>[0]) =>
  exportColumns(tab).map((column) => column.header);

const cell = (tab: "all" | "failed", header: string) => {
  const column = exportColumns(tab).find((c) => c.header === header);
  if (!column) throw new Error(`No column ${header}`);
  return column.value(row);
};

describe("exportColumns", () => {
  it("includes Failure reason only on the All and Failed tabs", () => {
    expect(headers("all")).toContain("Failure reason");
    expect(headers("failed")).toContain("Failure reason");
    expect(headers("success")).not.toContain("Failure reason");
    expect(headers("pending")).not.toContain("Failure reason");
    expect(headers("all")).toHaveLength(12);
    expect(headers("success")).toHaveLength(11);
  });

  it("tracks the table's column order, with timestamps split in place", () => {
    for (const tab of ["all", "success", "failed", "pending"] as const) {
      // Collapse the split date/time pairs back to the display column name.
      const collapsed = headers(tab)
        .map((h) =>
          h
            .replace(/ (date|time) \(ET\)$/, "")
            .replace(/^Created$/, "createdAt")
            .replace(/^Last updated$/, "lastUpdatedAt"),
        )
        .filter((h, i, all) => all.indexOf(h) === i);

      const tableOrder = getColumns(tab).map((c) =>
        "accessorKey" in c ? c.accessorKey : c.id,
      );
      const exportOrder = collapsed.map(
        (h) =>
          ({
            "Fee type": "feeName",
            Amount: "transactionAmount",
            "Payment method": "paymentMethod",
            "Payment status": "paymentStatus",
            "Failure reason": "returnDetail",
            "Transaction status": "transactionStatus",
            Client: "clientName",
            "Reference ID": "transactionReferenceId",
          })[h] ?? h,
      );

      expect(exportOrder).toEqual(tableOrder);
    }
  });

  it("converts timestamps to Court-time date and time cells", () => {
    const date = cell("all", "Created date (ET)");
    expect(date).toBeInstanceOf(Date);
    expect((date as Date).toISOString()).toBe("2026-08-17T00:00:00.000Z");

    // 19:30:45 ET as a fraction of a day.
    const time = cell("all", "Created time (ET)") as number;
    expect(time).toBeCloseTo((19 * 3600 + 30 * 60 + 45) / 86400, 10);

    // 03:59 UTC on Aug 18 is still Aug 17 in Court time.
    const updated = cell("all", "Last updated date (ET)");
    expect((updated as Date).toISOString()).toBe("2026-08-17T00:00:00.000Z");
  });

  it("keeps Amount a raw number and labels human-readable", () => {
    expect(cell("all", "Amount")).toBe(1234.56);
    expect(cell("all", "Payment method")).toBe("Plastic card");
    expect(cell("all", "Payment status")).toBe("Failed");
    expect(cell("all", "Transaction status")).toBe("Pending settlement");
  });

  it("writes empty cells, never placeholder dashes", () => {
    const bare = { ...row, paymentMethod: null, returnDetail: null };
    for (const column of exportColumns("all")) {
      const value = column.value(bare);
      expect(value).not.toBe("—");
    }
    const failure = exportColumns("all").find(
      (c) => c.header === "Failure reason",
    );
    expect(failure?.value(bare)).toBe("");
  });
});
