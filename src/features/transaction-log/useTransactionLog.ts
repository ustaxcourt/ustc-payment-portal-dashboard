"use client";

import { useQuery } from "@tanstack/react-query";
import { type AppliedDateRange, courtDayIsoBounds } from "./dateRange";
import type {
  TransactionLogResponse,
  TransactionSearchFilters,
  TransactionSorting,
  ViewTab,
} from "./types";

// The table shows one page; the footer reports the true total and the export
// is the path to the complete set.
const PAGE_SIZE = 200;

const pairedMetadata = (filters?: TransactionSearchFilters) =>
  filters?.metadataKey && filters?.metadataValue
    ? { key: filters.metadataKey, value: filters.metadataValue }
    : null;

const fetchTransactionLogPage = async (
  tab: ViewTab,
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
  if (tab !== "all" && tab !== "search") params.set("status", tab);

  if (filters?.feeType) params.set("fee", filters.feeType);
  if (filters?.payType) params.set("paymentMethod", filters.payType);
  if (filters?.paymentStatus) params.set("status", filters.paymentStatus);
  if (filters?.transactionStatus) {
    params.set("transactionStatus", filters.transactionStatus);
  }
  const metadata = pairedMetadata(filters);
  if (metadata) {
    params.set("metadataKey", metadata.key);
    params.set("metadataValue", metadata.value);
  }

  const response = await fetch(`/api/transactions?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

export const useTransactionLog = (
  tab: ViewTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
  filters?: TransactionSearchFilters,
  enabled = true,
) => {
  const metadata = pairedMetadata(filters);

  return useQuery({
    queryKey: [
      "transaction-log",
      tab,
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
      fetchTransactionLogPage(tab, range, sorting, filters, 1, PAGE_SIZE, signal),
    placeholderData: (previous) => (enabled ? previous : undefined),
    enabled,
  });
};
