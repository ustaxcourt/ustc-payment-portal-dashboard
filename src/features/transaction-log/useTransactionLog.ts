"use client";

import { useQuery } from "@tanstack/react-query";
import type { AppliedDateRange } from "./dateRange";
import type { TransactionLogResponse, TransactionTab } from "./types";

// The UI still scrolls one assembled table rather than exposing paging controls,
// so wider timeframes must walk the upstream pages and merge them client-side.
const PAGE_SIZE = 200;

const fetchTransactionLogPage = async (
  tab: TransactionTab,
  range: AppliedDateRange,
  page: number,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const params = new URLSearchParams({
    from: range.from,
    page: String(page),
    pageSize: String(PAGE_SIZE),
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
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const firstPage = await fetchTransactionLogPage(tab, range, 1, signal);

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
    const currentPage = await fetchTransactionLogPage(tab, range, page, signal);
    data.push(...currentPage.data);
  }

  return {
    ...firstPage,
    data,
    page: 1,
    pageSize: data.length,
  };
};

export const useTransactionLog = (
  tab: TransactionTab,
  range: AppliedDateRange,
) =>
  useQuery({
    queryKey: ["transaction-log", tab, range.from, range.to],
    queryFn: ({ signal }) => fetchTransactionLog(tab, range, signal),
    placeholderData: (previous) => previous,
  });
