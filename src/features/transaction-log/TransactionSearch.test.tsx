import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TransactionSearch from "./TransactionSearch";
import type { TransactionLogEntry, TransactionSearchFilters } from "./types";

type Props = Parameters<typeof TransactionSearch>[0];

const row = (
  metadata: Record<string, string> | null,
): TransactionLogEntry => ({
  agencyTrackingId: "agency-1",
  feeName: "Filing fee",
  fee: "PETITION_FILING_FEE",
  transactionAmount: 60,
  clientName: "payment-portal",
  transactionReferenceId: "ref-1",
  paymentStatus: "success",
  createdAt: "2026-08-18T00:00:00.000Z",
  lastUpdatedAt: "2026-08-18T00:00:00.000Z",
  metadata,
});

const NO_FILTERS: TransactionSearchFilters = {
  feeType: null,
  payType: null,
  paymentStatus: null,
  transactionStatus: null,
  metadataKey: null,
  metadataValue: null,
};

const renderSearch = (
  overrides: Omit<Partial<Props>, "filters"> & {
    filters?: Partial<TransactionSearchFilters>;
  } = {},
) => {
  const { filters, ...rest } = overrides;
  return render(
    <TransactionSearch
      filters={{ ...NO_FILTERS, ...filters }}
      onFilterChange={vi.fn()}
      onMetadataSearch={vi.fn()}
      rows={[]}
      sorting={{ sort: "createdAt", order: "desc" }}
      onSortingChange={vi.fn()}
      emptyMessage="No transactions to show."
      {...rest}
    />,
  );
};

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

  it("shows the resolved label, not the raw value, on a closed trigger", () => {
    renderSearch({
      filters: {
        feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE",
        payType: null,
        paymentStatus: null,
        transactionStatus: null,
      },
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

  describe("metadata columns", () => {
    it("shows no metadata columns until a Fee Type is selected", () => {
      renderSearch({ rows: [row({ docketNumber: "123-26" })] });

      expect(
        screen.queryByRole("columnheader", { name: "Docket Number" }),
      ).not.toBeInTheDocument();
    });

    it("adds the selected fee's metadata column and renders its value", () => {
      renderSearch({
        filters: { feeType: "PETITION_FILING_FEE" },
        rows: [row({ docketNumber: "123-26" })],
      });

      expect(
        screen.getByRole("columnheader", { name: "Docket Number" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "123-26" })).toBeInTheDocument();
    });

    it("falls back to an em dash when the row is missing the key", () => {
      // Every other column on this row has a value, so the only "—" cell is
      // the metadata one.
      renderSearch({
        filters: { feeType: "PETITION_FILING_FEE" },
        rows: [
          {
            ...row({}),
            paymentMethod: "ach",
            transactionStatus: "processed",
            returnDetail: "declined",
          },
        ],
      });

      const dashCells = screen.getAllByRole("cell", { name: "—" });
      expect(dashCells).toHaveLength(1);
    });

    it("swaps the metadata columns when the Fee Type changes", () => {
      const { rerender } = renderSearch({
        filters: { feeType: "PETITION_FILING_FEE" },
        rows: [row({ docketNumber: "123-26", email: "a@b.com" })],
      });

      expect(
        screen.getByRole("columnheader", { name: "Docket Number" }),
      ).toBeInTheDocument();

      rerender(
        <TransactionSearch
          filters={{
            ...NO_FILTERS,
            feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE",
          }}
          onFilterChange={vi.fn()}
          onMetadataSearch={vi.fn()}
          rows={[row({ docketNumber: "123-26", email: "a@b.com" })]}
          sorting={{ sort: "createdAt", order: "desc" }}
          onSortingChange={vi.fn()}
          emptyMessage="No transactions to show."
        />,
      );

      expect(
        screen.queryByRole("columnheader", { name: "Docket Number" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Email" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Full Name" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Access Code" }),
      ).toBeInTheDocument();
    });

    it("does not make a metadata column sortable", async () => {
      renderSearch({
        filters: { feeType: "PETITION_FILING_FEE" },
        rows: [row({ docketNumber: "123-26" })],
      });

      const header = screen.getByRole("columnheader", { name: "Docket Number" });
      expect(header).not.toHaveAttribute("aria-sort");
      expect(
        within(header).queryByRole("button"),
      ).not.toBeInTheDocument();
    });
  });
});
