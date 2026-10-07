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

    expect(result.current.visibility).toEqual(DEFAULT_COLUMN_VISIBILITY);
    expect(result.current.isDefault).toBe(true);
  });

  it("starts at the selected fee's defaults", () => {
    const { result } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE" }),
    );

    expect(result.current.visibility).toEqual(
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

    expect(result.current.visibility).toEqual({
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

  it("shows a searched column only while its filter is active", () => {
    const { result, rerender } = renderColumns(
      filtered({ transactionStatus: "failed" }),
    );

    expect(result.current.visibility.transactionStatus).toBe(true);
    expect(result.current.isDefault).toBe(true);

    rerender({ filters: NO_FILTERS });

    expect(result.current.visibility.transactionStatus).toBe(false);
  });

  it("hides a searched column and counts that as leaving the defaults", () => {
    const { result } = renderColumns(filtered({ transactionStatus: "failed" }));

    act(() => result.current.toggle("transactionStatus", false));

    expect(result.current.visibility.transactionStatus).toBe(false);
    expect(result.current.isDefault).toBe(false);
  });

  it("keeps a hidden searched column hidden while its filter value changes", () => {
    const { result, rerender } = renderColumns(
      filtered({ transactionStatus: "failed" }),
    );

    act(() => result.current.toggle("transactionStatus", false));
    rerender({ filters: filtered({ transactionStatus: "cancelled" }) });

    expect(result.current.visibility.transactionStatus).toBe(false);
  });

  it("shows a hidden searched column again once its filter is cleared and reapplied", () => {
    const { result, rerender } = renderColumns(
      filtered({ transactionStatus: "failed" }),
    );

    act(() => result.current.toggle("transactionStatus", false));
    rerender({ filters: NO_FILTERS });
    rerender({ filters: filtered({ transactionStatus: "failed" }) });

    expect(result.current.visibility.transactionStatus).toBe(true);
    expect(result.current.isDefault).toBe(true);
  });

  it("restores a searched column's earlier choice when it is re-checked", () => {
    const { result, rerender } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE" }),
    );

    act(() => result.current.toggle("feeName", false));
    act(() => result.current.toggle("feeName", true));

    expect(result.current.isDefault).toBe(true);

    rerender({ filters: NO_FILTERS });

    expect(result.current.visibility.feeName).toBe(true);
  });

  it("remembers the earlier choice when a searched column is unchecked twice", () => {
    const { result, rerender } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE" }),
    );

    act(() => result.current.toggle("feeName", false));
    act(() => result.current.toggle("feeName", false));
    act(() => result.current.toggle("feeName", true));
    rerender({ filters: NO_FILTERS });

    expect(result.current.visibility.feeName).toBe(true);
  });

  it("keeps a hidden Fee column hidden while the fee changes", () => {
    const { result, rerender } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE" }),
    );

    act(() => result.current.toggle("feeName", false));
    rerender({
      filters: filtered({ feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE" }),
    });

    expect(result.current.visibility.feeName).toBe(false);
    expect(result.current.visibility["metadata.email"]).toBe(true);
    expect(result.current.visibility["metadata.docketNumber"]).toBe(false);
  });

  it("resets to the selected fee's defaults and shows hidden searched columns", () => {
    const { result } = renderColumns(
      filtered({ feeType: "PETITION_FILING_FEE", transactionStatus: "failed" }),
    );

    act(() => result.current.toggle("clientName", true));
    act(() => result.current.toggle("transactionStatus", false));
    act(() => result.current.reset());

    expect(result.current.visibility).toEqual({
      ...defaultColumnVisibility("PETITION_FILING_FEE"),
      transactionStatus: true,
    });
    expect(result.current.isDefault).toBe(true);
  });

  it("locks nothing while more than one column is chosen", () => {
    const { result } = renderColumns();

    expect(result.current.lockedId).toBeNull();
  });

  it("locks the last chosen column even while a filter shows another", () => {
    const { result } = renderColumns(filtered({ transactionStatus: "failed" }));

    act(() => result.current.toggle("lastUpdatedAt", false));
    act(() => result.current.toggle("transactionAmount", false));
    act(() => result.current.toggle("paymentStatus", false));

    expect(result.current.lockedId).toBe("feeName");
    expect(result.current.visibility.transactionStatus).toBe(true);
  });

  it("locks the last chosen column after a searched column is hidden", () => {
    const { result } = renderColumns(filtered({ feeType: "PETITION_FILING_FEE" }));

    act(() => result.current.toggle("lastUpdatedAt", false));
    act(() => result.current.toggle("transactionAmount", false));
    act(() => result.current.toggle("metadata.docketNumber", false));
    act(() => result.current.toggle("feeName", false));

    expect(result.current.lockedId).toBe("paymentStatus");
  });
});
