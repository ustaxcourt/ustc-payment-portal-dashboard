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
  paymentStatus: "success",
  transactionStatus: "processed",
  paymentMethod: "Credit/Debit Card",
  returnCode: null,
  returnDetail: null,
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
  it("renders the mockup's column set", () => {
    renderTable();

    for (const label of [
      "Timestamp",
      "Fee Type",
      "Amount",
      "Pay Type",
      "Status",
      "Account Holder",
      "Agency ID",
    ]) {
      expect(headerFor(label)).toBeInTheDocument();
    }
  });

  it("only makes Timestamp and Amount clickable to sort", () => {
    renderTable();

    expect(
      within(headerFor("Timestamp")).getByRole("button", {
        name: "Timestamp",
      }),
    ).toBeInTheDocument();
    expect(
      within(headerFor("Amount")).getByRole("button", { name: "Amount" }),
    ).toBeInTheDocument();

    for (const label of ["Fee Type", "Pay Type", "Status", "Account Holder", "Agency ID"]) {
      expect(
        within(headerFor(label)).queryByRole("button"),
      ).not.toBeInTheDocument();
    }
  });

  it("marks non-sortable columns without an aria-sort claim", () => {
    renderTable();

    expect(headerFor("Timestamp")).toHaveAttribute("aria-sort", "descending");
    expect(headerFor("Fee Type")).not.toHaveAttribute("aria-sort");
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

  it("shows the account holder and agency id values", () => {
    renderTable();

    expect(screen.getByText("payment-portal")).toBeInTheDocument();
    expect(screen.getByText("agency-1")).toBeInTheDocument();
  });
});
