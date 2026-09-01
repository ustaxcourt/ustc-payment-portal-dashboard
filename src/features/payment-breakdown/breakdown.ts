import {
  FEE_TYPE_LABEL,
  FEE_TYPES,
  type FeeBreakdownRow,
  type TransactionLogEntry,
} from "../transaction-log/types";

export type PaymentBreakdown = {
  rows: FeeBreakdownRow[];
  grandTotal: number;
};

export const summarize = (rows: FeeBreakdownRow[]): PaymentBreakdown => ({
  rows: [...rows].sort(
    (a, b) => b.subtotal - a.subtotal || a.feeName.localeCompare(b.feeName),
  ),
  grandTotal:
    rows.reduce((cents, row) => cents + Math.round(row.subtotal * 100), 0) /
    100,
});

export const aggregateByFee = (
  entries: TransactionLogEntry[],
): FeeBreakdownRow[] => {
  const cents = new Map<
    string,
    { feeName: string; qty: number; cents: number }
  >(
    FEE_TYPES.map((fee) => [
      fee,
      { feeName: FEE_TYPE_LABEL[fee], qty: 0, cents: 0 },
    ]),
  );

  for (const entry of entries) {
    if (entry.paymentStatus !== "success") continue;

    const row = cents.get(entry.fee) ?? {
      feeName: entry.feeName,
      qty: 0,
      cents: 0,
    };
    row.qty += 1;
    row.cents += Math.round(entry.transactionAmount * 100);
    cents.set(entry.fee, row);
  }

  return [...cents.entries()].map(([fee, row]) => ({
    fee,
    feeName: row.feeName,
    qty: row.qty,
    subtotal: row.cents / 100,
  }));
};
