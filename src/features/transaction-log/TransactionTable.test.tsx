import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COLUMN_VISIBILITY, getColumns } from "./columns";
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

const ALL_COLUMNS_VISIBLE = Object.fromEntries(
  Object.keys(DEFAULT_COLUMN_VISIBILITY).map((id) => [id, true]),
);

const renderTable = (
  overrides: Partial<Parameters<typeof TransactionTable>[0]> = {},
) =>
  render(
    <TransactionTable
      rows={[row]}
      columns={getColumns()}
      caption="Transaction log, All"
      headerTone="bg-status-neutral-subtle"
      sorting={{ sort: "createdAt", order: "desc" }}
      onSortingChange={vi.fn()}
      columnVisibility={ALL_COLUMNS_VISIBLE}
      emptyMessage="No transactions to show."
      {...overrides}
    />,
  );

const headerFor = (name: string) =>
  screen.getByRole("columnheader", { name: new RegExp(name) });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TransactionTable status rendering", () => {
  it("renders a cancelled transaction status as Cancelled", () => {
    renderTable({
      rows: [
        {
          ...row,
          transactionStatus: "cancelled",
          paymentStatus: "failed",
          returnCode: null,
          returnDetail: null,
        },
      ],
    });

    expect(
      // jsdom's accessible-name computation for a container role like
      // gridcell doesn't inherit a descendant button's aria-label the way a
      // real browser does, so this reads the plain cell text, not "Copy
      // Cancelled" (which the live/e2e accessibility tree does report).
      screen.getByRole("gridcell", { name: "Cancelled" }),
    ).toBeInTheDocument();
  });
});

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
      screen.getByRole("grid", { name: /Transaction log/ }),
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

  it("copies a cell's value from the keyboard and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderTable();

    const copyButton = screen.getByRole("button", {
      name: "Copy Insufficient funds",
    });
    copyButton.focus();
    await userEvent.keyboard("{Enter}");

    expect(writeText).toHaveBeenCalledWith("Insufficient funds");
    expect(await screen.findByText("Copied to clipboard")).toBeInTheDocument();
  });

  it("keeps the headers usable when there are no rows", () => {
    renderTable({ rows: [] });

    expect(
      within(headerFor("Amount")).getByRole("button", { name: "Amount" }),
    ).toBeEnabled();
    expect(screen.getByText("No transactions to show.")).toBeInTheDocument();
  });
});

describe("TransactionTable keyboard grid", () => {
  const secondRow: TransactionLogEntry = {
    ...row,
    agencyTrackingId: "agency-2",
    transactionReferenceId: "ref-2",
  };

  const cellButton = (r: number, c: number) =>
    document.querySelector(
      `button[data-row="${r}"][data-col="${c}"]`,
    ) as HTMLButtonElement;

  it("starts with only the first cell in the tab order", () => {
    renderTable({ rows: [row, secondRow] });

    expect(cellButton(0, 0)).toHaveAttribute("tabindex", "0");
    expect(cellButton(0, 1)).toHaveAttribute("tabindex", "-1");
    expect(cellButton(1, 0)).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus and the tab stop with the arrow keys", async () => {
    renderTable({ rows: [row, secondRow] });

    cellButton(0, 0).focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(document.activeElement).toBe(cellButton(0, 1));
    expect(cellButton(0, 1)).toHaveAttribute("tabindex", "0");
    expect(cellButton(0, 0)).toHaveAttribute("tabindex", "-1");

    await userEvent.keyboard("{ArrowDown}");

    expect(document.activeElement).toBe(cellButton(1, 1));
  });

  it("does nothing at the edge of the grid", async () => {
    renderTable({ rows: [row, secondRow] });

    cellButton(0, 0).focus();
    await userEvent.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(cellButton(0, 0));
    expect(cellButton(0, 0)).toHaveAttribute("tabindex", "0");
  });

  it("still prevents the native scroll at the edge of the grid", () => {
    renderTable({ rows: [row, secondRow] });

    const notPrevented = fireEvent.keyDown(cellButton(0, 0), {
      key: "ArrowUp",
      code: "ArrowUp",
    });

    expect(notPrevented).toBe(false);
  });

  it("keeps exactly one tab stop after a filter drops the active row", async () => {
    const { rerender } = renderTable({ rows: [row, secondRow] });

    cellButton(0, 0).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(cellButton(1, 0));

    // Narrowing the filter drops row 1 — the old tab stop goes with it, and
    // the clamped-back-to-(0,0) cell must pick it up. React's own prop diff
    // can't be trusted to flip that cell's tabIndex here: it was never
    // re-rendered since mount (the keydown handler mutates the DOM
    // directly), so React still believes row 0's tabIndex is unchanged from
    // mount and may skip writing it.
    rerender(
      <TransactionTable
        rows={[row]}
        columns={getColumns()}
        caption="Transaction log, All"
        headerTone="bg-status-neutral-subtle"
        sorting={{ sort: "createdAt", order: "desc" }}
        onSortingChange={vi.fn()}
        columnVisibility={ALL_COLUMNS_VISIBLE}
        emptyMessage="No transactions to show."
      />,
    );

    const tabbable = document.querySelectorAll('button[tabindex="0"]');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(cellButton(0, 0));
  });
});

describe("TransactionTable column visibility", () => {
  const visibleHeaders = () =>
    screen.getAllByRole("columnheader").map((header) => header.textContent);

  it("renders only the visible columns, in order", () => {
    renderTable({ columnVisibility: DEFAULT_COLUMN_VISIBILITY });

    expect(visibleHeaders()).toEqual([
      "Last updated",
      "Fee",
      "Amount",
      "Payment status",
    ]);
    expect(screen.queryByText("Insufficient funds")).not.toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(4);
  });

  it("sizes the colgroup and minimum width from the visible columns", () => {
    const { container } = renderTable({
      columnVisibility: DEFAULT_COLUMN_VISIBILITY,
    });

    expect(container.querySelectorAll("col")).toHaveLength(4);
    expect(screen.getByRole("grid")).toHaveStyle({ minWidth: "410px" });
  });

  it("moves between visible columns only with the arrow keys", async () => {
    renderTable({ columnVisibility: DEFAULT_COLUMN_VISIBILITY });

    screen.getByRole("button", { name: /^Copy 2026-08-03/ }).focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Copy Petition Filing Fee" }),
    );
  });

  it("returns the tab stop to the first cell when the visible columns change", async () => {
    const { rerender } = renderTable();

    const cellButton = (r: number, c: number) =>
      document.querySelector(
        `button[data-row="${r}"][data-col="${c}"]`,
      ) as HTMLButtonElement;

    cellButton(0, 0).focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(document.activeElement).toBe(cellButton(0, 2));

    rerender(
      <TransactionTable
        rows={[row]}
        columns={getColumns()}
        caption="Transaction log, All"
        headerTone="bg-status-neutral-subtle"
        sorting={{ sort: "createdAt", order: "desc" }}
        onSortingChange={vi.fn()}
        columnVisibility={DEFAULT_COLUMN_VISIBILITY}
        emptyMessage="No transactions to show."
      />,
    );

    const tabbable = document.querySelectorAll('button[tabindex="0"]');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(cellButton(0, 0));
  });
});
