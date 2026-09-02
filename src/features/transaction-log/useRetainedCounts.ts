"use client";

import { useRef } from "react";
import type { TransactionCounts } from "./types";

/**
 * Holds the last counts we received, scoped to the range they describe. An empty
 * search disables its own query, so without this the badges would blank out;
 * with a plain ref they would instead show a stale window's counts forever after
 * the timeframe changed. Returning `undefined` on a range with no fresh counts
 * keeps the badges honest.
 */
export const useRetainedCounts = (
  counts: TransactionCounts | undefined,
  rangeKey: string,
): TransactionCounts | undefined => {
  const cache = useRef<{ rangeKey: string; counts: TransactionCounts }>(
    undefined,
  );

  if (counts) {
    cache.current = { rangeKey, counts };
  }

  return cache.current?.rangeKey === rangeKey ? cache.current.counts : undefined;
};
