"use client";

import ErrorPanel from "@/components/ui/ErrorPanel";
import { useTransactionLogParams } from "../transaction-log/useTransactionLogParams";
import BreakdownCards from "./BreakdownCards";
import { toCards } from "./breakdown";
import { usePaymentBreakdown } from "./usePaymentBreakdown";

const HEADING_ID = "payment-breakdown-heading";

/** Fetches successful payments for the active timeframe and hands them to
 *  `BreakdownCards`: an overall total, then one card per fee. Ignores the
 *  status tab and search filters. The fees come from the API, so a fee added to
 *  the backend appears here with no frontend change. */
export default function PaymentBreakdownSection() {
  const { appliedRange } = useTransactionLogParams();
  const { data, isPending, isError, error, refetch } =
    usePaymentBreakdown(appliedRange);

  return (
    <section
      aria-labelledby={HEADING_ID}
      data-testid="payment-breakdown-section"
      className="mb-4 flex min-h-0 flex-col gap-3"
    >
      <h2 id={HEADING_ID} className="sr-only">
        Payment Breakdown
      </h2>
      {isError ? (
        <ErrorPanel
          title="Could not load the payment breakdown."
          message={error.message}
          onRetry={refetch}
        />
      ) : isPending ? (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Loading payment breakdown…
        </p>
      ) : (
        <BreakdownCards
          cards={toCards(data)}
          ariaLabel={`Successful payments by fee, ${appliedRange.label}`}
        />
      )}
    </section>
  );
}
