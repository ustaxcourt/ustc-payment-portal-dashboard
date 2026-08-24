"use client";

import { useQuery } from "@tanstack/react-query";
import type { AppliedDateRange } from "./dateRange";
import type {
  TransactionLogResponse,
  TransactionSearchFilters,
  TransactionSorting,
  ViewTab,
} from "./types";

// The UI still scrolls one assembled table rather than exposing paging controls,
// so wider timeframes must walk the upstream pages and merge them client-side.
const PAGE_SIZE = 200;

const fetchTransactionLogPage = async (
  tab: ViewTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
  filters: TransactionSearchFilters | undefined,
  page: number,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const params = new URLSearchParams({
    from: range.from,
    order: sorting.order,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sort: sorting.sort,
    to: range.to,
  });
  if (tab !== "all" && tab !== "search") params.set("status", tab);

  if (filters?.feeType) params.set("fee", filters.feeType);
  if (filters?.payType) params.set("paymentMethod", filters.payType);

  const response = await fetch(`/api/transactions?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

const fetchTransactionLog = async (
  tab: ViewTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
  filters: TransactionSearchFilters | undefined,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const firstPage = await fetchTransactionLogPage(
    tab,
    range,
    sorting,
    filters,
    1,
    signal,
  );

  if (
    firstPage.data.length >= firstPage.total ||
    firstPage.total <= firstPage.pageSize
  ) {
    return firstPage;
  }

  const data = [...firstPage.data];
  const lastPage = Math.max(
    firstPage.page,
    Math.ceil(firstPage.total / firstPage.pageSize),
  );

  for (let page = firstPage.page + 1; page <= lastPage; page += 1) {
    const currentPage = await fetchTransactionLogPage(
      tab,
      range,
      sorting,
      filters,
      page,
      signal,
    );
    data.push(...currentPage.data);
  }

  return {
    ...firstPage,
    data,
    page: 1,
    pageSize: firstPage.pageSize,
  };
};

export const useTransactionLog = (
  tab: ViewTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
  filters?: TransactionSearchFilters,
  enabled = true,
) =>
  useQuery({
    queryKey: [
      "transaction-log",
      tab,
      range.from,
      range.to,
      sorting.sort,
      sorting.order,
      filters?.feeType,
      filters?.payType,
    ],
    queryFn: ({ signal }) =>
      fetchTransactionLog(tab, range, sorting, filters, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
