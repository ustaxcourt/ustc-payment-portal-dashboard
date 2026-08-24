import { render, screen } from "@testing-library/react";
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
