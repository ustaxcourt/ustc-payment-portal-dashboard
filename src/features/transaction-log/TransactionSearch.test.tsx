import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TransactionSearch from "./TransactionSearch";

const renderSearch = (
  overrides: Partial<Parameters<typeof TransactionSearch>[0]> = {},
) =>
  render(
    <TransactionSearch
      feeType={null}
      payType={null}
      paymentStatus={null}
      transactionStatus={null}
      onFeeTypeChange={vi.fn()}
      onPayTypeChange={vi.fn()}
      onPaymentStatusChange={vi.fn()}
      onTransactionStatusChange={vi.fn()}
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
    const onFeeTypeChange = vi.fn();
    renderSearch({ onFeeTypeChange });

    await userEvent.click(screen.getByLabelText("Fee Type"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Filing Fee" }),
    );

    expect(onFeeTypeChange).toHaveBeenCalledWith("PETITION_FILING_FEE");
  });

  it("selects a Pay Type option", async () => {
    const onPayTypeChange = vi.fn();
    renderSearch({ onPayTypeChange });

    await userEvent.click(screen.getByLabelText("Pay Type"));
    await userEvent.click(await screen.findByRole("option", { name: "ACH" }));

    expect(onPayTypeChange).toHaveBeenCalledWith("ACH");
  });

  it("selects a Payment Status option", async () => {
    const onPaymentStatusChange = vi.fn();
    renderSearch({ onPaymentStatusChange });

    await userEvent.click(screen.getByLabelText("Payment Status"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Failed" }),
    );

    expect(onPaymentStatusChange).toHaveBeenCalledWith("failed");
  });

  it("selects a Transaction Status option", async () => {
    const onTransactionStatusChange = vi.fn();
    renderSearch({ onTransactionStatusChange });

    await userEvent.click(screen.getByLabelText("Transaction Status"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Processed" }),
    );

    expect(onTransactionStatusChange).toHaveBeenCalledWith("processed");
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
