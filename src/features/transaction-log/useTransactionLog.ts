"use client";

import { useQuery } from "@tanstack/react-query";
import { type AppliedDateRange, courtDayIsoBounds } from "./dateRange";
import { appendFilterParams, pairedMetadata } from "./transactionLogParams";
import type {
  TransactionLogResponse,
  TransactionSearchFilters,
  TransactionSorting,
} from "./types";

// The table shows one page; the footer reports the true total and the export
// is the path to the complete set.
const PAGE_SIZE = 200;

const fetchTransactionLogPage = async (
  range: AppliedDateRange,
  sorting: TransactionSorting,
  filters: TransactionSearchFilters | undefined,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const bounds = courtDayIsoBounds(range);
  const params = new URLSearchParams({
    from: bounds.from,
    order: sorting.order,
    page: String(page),
    pageSize: String(pageSize),
    sort: sorting.sort,
    to: bounds.to,
  });

  appendFilterParams(params, filters);

  const response = await fetch(`/api/transactions?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

export const useTransactionLog = (
  range: AppliedDateRange,
  sorting: TransactionSorting,
  filters?: TransactionSearchFilters,
) => {
  const metadata = pairedMetadata(filters);

  return useQuery({
    queryKey: [
      "transaction-log",
      range.from,
      range.to,
      sorting.sort,
      sorting.order,
      filters?.feeType,
      filters?.payType,
      filters?.paymentStatus,
      filters?.transactionStatus,
      metadata?.key ?? null,
      metadata?.value ?? null,
    ],
    queryFn: ({ signal }) =>
      fetchTransactionLogPage(range, sorting, filters, 1, PAGE_SIZE, signal),
    placeholderData: (previous) => previous,
  });
};
