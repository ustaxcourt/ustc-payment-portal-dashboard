"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type AppliedDateRange,
  courtDayIsoBounds,
} from "../transaction-log/dateRange";
import type { TransactionLogResponse } from "../transaction-log/types";
import { type PaymentBreakdown, summarize } from "./breakdown";

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
  if (!body.feeBreakdown) {
    throw new Error("The API returned no fee breakdown.");
  }
  return summarize(body.feeBreakdown);
};

export const usePaymentBreakdown = (range: AppliedDateRange) =>
  useQuery({
    queryKey: ["payment-breakdown", range.from, range.to],
    queryFn: ({ signal }) => fetchBreakdown(range, signal),
  });
