"use client";

import { useEffect, useState } from "react";
import type { TransactionCounts } from "./types";

/**
 * Holds the last counts we received, scoped to the range they describe. An empty
 * search disables its own query, so without this the badges would blank out;
 * without the range scope they would instead show a stale window's counts after
 * the timeframe changed. Returning `undefined` on a range with no fresh counts
 * keeps the badges honest.
 *
 * Fresh counts are returned as-is; the retained copy lives in state, updated from
 * an effect, so an interrupted concurrent render can't leave a value behind that
 * a later commit observes.
 */
export const useRetainedCounts = (
  counts: TransactionCounts | undefined,
  rangeKey: string,
): TransactionCounts | undefined => {
  const [retained, setRetained] = useState<{
    rangeKey: string;
    counts: TransactionCounts;
  }>();

  useEffect(() => {
    if (counts) {
      setRetained({ rangeKey, counts });
    }
  }, [counts, rangeKey]);

  if (counts) {
    return counts;
  }

  return retained?.rangeKey === rangeKey ? retained.counts : undefined;
};
