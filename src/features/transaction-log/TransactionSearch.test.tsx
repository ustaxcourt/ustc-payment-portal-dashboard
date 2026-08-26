import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TransactionSearch from "./TransactionSearch";

const renderSearch = (
  overrides: Partial<Parameters<typeof TransactionSearch>[0]> = {},
) =>
  render(
    <TransactionSearch
      filters={{
        feeType: null,
        payType: null,
        paymentStatus: null,
        transactionStatus: null,
      }}
      onFilterChange={vi.fn()}
      rows={[]}
      sorting={{ sort: "createdAt", order: "desc" }}
      onSortingChange={vi.fn()}
      emptyMessage="No transactions to show."
      {...overrides}
    />,
  );

describe("TransactionSearch", () => {
  it("renders Filter by Type section", () => {
    renderSearch();

    expect(screen.getByText("Filter by Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Fee Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Pay Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Payment Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Transaction Status")).toBeInTheDocument();
  });

  it("selects a Fee Type option", async () => {
    const onFilterChange = vi.fn();
    renderSearch({ onFilterChange });

    await userEvent.click(screen.getByLabelText("Fee Type"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Petition Filing Fee" }),
    );

    expect(onFilterChange).toHaveBeenCalledWith(
      "feeType",
      "PETITION_FILING_FEE",
    );
  });

  it("selects a Pay Type option", async () => {
    const onFilterChange = vi.fn();
    renderSearch({ onFilterChange });

    await userEvent.click(screen.getByLabelText("Pay Type"));
    await userEvent.click(await screen.findByRole("option", { name: "ACH" }));

    expect(onFilterChange).toHaveBeenCalledWith("payType", "ACH");
  });

  it("selects a Payment Status option", async () => {
    const onFilterChange = vi.fn();
    renderSearch({ onFilterChange });

    await userEvent.click(screen.getByLabelText("Payment Status"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Failed" }),
    );

    expect(onFilterChange).toHaveBeenCalledWith("paymentStatus", "failed");
  });

  it("selects a Transaction Status option", async () => {
    const onFilterChange = vi.fn();
    renderSearch({ onFilterChange });

    await userEvent.click(screen.getByLabelText("Transaction Status"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Processed" }),
    );

    expect(onFilterChange).toHaveBeenCalledWith(
      "transactionStatus",
      "processed",
    );
  });

  it("selecting Any clears an active filter", async () => {
    const onFilterChange = vi.fn();
    renderSearch({
      onFilterChange,
      filters: {
        feeType: "PETITION_FILING_FEE",
        payType: null,
        paymentStatus: null,
        transactionStatus: null,
      },
    });

    await userEvent.click(screen.getByLabelText("Fee Type"));
    await userEvent.click(await screen.findByRole("option", { name: "Any" }));

    expect(onFilterChange).toHaveBeenCalledWith("feeType", null);
  });

  it("renders the results table matching the other tabs' column set", () => {
    renderSearch();

    expect(
      screen.getByRole("columnheader", { name: "Created" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Reference ID" }),
    ).toBeInTheDocument();
  });
});
