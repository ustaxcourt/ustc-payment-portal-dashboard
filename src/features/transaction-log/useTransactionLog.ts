"use client";

import { useQuery } from "@tanstack/react-query";
import type { AppliedDateRange } from "./dateRange";
import type {
  TransactionLogResponse,
  TransactionSorting,
  TransactionTab,
} from "./types";

// The UI still scrolls one assembled table rather than exposing paging controls,
// so wider timeframes must walk the upstream pages and merge them client-side.
const PAGE_SIZE = 200;

const fetchTransactionLogPage = async (
  tab: TransactionTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
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
  if (tab !== "all") params.set("status", tab);

  const response = await fetch(`/api/transactions?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

const fetchTransactionLog = async (
  tab: TransactionTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const firstPage = await fetchTransactionLogPage(
    tab,
    range,
    sorting,
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
    queryFn: ({ signal }) => fetchTransactionLog(tab, range, sorting, signal),
    placeholderData: (previous) => previous,
  });
