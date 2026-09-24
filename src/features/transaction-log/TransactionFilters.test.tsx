import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TransactionFilters from "./TransactionFilters";
import type { TransactionSearchFilters } from "./types";

type Props = Parameters<typeof TransactionFilters>[0];

const NO_FILTERS: TransactionSearchFilters = {
  feeType: null,
  payType: null,
  paymentStatus: null,
  transactionStatus: null,
  metadataKey: null,
  metadataValue: null,
};

const renderFilters = (
  overrides: Omit<Partial<Props>, "filters"> & {
    filters?: Partial<TransactionSearchFilters>;
  } = {},
) => {
  const { filters, ...rest } = overrides;
  return render(
    <TransactionFilters
      filters={{ ...NO_FILTERS, ...filters }}
      counts={{ all: 43, success: 26, failed: 5, pending: 12 }}
      onFilterChange={vi.fn()}
      onMetadataSearch={vi.fn()}
      onClear={vi.fn()}
      hasActiveFilters={false}
      {...rest}
    />,
  );
};

describe("TransactionFilters", () => {
  it("renders the dropdown filters", () => {
    renderFilters();

    expect(screen.getByLabelText("Fee Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Pay Method")).toBeInTheDocument();
    expect(screen.getByLabelText("Transaction Status")).toBeInTheDocument();
  });

  it("selects a Fee Type option", async () => {
    const onFilterChange = vi.fn();
    renderFilters({ onFilterChange });

    await userEvent.click(screen.getByLabelText("Fee Type"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Petition Filing Fee" }),
    );

    expect(onFilterChange).toHaveBeenCalledWith(
      "feeType",
      "PETITION_FILING_FEE",
    );
  });

  it("selects a Pay Method option", async () => {
    const onFilterChange = vi.fn();
    renderFilters({ onFilterChange });

    await userEvent.click(screen.getByLabelText("Pay Method"));
    await userEvent.click(await screen.findByRole("option", { name: "ACH" }));

    expect(onFilterChange).toHaveBeenCalledWith("payType", "ACH");
  });

  it("selects a Transaction Status option", async () => {
    const onFilterChange = vi.fn();
    renderFilters({ onFilterChange });

    await userEvent.click(screen.getByLabelText("Transaction Status"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Cancelled" }),
    );

    expect(onFilterChange).toHaveBeenCalledWith(
      "transactionStatus",
      "cancelled",
    );
  });

  it("shows the resolved label, not the raw value, on a closed trigger", () => {
    renderFilters({
      filters: { feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE" },
    });

    expect(
      screen.getByText("Non-Attorney Exam Registration Fee"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("NONATTORNEY_EXAM_REGISTRATION_FEE"),
    ).not.toBeInTheDocument();
  });

  it("selecting Any clears an active filter", async () => {
    const onFilterChange = vi.fn();
    renderFilters({
      onFilterChange,
      filters: { feeType: "PETITION_FILING_FEE" },
    });

    await userEvent.click(screen.getByLabelText("Fee Type"));
    await userEvent.click(await screen.findByRole("option", { name: "Any" }));

    expect(onFilterChange).toHaveBeenCalledWith("feeType", null);
  });

  describe("Payment Status", () => {
    it("shows each option with its count", () => {
      renderFilters();

      expect(screen.getByText("All Payment Status (43)")).toBeInTheDocument();
      expect(screen.getByText("Successful (26)")).toBeInTheDocument();
      expect(screen.getByText("Failed (5)")).toBeInTheDocument();
      expect(screen.getByText("Pending (12)")).toBeInTheDocument();
    });

    it("selecting a status calls onFilterChange with that status", async () => {
      const onFilterChange = vi.fn();
      renderFilters({ onFilterChange });

      await userEvent.click(screen.getByText("Failed (5)"));

      expect(onFilterChange).toHaveBeenCalledWith("paymentStatus", "failed");
    });

    it("selecting All Payment Status clears the filter", async () => {
      const onFilterChange = vi.fn();
      renderFilters({ onFilterChange, filters: { paymentStatus: "failed" } });

      await userEvent.click(screen.getByText("All Payment Status (43)"));

      expect(onFilterChange).toHaveBeenCalledWith("paymentStatus", null);
    });
  });

  describe("Clear All", () => {
    it("is disabled when no filters are active", () => {
      renderFilters({ hasActiveFilters: false });

      expect(screen.getByRole("button", { name: "Clear All" })).toBeDisabled();
    });

    it("calls onClear when clicked", async () => {
      const onClear = vi.fn();
      renderFilters({ hasActiveFilters: true, onClear });

      await userEvent.click(screen.getByRole("button", { name: "Clear All" }));

      expect(onClear).toHaveBeenCalled();
    });
  });

  describe("metadata search", () => {
    it("is hidden until a Fee Type is selected", () => {
      renderFilters();

      expect(
        screen.queryByText("Select a Fee Type to enable Search."),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
    });

    it("appears below Fee Type once one is selected", () => {
      renderFilters({ filters: { feeType: "PETITION_FILING_FEE" } });

      expect(screen.getByText("Docket Number")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    });
  });
});
