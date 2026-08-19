import { fireEvent, render, screen } from "@testing-library/react";
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
      lookupType="accountHolder"
      lookupValue={null}
      onFeeTypeChange={vi.fn()}
      onPayTypeChange={vi.fn()}
      onLookupTypeChange={vi.fn()}
      onLookupValueChange={vi.fn()}
      onClear={vi.fn()}
      rows={[]}
      sorting={{ sort: "createdAt", order: "desc" }}
      onSortingChange={vi.fn()}
      emptyMessage="No transactions to show."
      {...overrides}
    />,
  );

describe("TransactionSearch", () => {
  it("renders Filter by Type and Direct Lookup sections", () => {
    renderSearch();

    expect(screen.getByText("Filter by Type")).toBeInTheDocument();
    expect(screen.getByText("Direct Lookup")).toBeInTheDocument();
    expect(screen.getByLabelText("Fee Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Pay Type")).toBeInTheDocument();
  });

  it("defaults the lookup radio group to Account Holder", () => {
    renderSearch();

    expect(
      screen.getByRole("radio", { name: "Account Holder" }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: "Agency ID" })).not.toBeChecked();
  });

  it("switches lookup type on radio click", async () => {
    const onLookupTypeChange = vi.fn();
    renderSearch({ onLookupTypeChange });

    await userEvent.click(screen.getByRole("radio", { name: "Agency ID" }));

    expect(onLookupTypeChange).toHaveBeenCalledWith("agencyId");
  });

  it("reports lookup value changes as the user types", () => {
    const onLookupValueChange = vi.fn();
    renderSearch({ onLookupValueChange });

    fireEvent.change(screen.getByPlaceholderText("Account Holder"), {
      target: { value: "Inez" },
    });

    expect(onLookupValueChange).toHaveBeenCalledWith("Inez");
  });

  it("calls onClear when Clear Search is clicked", async () => {
    const onClear = vi.fn();
    renderSearch({ onClear });

    await userEvent.click(screen.getByRole("button", { name: "Clear Search" }));

    expect(onClear).toHaveBeenCalled();
  });

  it("renders the results table with the search column set", () => {
    renderSearch();

    expect(
      screen.getByRole("columnheader", { name: "Timestamp" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Agency ID" }),
    ).toBeInTheDocument();
  });
});
