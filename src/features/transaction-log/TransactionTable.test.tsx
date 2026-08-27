import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { getColumns } from "./columns";
import { TAB_HEADER_TONE, TAB_LABEL } from "./statusStyles";
import TransactionTable from "./TransactionTable";
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
  overrides: Partial<Parameters<typeof TransactionTable>[0]> = {},
) =>
  render(
    <TransactionTable
      rows={[row]}
      columns={getColumns("all")}
      caption={`Transaction log, ${TAB_LABEL.all}`}
      headerTone={TAB_HEADER_TONE.all}
      sorting={{ sort: "createdAt", order: "desc" }}
      onSortingChange={vi.fn()}
      emptyMessage="No transactions to show."
      {...overrides}
    />,
  );

const headerFor = (name: string) =>
  screen.getByRole("columnheader", { name: new RegExp(name) });

describe("TransactionTable sort state", () => {
  it("marks only the sorted column with a direction", () => {
    renderTable();

    expect(headerFor("Created")).toHaveAttribute("aria-sort", "descending");
    expect(headerFor("Amount")).toHaveAttribute("aria-sort", "none");
  });

  it("reports ascending when the order is ascending", () => {
    renderTable({ sorting: { sort: "transactionAmount", order: "asc" } });

    expect(headerFor("Amount")).toHaveAttribute("aria-sort", "ascending");
    expect(headerFor("Created")).toHaveAttribute("aria-sort", "none");
  });

  it("opens a numeric column descending", async () => {
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

  it.each([
    ["Created", "createdAt"],
    ["Last updated", "lastUpdatedAt"],
  ])("opens %s descending when it is not the active sort", async (
    label,
    field,
  ) => {
    const onSortingChange = vi.fn();
    renderTable({
      sorting: { sort: "transactionAmount", order: "asc" },
      onSortingChange,
    });

    await userEvent.click(
      within(headerFor(label)).getByRole("button", { name: label }),
    );

    expect(onSortingChange).toHaveBeenCalledWith({ sort: field, order: "desc" });
  });

  it("opens a text column ascending", async () => {
    const onSortingChange = vi.fn();
    renderTable({ onSortingChange });

    await userEvent.click(
      within(headerFor("Client")).getByRole("button", { name: "Client" }),
    );

    expect(onSortingChange).toHaveBeenCalledWith({
      sort: "clientName",
      order: "asc",
    });
  });

  it("flips direction rather than clearing the sort", async () => {
    const onSortingChange = vi.fn();
    renderTable({ onSortingChange });

    await userEvent.click(
      within(headerFor("Created")).getByRole("button", { name: "Created" }),
    );

    expect(onSortingChange).toHaveBeenCalledWith({
      sort: "createdAt",
      order: "asc",
    });
  });

  it("names the table and its column headers", () => {
    renderTable();

    expect(
      screen.getByRole("table", { name: /Transaction log/ }),
    ).toBeInTheDocument();
    expect(headerFor("Created")).toHaveAttribute("scope", "col");
  });

  it("has no accessibility violations axe can detect", async () => {
    const { container } = renderTable();

    const { violations } = await axe.run(container);

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });

  it("shows the payment status as a badge", () => {
    renderTable();

    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows the failure reason", () => {
    renderTable();

    expect(screen.getByText("Insufficient funds")).toBeInTheDocument();
  });

  it("keeps the headers usable when there are no rows", () => {
    renderTable({ rows: [] });

    expect(
      within(headerFor("Amount")).getByRole("button", { name: "Amount" }),
    ).toBeEnabled();
    expect(screen.getByText("No transactions to show.")).toBeInTheDocument();
  });
});
