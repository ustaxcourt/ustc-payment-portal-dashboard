"use client";

import ErrorPanel from "@/components/ui/ErrorPanel";
import { useTransactionLogParams } from "../transaction-log/useTransactionLogParams";
import BreakdownCards from "./BreakdownCards";
import { toCards } from "./breakdown";
import { usePaymentBreakdown } from "./usePaymentBreakdown";

const HEADING_ID = "payment-breakdown-heading";

function Pane({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      data-testid="payment-breakdown-pane"
      className="mb-4 flex min-h-0 flex-col gap-3"
    >
      <h2 id={HEADING_ID} className="sr-only">
        Payment Breakdown
      </h2>
      {children}
    </section>
  );
}

/** Fetches successful payments for the active timeframe and hands them to
 *  `BreakdownCards`: an overall total, then one card per fee. Ignores the
 *  status tab and search filters. The fees come from the API, so a fee added to
 *  the backend appears here with no frontend change. */
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
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Loading payment breakdown…
        </p>
      </Pane>
    );
  }

  return (
    <Pane>
      <BreakdownCards
        cards={toCards(data)}
        ariaLabel={`Successful payments by fee, ${appliedRange.label}`}
      />
    </Pane>
  );
}
