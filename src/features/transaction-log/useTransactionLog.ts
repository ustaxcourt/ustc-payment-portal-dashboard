"use client";

import { useQuery } from "@tanstack/react-query";
import type { AppliedDateRange } from "./dateRange";
import type { TransactionLogResponse, TransactionTab } from "./types";

// A Court day fits inside one request and the table scrolls rather than paging,
// so there is nothing to assemble. Historical ranges will need real pagination.
const PAGE_SIZE = 200;

const fetchTransactionLog = async (
  tab: TransactionTab,
  range: AppliedDateRange,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const params = new URLSearchParams({
    from: range.from,
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

export const useTransactionLog = (
  tab: TransactionTab,
  range: AppliedDateRange,
) =>
  useQuery({
    queryKey: ["transaction-log", tab, range.from, range.to],
    queryFn: ({ signal }) => fetchTransactionLog(tab, range, signal),
    placeholderData: (previous) => previous,
  });
