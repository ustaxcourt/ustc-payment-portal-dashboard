import { describe, expect, it } from "vitest";
import type {
  PaymentStatus,
  TransactionLogEntry,
} from "../transaction-log/types";
import { aggregateByFee, summarize } from "./breakdown";

const entry = (
  fee: string,
  transactionAmount: number,
  paymentStatus: PaymentStatus = "success",
  feeName = "Some Fee",
): TransactionLogEntry => ({
  agencyTrackingId: "track-1",
  feeName,
  fee,
  transactionAmount,
  clientName: "payment-portal",
  transactionReferenceId: "TXREF-00001",
  paymentStatus,
  createdAt: "2026-08-27T12:00:00.000Z",
  lastUpdatedAt: "2026-08-27T12:00:00.000Z",
});

describe("summarize", () => {
  it("orders rows by subtotal descending and totals them", () => {
    const { rows, grandTotal } = summarize([
      {
        fee: "PETITION_FILING_FEE",
        feeName: "Petition Filing Fee",
        qty: 2,
        subtotal: 120,
      },
      {
        fee: "NONATTORNEY_EXAM_REGISTRATION_FEE",
        feeName: "Non-Attorney Exam Registration Fee",
        qty: 1,
        subtotal: 250,
      },
    ]);

    expect(rows.map((row) => row.fee)).toEqual([
      "NONATTORNEY_EXAM_REGISTRATION_FEE",
      "PETITION_FILING_FEE",
    ]);
    expect(grandTotal).toBe(370);
  });

  it("totals dollar amounts without float drift", () => {
    const row = { fee: "F", feeName: "F", qty: 1 };

    expect(
      summarize([
        { ...row, subtotal: 0.1 },
        { ...row, subtotal: 0.2 },
      ]).grandTotal,
    ).toBe(0.3);
  });
});

describe("aggregateByFee", () => {
  it("tallies qty and subtotal per fee", () => {
    const rows = aggregateByFee([
      entry("PETITION_FILING_FEE", 60),
      entry("PETITION_FILING_FEE", 60),
      entry("NONATTORNEY_EXAM_REGISTRATION_FEE", 250),
    ]);

    expect(rows).toContainEqual({
      fee: "PETITION_FILING_FEE",
      feeName: "Petition Filing Fee",
      qty: 2,
      subtotal: 120,
    });
    expect(rows).toContainEqual({
      fee: "NONATTORNEY_EXAM_REGISTRATION_FEE",
      feeName: "Non-Attorney Exam Registration Fee",
      qty: 1,
      subtotal: 250,
    });
  });

  it("keeps a zero row for every fee the portal handles", () => {
    const rows = aggregateByFee([]);

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.qty).toBe(0);
      expect(row.subtotal).toBe(0);
    }
  });

  it("counts only successful payments", () => {
    const rows = aggregateByFee([
      entry("PETITION_FILING_FEE", 60, "success"),
      entry("PETITION_FILING_FEE", 60, "failed"),
      entry("PETITION_FILING_FEE", 60, "pending"),
    ]);

    const petition = rows.find((row) => row.fee === "PETITION_FILING_FEE");
    expect(petition).toMatchObject({ qty: 1, subtotal: 60 });
  });

  it("keeps a fee key it does not recognize, labelled by its feeName", () => {
    const rows = aggregateByFee([
      entry("SOME_NEW_FEE", 25, "success", "Some New Fee"),
    ]);

    expect(rows).toContainEqual({
      fee: "SOME_NEW_FEE",
      feeName: "Some New Fee",
      qty: 1,
      subtotal: 25,
    });
  });
});
