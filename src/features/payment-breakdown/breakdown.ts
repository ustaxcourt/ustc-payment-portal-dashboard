import type { FeeBreakdownRow } from "../transaction-log/types";

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
