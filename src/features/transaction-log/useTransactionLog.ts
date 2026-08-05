"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaymentStatus, TransactionLogResponse } from "./types";

const PAGE_SIZE = 100;

const fetchTransactionLog = async (
  status: PaymentStatus,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const response = await fetch(
    `/api/transactions?status=${status}&pageSize=${PAGE_SIZE}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

export const useTransactionLog = (status: PaymentStatus) =>
  useQuery({
    queryKey: ["transaction-log", status],
    queryFn: ({ signal }) => fetchTransactionLog(status, signal),
    placeholderData: (previous) => previous,
  });
