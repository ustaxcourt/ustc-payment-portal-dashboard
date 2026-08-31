"use client";

import { useQuery } from "@tanstack/react-query";
import { type AppliedDateRange, courtDayIsoBounds } from "../transaction-log/dateRange";
import {
  ExportTooLargeError,
  fetchAllTransactions,
} from "../transaction-log/exportTransactions";
import {
  DEFAULT_ORDER,
  DEFAULT_SORT,
  type TransactionLogResponse,
} from "../transaction-log/types";
import { aggregateByFee, type PaymentBreakdown, summarize } from "./breakdown";

const fetchBreakdown = async (
  range: AppliedDateRange,
  signal?: AbortSignal,
): Promise<PaymentBreakdown> => {
  const bounds = courtDayIsoBounds(range);
  const params = new URLSearchParams({
    from: bounds.from,
    to: bounds.to,
    page: "1",
    pageSize: "1",
    includeFeeBreakdown: "true",
  });

  const response = await fetch(`/api/transactions?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  const body: TransactionLogResponse = await response.json();
  if (body.feeBreakdown) return summarize(body.feeBreakdown);

  // Deployed API without `includeFeeBreakdown` yet: tally client-side.
  try {
    const { rows } = await fetchAllTransactions(
      "success",
      range,
      { sort: DEFAULT_SORT, order: DEFAULT_ORDER },
      { signal },
    );
    return summarize(aggregateByFee(rows));
  } catch (err) {
    if (err instanceof ExportTooLargeError) {
      throw new Error(
        "The timeframe has too many transactions to summarize. Narrow the timeframe and try again.",
      );
    }
    throw err;
  }
};

/** Keyed by the timeframe alone: the breakdown ignores the status tab and
 *  search filters. */
export const usePaymentBreakdown = (range: AppliedDateRange) =>
  useQuery({
    queryKey: ["payment-breakdown", range.from, range.to],
    queryFn: ({ signal }) => fetchBreakdown(range, signal),
    placeholderData: (previous) => previous,
  });
