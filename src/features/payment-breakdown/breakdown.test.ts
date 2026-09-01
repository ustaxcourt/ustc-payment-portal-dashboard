import { describe, expect, it } from "vitest";
import { summarize } from "./breakdown";

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
