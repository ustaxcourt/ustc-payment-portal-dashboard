import { formatCurrency } from "@/lib/format";
import type { FeeBreakdownRow } from "../transaction-log/types";
import type { BreakdownCardData } from "./BreakdownCards";

export type PaymentBreakdown = {
  rows: FeeBreakdownRow[];
  grandTotal: number;
};

/** Rows are ordered by name, not amount, so cards keep their place as the
 *  timeframe changes. */
export const summarize = (rows: FeeBreakdownRow[]): PaymentBreakdown => ({
  rows: [...rows].sort((a, b) => a.feeName.localeCompare(b.feeName)),
  grandTotal:
    rows.reduce((cents, row) => cents + Math.round(row.subtotal * 100), 0) /
    100,
});

const transactionCount = (qty: number): string =>
  `${qty.toLocaleString("en-US")} ${qty === 1 ? "transaction" : "transactions"}`;

/** The overall total first, then one card per fee in the response. */
export const toCards = ({
  rows,
  grandTotal,
}: PaymentBreakdown): BreakdownCardData[] => [
  {
    id: "total",
    label: "Successful Payments",
    amount: formatCurrency(grandTotal),
    caption: "Total",
  },
  ...rows.map((row) => ({
    id: row.fee,
    label: row.feeName,
    amount: formatCurrency(row.subtotal),
    caption: transactionCount(row.qty),
  })),
];
