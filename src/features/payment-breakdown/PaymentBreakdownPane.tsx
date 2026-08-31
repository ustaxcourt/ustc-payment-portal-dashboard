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

function Pane({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      data-testid="payment-breakdown-pane"
      className="flex min-h-0 flex-col gap-3"
    >
      <h2 id={HEADING_ID} className="text-xl font-bold tracking-tight">
        Payment Breakdown
      </h2>
      {children}
    </section>
  );
}

/** Successful payments in the active timeframe, per fee, with a grand total.
 *  Ignores the status tab and search filters. */
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
    <Pane>
      <div className="overflow-hidden rounded-md border-2 border-muted-foreground">
        <Table>
          <TableCaption className="sr-only">
            {`Successful payments by fee, ${appliedRange.label}`}
          </TableCaption>
          <TableHeader className="bg-totals-header">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8">Fee</TableHead>
              <TableHead className={cn("h-8 w-16", NUMERIC)}>Qty</TableHead>
              <TableHead className={cn("h-8 w-32", NUMERIC)}>
                Subtotal
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.fee}>
                <TableCell className="whitespace-normal py-1.5">
                  {row.feeName}
                </TableCell>
                <TableCell className={cn("py-1.5", NUMERIC)}>
                  {row.qty.toLocaleString("en-US")}
                </TableCell>
                <TableCell className={cn("py-1.5", NUMERIC)}>
                  {formatCurrency(row.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="flex items-center justify-between rounded-md border-2 border-muted-foreground bg-totals-header px-4 py-2">
        <span className="font-bold">Total</span>
        <span className="text-lg font-bold tabular-nums">
          {formatCurrency(data.grandTotal)}
        </span>
      </p>
    </Pane>
  );
}
