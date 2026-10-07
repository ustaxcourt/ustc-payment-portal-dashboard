import { describe, expect, it } from "vitest";
import { summarize, toCards } from "./breakdown";

const petition = {
  fee: "PETITION_FILING_FEE",
  feeName: "Petition Filing Fee",
  qty: 2,
  subtotal: 120,
};
const exam = {
  fee: "NONATTORNEY_EXAM_REGISTRATION_FEE",
  feeName: "Non-Attorney Exam Registration Fee",
  qty: 1,
  subtotal: 250,
};

describe("summarize", () => {
  it("orders rows by fee name, regardless of amount, and totals them", () => {
    const { rows, grandTotal } = summarize([petition, exam]);

    expect(rows.map((row) => row.fee)).toEqual([
      "NONATTORNEY_EXAM_REGISTRATION_FEE",
      "PETITION_FILING_FEE",
    ]);
    expect(grandTotal).toBe(370);

    expect(
      summarize([{ ...exam, subtotal: 1 }, petition]).rows.map(
        (row) => row.fee,
      ),
    ).toEqual(["NONATTORNEY_EXAM_REGISTRATION_FEE", "PETITION_FILING_FEE"]);
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

describe("toCards", () => {
  it("leads with the overall total, then one card per fee", () => {
    expect(toCards(summarize([petition, exam]))).toEqual([
      {
        id: "total",
        label: "Successful Payments",
        amount: "$370.00",
        caption: "Total",
      },
      {
        id: "NONATTORNEY_EXAM_REGISTRATION_FEE",
        label: "Non-Attorney Exam Registration Fee",
        amount: "$250.00",
        caption: "1 transaction",
      },
      {
        id: "PETITION_FILING_FEE",
        label: "Petition Filing Fee",
        amount: "$120.00",
        caption: "2 transactions",
      },
    ]);
  });

  it("keeps a fee with no payments as a zero card", () => {
    const [, card] = toCards(summarize([{ ...petition, qty: 0, subtotal: 0 }]));

    expect(card.amount).toBe("$0.00");
    expect(card.caption).toBe("0 transactions");
  });

  it("returns only the total card when there are no fees", () => {
    const cards = toCards(summarize([]));

    expect(cards).toHaveLength(1);
    expect(cards[0].amount).toBe("$0.00");
  });
});
