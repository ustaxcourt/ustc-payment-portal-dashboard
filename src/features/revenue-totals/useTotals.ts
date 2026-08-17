"use client";

import { useQuery } from "@tanstack/react-query";
import type { TotalsResponse } from "./types";

const fetchTotals = async (signal?: AbortSignal): Promise<TotalsResponse> => {
  const response = await fetch("/api/totals", { signal });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

/** The periods are fixed, so nothing the user controls belongs in the key. */
export const useTotals = () =>
  useQuery({
    queryKey: ["totals"],
    queryFn: ({ signal }) => fetchTotals(signal),
  });
