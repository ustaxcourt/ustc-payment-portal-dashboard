import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TransactionCounts } from "./types";
import { useRetainedCounts } from "./useRetainedCounts";

const counts = (all: number): TransactionCounts => ({
  all,
  success: all,
  failed: 0,
  pending: 0,
});

describe("useRetainedCounts", () => {
  it("returns nothing until counts arrive", () => {
    const { result } = renderHook(
      ({ c, key }) => useRetainedCounts(c, key),
      { initialProps: { c: undefined as TransactionCounts | undefined, key: "r1" } },
    );

    expect(result.current).toBeUndefined();
  });

  it("holds the last counts through a gap on the same range", () => {
    const { result, rerender } = renderHook(
      ({ c, key }) => useRetainedCounts(c, key),
      { initialProps: { c: counts(12) as TransactionCounts | undefined, key: "r1" } },
    );

    expect(result.current).toEqual(counts(12));

    rerender({ c: undefined, key: "r1" });

    expect(result.current).toEqual(counts(12));
  });

  it("drops the retained counts once the range changes with no fresh data", () => {
    const { result, rerender } = renderHook(
      ({ c, key }) => useRetainedCounts(c, key),
      { initialProps: { c: counts(12) as TransactionCounts | undefined, key: "r1" } },
    );

    rerender({ c: undefined, key: "r2" });

    expect(result.current).toBeUndefined();
  });

  it("adopts the new range's counts as soon as they load", () => {
    const { result, rerender } = renderHook(
      ({ c, key }) => useRetainedCounts(c, key),
      { initialProps: { c: counts(12) as TransactionCounts | undefined, key: "r1" } },
    );

    rerender({ c: undefined, key: "r2" });
    rerender({ c: counts(7), key: "r2" });

    expect(result.current).toEqual(counts(7));
  });

  it("does not resurrect a prior range's counts when returning to it", () => {
    const { result, rerender } = renderHook(
      ({ c, key }) => useRetainedCounts(c, key),
      { initialProps: { c: counts(12) as TransactionCounts | undefined, key: "r1" } },
    );

    rerender({ c: counts(7), key: "r2" });
    rerender({ c: undefined, key: "r1" });

    expect(result.current).toBeUndefined();
  });
});
