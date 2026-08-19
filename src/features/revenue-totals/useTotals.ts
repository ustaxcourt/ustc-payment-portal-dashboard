"use client";

import { useQuery } from "@tanstack/react-query";
import type { TotalsResponse } from "./types";

const fetchTotals = async (signal?: AbortSignal): Promise<TotalsResponse> => {
  const response = await fetch("/api/totals", { signal });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // Ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  return response.json();
};

/** The periods are fixed, so nothing the user controls belongs in the key. */
export const useTotals = () =>
  useQuery({
    queryKey: ["totals"],
    queryFn: ({ signal }) => fetchTotals(signal),
  });
