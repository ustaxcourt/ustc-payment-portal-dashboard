"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  TransactionLogResponse,
  TransactionSorting,
  TransactionTab,
} from "./types";

// A Court day fits inside one request and the table scrolls rather than paging,
// so there is nothing to assemble. Historical ranges will need real pagination.
const PAGE_SIZE = 200;

const fetchTransactionLog = async (
  tab: TransactionTab,
  sorting: TransactionSorting,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const params = new URLSearchParams({
    order: sorting.order,
    pageSize: String(PAGE_SIZE),
    sort: sorting.sort,
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
  sorting: TransactionSorting,
) =>
  useQuery({
    queryKey: ["transaction-log", tab, sorting.sort, sorting.order],
    queryFn: ({ signal }) => fetchTransactionLog(tab, sorting, signal),
    placeholderData: (previous) => previous,
  });
