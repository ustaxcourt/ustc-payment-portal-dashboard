import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_COLUMN_VISIBILITY, defaultColumnVisibility } from "./columns";
import type { TransactionSearchFilters } from "./types";
import { useColumnVisibility } from "./useColumnVisibility";

const NO_FILTERS: TransactionSearchFilters = {
  feeType: null,
  payType: null,
  paymentStatus: null,
  transactionStatus: null,
  metadataKey: null,
  metadataValue: null,
};

const filtered = (
  overrides: Partial<TransactionSearchFilters>,
): TransactionSearchFilters => ({ ...NO_FILTERS, ...overrides });

const renderColumns = (initialFilters = NO_FILTERS) =>
  renderHook(({ filters }) => useColumnVisibility(filters), {
    initialProps: { filters: initialFilters },
  });

describe("useColumnVisibility", () => {
  it("starts at the global defaults when no fee is selected", () => {
    const { result } = renderColumns();

    expect(result.current.chosen).toEqual(DEFAULT_COLUMN_VISIBILITY);
    expect(result.current.isDefault).toBe(true);
  });

  it("starts at the selected fee's defaults", () => {
    const { result } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE" }),
    );

    expect(result.current.chosen).toEqual(
      defaultColumnVisibility("PETITION_FILING_FEE"),
    );
    expect(result.current.isDefault).toBe(true);
  });

  it("swaps the metadata columns and keeps other choices when the fee changes", () => {
    const { result, rerender } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE" }),
    );

    act(() => result.current.toggle("clientName", true));
    rerender({
      filters: filtered({ feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE" }),
    });

    expect(result.current.chosen).toEqual({
      ...defaultColumnVisibility("NONATTORNEY_EXAM_REGISTRATION_FEE"),
      clientName: true,
    });
  });

  it("stays at the defaults when the fee changes from its defaults", () => {
    const { result, rerender } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE" }),
    );

    rerender({
      filters: filtered({ feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE" }),
    });

    expect(result.current.isDefault).toBe(true);
  });

  it("shows a searched column in the table without choosing it", () => {
    const { result } = renderColumns(filtered({ transactionStatus: "failed" }));

    expect(result.current.chosen.transactionStatus).toBe(false);
    expect(result.current.shownSearchedIds).toEqual(["transactionStatus"]);
    expect(result.current.tableVisibility.transactionStatus).toBe(true);
    expect(result.current.isDefault).toBe(true);
  });

  it("hides a searched column and counts that as leaving the defaults", () => {
    const { result } = renderColumns(filtered({ transactionStatus: "failed" }));

    act(() => result.current.toggle("transactionStatus", false));

    expect(result.current.shownSearchedIds).toEqual([]);
    expect(result.current.tableVisibility.transactionStatus).toBe(false);
    expect(result.current.isDefault).toBe(false);
  });

  it("keeps a hidden searched column hidden while its filter value changes", () => {
    const { result, rerender } = renderColumns(
      filtered({ transactionStatus: "failed" }),
    );

    act(() => result.current.toggle("transactionStatus", false));
    rerender({ filters: filtered({ transactionStatus: "cancelled" }) });

    expect(result.current.tableVisibility.transactionStatus).toBe(false);
  });

  it("shows a hidden searched column again once its filter is cleared and reapplied", () => {
    const { result, rerender } = renderColumns(
      filtered({ transactionStatus: "failed" }),
    );

    act(() => result.current.toggle("transactionStatus", false));
    rerender({ filters: NO_FILTERS });
    rerender({ filters: filtered({ transactionStatus: "failed" }) });

    expect(result.current.tableVisibility.transactionStatus).toBe(true);
    expect(result.current.isDefault).toBe(true);
  });

  it("restores a searched column's earlier choice when it is re-checked", () => {
    const { result } = renderColumns(filtered({ feeType: "PETITION_FILING_FEE" }));

    act(() => result.current.toggle("feeName", false));
    act(() => result.current.toggle("feeName", true));

    expect(result.current.chosen.feeName).toBe(true);
    expect(result.current.isDefault).toBe(true);
  });

  it("remembers the earlier choice when a searched column is unchecked twice", () => {
    const { result } = renderColumns(filtered({ feeType: "PETITION_FILING_FEE" }));

    act(() => result.current.toggle("feeName", false));
    act(() => result.current.toggle("feeName", false));
    act(() => result.current.toggle("feeName", true));

    expect(result.current.chosen.feeName).toBe(true);
  });

  it("keeps a hidden Fee column hidden while the fee changes", () => {
    const { result, rerender } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE" }),
    );

    act(() => result.current.toggle("feeName", false));
    rerender({
      filters: filtered({ feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE" }),
    });

    expect(result.current.tableVisibility.feeName).toBe(false);
    expect(result.current.chosen["metadata.email"]).toBe(true);
    expect(result.current.chosen["metadata.docketNumber"]).toBe(false);
  });

  it("resets to the selected fee's defaults and shows hidden searched columns", () => {
    const { result } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE", transactionStatus: "failed" }),
    );

    act(() => result.current.toggle("clientName", true));
    act(() => result.current.toggle("transactionStatus", false));
    act(() => result.current.reset());

    expect(result.current.chosen).toEqual(
      defaultColumnVisibility("PETITION_FILING_FEE"),
    );
    expect(result.current.shownSearchedIds).toEqual([
      "feeName",
      "transactionStatus",
    ]);
    expect(result.current.isDefault).toBe(true);
  });
});
