"use client";

import { useQuery } from "@tanstack/react-query";
import { type AppliedDateRange, courtDayIsoBounds } from "./dateRange";
import type {
  TransactionLogResponse,
  TransactionSorting,
  TransactionTab,
} from "./types";

// The table shows one page; the footer reports the true total and the export
// is the path to the complete set.
const PAGE_SIZE = 200;

export const fetchTransactionLogPage = async (
  tab: TransactionTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
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
  if (tab !== "all") params.set("status", tab);

  const response = await fetch(`/api/transactions?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

export const useTransactionLog = (
  tab: TransactionTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
) =>
  useQuery({
    queryKey: [
      "transaction-log",
      tab,
      range.from,
      range.to,
      sorting.sort,
      sorting.order,
    ],
    queryFn: ({ signal }) =>
      fetchTransactionLogPage(tab, range, sorting, 1, PAGE_SIZE, signal),
    placeholderData: (previous) => previous,
  });
