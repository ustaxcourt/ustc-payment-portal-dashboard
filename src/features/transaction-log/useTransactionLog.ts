"use client";

import { useQuery } from "@tanstack/react-query";
import type { TransactionLogResponse, TransactionTab } from "./types";

// The API's per-request maximum; any remainder is fetched too.
const PAGE_SIZE = 200;

const fetchPage = async (
  tab: TransactionTab,
  page: number,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (tab !== "all") params.set("status", tab);

  const response = await fetch(`/api/transactions?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

const fetchAll = async (
  tab: TransactionTab,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const first = await fetchPage(tab, 1, signal);
  if (first.data.length >= first.total) return first;

  const remaining = Math.ceil(first.total / PAGE_SIZE) - 1;
  const pages = await Promise.all(
    Array.from({ length: remaining }, (_, i) => fetchPage(tab, i + 2, signal)),
  );

  return { ...first, data: [...first.data, ...pages.flatMap((p) => p.data)] };
};

export const useTransactionLog = (tab: TransactionTab) =>
  useQuery({
    queryKey: ["transaction-log", tab],
    queryFn: ({ signal }) => fetchAll(tab, signal),
    placeholderData: (previous) => previous,
  });
