import { describe, expect, it } from "vitest";
import { exportFilename } from "./exportFilename";
import { NO_FILTERS, customRange as range } from "./testFixtures";

const day = range("08/17/2026", "08/17/2026");
const week = range("08/01/2026", "08/17/2026");

describe("exportFilename", () => {
  it("uses a single date when the range is one day", () => {
    expect(exportFilename(day, NO_FILTERS)).toBe(
      "2026-08-17 - USTC Fee Payment Summary.xlsx",
    );
  });

  it("spans the range when it is wider than a day", () => {
    expect(exportFilename(week, NO_FILTERS)).toBe(
      "2026-08-01 to 2026-08-17 - USTC Fee Payment Summary.xlsx",
    );
  });

  it("appends the status label on a filtered tab", () => {
    expect(exportFilename(day, { ...NO_FILTERS, paymentStatus: "success" })).toBe(
      "2026-08-17 - USTC Fee Payment Summary (Successful).xlsx",
    );
    expect(exportFilename(week, { ...NO_FILTERS, paymentStatus: "failed" })).toBe(
      "2026-08-01 to 2026-08-17 - USTC Fee Payment Summary (Failed).xlsx",
    );
  });

  it("lists every active filter in order of how much it narrows", () => {
    expect(
      exportFilename(day, {
        ...NO_FILTERS,
        paymentStatus: "failed",
        feeType: "PETITION_FILING_FEE",
        payType: "ACH",
      }),
    ).toBe(
      "2026-08-17 - USTC Fee Payment Summary (Failed, Petition Filing Fee, ACH).xlsx",
    );
  });

  it("names a metadata lookup by its key and never its value", () => {
    const name = exportFilename(day, {
      ...NO_FILTERS,
      feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE",
      metadataKey: "email",
      metadataValue: "someone@example.com",
    });

    expect(name).toBe(
      "2026-08-17 - USTC Fee Payment Summary (Non-Attorney Exam Registration Fee, Email lookup).xlsx",
    );
    expect(name).not.toContain("someone");
  });

  it("ignores a metadata key with no value", () => {
    expect(
      exportFilename(day, { ...NO_FILTERS, metadataKey: "email" }),
    ).toBe("2026-08-17 - USTC Fee Payment Summary.xlsx");
  });

  it("separates transaction status from payment status", () => {
    expect(
      exportFilename(day, {
        ...NO_FILTERS,
        paymentStatus: "failed",
        transactionStatus: "failed",
      }),
    ).toBe(
      "2026-08-17 - USTC Fee Payment Summary (Failed, Transaction Failed).xlsx",
    );
  });

  it("collapses filters past three into a count", () => {
    expect(
      exportFilename(week, {
        paymentStatus: "success",
        feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE",
        metadataKey: "accessCode",
        metadataValue: "ABC123",
        payType: "Credit/Debit Card",
        transactionStatus: "processed",
      }),
    ).toBe(
      "2026-08-01 to 2026-08-17 - USTC Fee Payment Summary (Successful, Non-Attorney Exam Registration Fee, Access Code lookup, +2 more).xlsx",
    );
  });

  it("replaces the slash in Credit/Debit Card and keeps names filesystem-safe", () => {
    const name = exportFilename(week, {
      ...NO_FILTERS,
      payType: "Credit/Debit Card",
    });

    expect(name).toContain("(Credit-Debit Card)");
    expect(name).not.toMatch(/[/\\:*?"<>|]/);
  });
});
