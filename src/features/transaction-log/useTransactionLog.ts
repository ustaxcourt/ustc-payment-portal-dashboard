"use client";

import { useQuery } from "@tanstack/react-query";
import type { TransactionLogResponse, TransactionTab } from "./types";

// A Court day fits inside one request and the table scrolls rather than paging,
// so there is nothing to assemble. Historical ranges will need real pagination.
const PAGE_SIZE = 200;

const fetchTransactionLog = async (
  tab: TransactionTab,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
  if (tab !== "all") params.set("status", tab);

  const response = await fetch(`/api/transactions?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

export const useTransactionLog = (tab: TransactionTab) =>
  useQuery({
    queryKey: ["transaction-log", tab],
    queryFn: ({ signal }) => fetchTransactionLog(tab, signal),
    placeholderData: (previous) => previous,
  });
