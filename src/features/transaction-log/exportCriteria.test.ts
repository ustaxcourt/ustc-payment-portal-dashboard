import { describe, expect, it } from "vitest";
import { exportCriteriaRows } from "./exportCriteria";
import { NO_FILTERS, customRange as range } from "./testFixtures";

const sorting = { sort: "lastUpdatedAt", order: "asc" } as const;

describe("exportCriteriaRows", () => {
  it("lists only the date range and sorting when no filters are applied", () => {
    expect(
      exportCriteriaRows(range("08/01/2026", "08/17/2026"), sorting, NO_FILTERS),
    ).toEqual([
      ["Date range (ET)", "2026-08-01 to 2026-08-17"],
      ["Sorted by", "Last updated, ascending"],
    ]);
  });

  it("lists every filter in full, including the metadata value", () => {
    expect(
      exportCriteriaRows(range("08/17/2026", "08/17/2026"), sorting, {
        paymentStatus: "failed",
        feeType: "PETITION_FILING_FEE",
        metadataKey: "docketNumber",
        metadataValue: "12345-26",
        payType: "Credit/Debit Card",
        transactionStatus: "processed",
      }),
    ).toEqual([
      ["Date range (ET)", "2026-08-17"],
      ["Sorted by", "Last updated, ascending"],
      ["Payment status", "Failed"],
      ["Fee", "Petition Filing Fee"],
      ["Metadata lookup", "Docket Number: 12345-26"],
      ["Payment method", "Credit/Debit Card"],
      ["Transaction status", "Processed"],
    ]);
  });
});
