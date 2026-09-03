"use client";

import ErrorPanel from "@/components/ui/ErrorPanel";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTransactionLogParams } from "../transaction-log/useTransactionLogParams";
import { usePaymentBreakdown } from "./usePaymentBreakdown";

const HEADING_ID = "payment-breakdown-heading";
const NUMERIC = "text-right tabular-nums";

function Pane({
  total,
  children,
}: {
  total?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      data-testid="payment-breakdown-pane"
      className="flex min-h-0 flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={HEADING_ID} className="text-xl font-bold tracking-tight">
          Payment Breakdown
        </h2>
        {total === undefined ? null : (
          <p
            data-testid="payment-breakdown-total"
            className="rounded-md bg-totals-header px-4 py-1.5"
          >
            Total:{" "}
            <span className="text-lg font-bold tabular-nums">{total}</span>
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Successful payments in the active timeframe, per fee, with a grand total.
 *  Ignores the status tab and search filters. The rows come from the API, so
 *  a fee added to the backend appears here with no frontend change. */
export default function PaymentBreakdownPane() {
  const { appliedRange } = useTransactionLogParams();
  const { data, isPending, isError, error, refetch } =
    usePaymentBreakdown(appliedRange);

  if (isError) {
    return (
      <Pane>
        <ErrorPanel
          title="Could not load the payment breakdown."
          message={error.message}
          onRetry={refetch}
        />
      </Pane>
    );
  }

  if (isPending) {
    return (
      <Pane>
        <p role="status" className="text-sm text-muted-foreground">
          Loading payment breakdown…
        </p>
      </Pane>
    );
  }

  return (
    <Pane total={formatCurrency(data.grandTotal)}>
      <div className="overflow-hidden rounded-md border-2 border-muted-foreground">
        <Table>
          <TableCaption className="sr-only">
            {`Successful payments by fee, ${appliedRange.label}`}
          </TableCaption>
          <TableHeader className="bg-totals-header">
            <TableRow className="hover:bg-transparent">
              {/* The default border vanishes against the header tint. */}
              <TableHead className="h-8 border-r border-muted-foreground/40">
                Fee
              </TableHead>
              <TableHead
                className={cn(
                  "h-8 w-16 border-r border-muted-foreground/40",
                  NUMERIC,
                )}
              >
                Qty
              </TableHead>
              <TableHead className={cn("h-8 w-32", NUMERIC)}>
                Subtotal
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.fee}>
                <TableCell className="whitespace-normal border-r py-1.5">
                  {row.feeName}
                </TableCell>
                <TableCell className={cn("border-r py-1.5", NUMERIC)}>
                  {row.qty === 0 ? "—" : row.qty.toLocaleString("en-US")}
                </TableCell>
                <TableCell className={cn("py-1.5", NUMERIC)}>
                  {row.qty === 0 ? "—" : formatCurrency(row.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Pane>
  );
}
