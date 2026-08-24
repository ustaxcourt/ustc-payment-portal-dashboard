import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TransactionSearchTable from "./TransactionSearchTable";
import type { TransactionLogEntry } from "./types";

const row: TransactionLogEntry = {
  agencyTrackingId: "agency-1",
  paygovTrackingId: "paygov-1",
  feeName: "Petition Filing Fee",
  fee: "PETITION_FILING_FEE",
  transactionAmount: 60,
  clientName: "payment-portal",
  transactionReferenceId: "ref-1",
  paymentStatus: "failed",
  transactionStatus: "processed",
  paymentMethod: "Credit/Debit Card",
  returnCode: 102,
  returnDetail: "Insufficient funds",
  createdAt: "2026-08-03T12:00:00.000Z",
  lastUpdatedAt: "2026-08-03T13:00:00.000Z",
};

const renderTable = (
  overrides: Partial<Parameters<typeof TransactionSearchTable>[0]> = {},
) =>
  render(
    <TransactionSearchTable
      rows={[row]}
      sorting={{ sort: "createdAt", order: "desc" }}
      onSortingChange={vi.fn()}
      emptyMessage="No transactions to show."
      {...overrides}
    />,
  );

const headerFor = (name: string) =>
  screen.getByRole("columnheader", { name: new RegExp(name) });

describe("TransactionSearchTable", () => {
  it("matches the other tabs' column set", () => {
    renderTable();

    for (const label of [
      "Created",
      "Last updated",
      "Fee type",
      "Amount",
      "Payment method",
      "Payment status",
      "Failure reason",
      "Transaction status",
      "Client",
      "Reference ID",
    ]) {
      expect(headerFor(label)).toBeInTheDocument();
    }
  });

  it("makes every column clickable to sort, matching the other tabs", () => {
    renderTable();

    for (const label of [
      "Created",
      "Last updated",
      "Fee type",
      "Amount",
      "Payment method",
      "Payment status",
      "Failure reason",
      "Transaction status",
      "Client",
      "Reference ID",
    ]) {
      expect(
        within(headerFor(label)).getByRole("button", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("sorts Amount on click", async () => {
    const onSortingChange = vi.fn();
    renderTable({ onSortingChange });

    await userEvent.click(
      within(headerFor("Amount")).getByRole("button", { name: "Amount" }),
    );

    expect(onSortingChange).toHaveBeenCalledWith({
      sort: "transactionAmount",
      order: "desc",
    });
  });

  it("shows the payment status as a badge, matching the other tabs", () => {
    renderTable();

    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows the failure reason", () => {
    renderTable();

    expect(screen.getByText("Insufficient funds")).toBeInTheDocument();
  });
});
