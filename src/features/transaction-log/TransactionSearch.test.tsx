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

  it("updates the checked radio without triggering a search", async () => {
    const onLookupTypeChange = vi.fn();
    const onLookupValueChange = vi.fn();
    renderSearch({ onLookupTypeChange, onLookupValueChange });

    await userEvent.click(screen.getByRole("radio", { name: "Agency ID" }));

    expect(screen.getByRole("radio", { name: "Agency ID" })).toBeChecked();
    expect(onLookupTypeChange).not.toHaveBeenCalled();
    expect(onLookupValueChange).not.toHaveBeenCalled();
  });

  it("updates the input's placeholder to the newly selected lookup type immediately", async () => {
    renderSearch();

    await userEvent.click(screen.getByRole("radio", { name: "Agency ID" }));

    expect(screen.getByPlaceholderText("Agency ID")).toBeInTheDocument();
  });

  it("commits the lookup type together with the value on submit", async () => {
    const onLookupTypeChange = vi.fn();
    const onLookupValueChange = vi.fn();
    renderSearch({ onLookupTypeChange, onLookupValueChange });

    await userEvent.click(screen.getByRole("radio", { name: "Agency ID" }));
    fireEvent.change(screen.getByPlaceholderText("Agency ID"), {
      target: { value: "26PHF07R" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onLookupTypeChange).toHaveBeenCalledWith("agencyId");
    expect(onLookupValueChange).toHaveBeenCalledWith("26PHF07R");
  });

  it("resets the draft lookup type when the committed value is cleared externally", () => {
    const { rerender } = renderSearch({ lookupType: "agencyId" });

    expect(screen.getByRole("radio", { name: "Agency ID" })).toBeChecked();

    rerender(
      <TransactionSearch
        feeType={null}
        payType={null}
        lookupType="accountHolder"
        lookupValue={null}
        onFeeTypeChange={vi.fn()}
        onPayTypeChange={vi.fn()}
        onLookupTypeChange={vi.fn()}
        onLookupValueChange={vi.fn()}
          rows={[]}
        sorting={{ sort: "createdAt", order: "desc" }}
        onSortingChange={vi.fn()}
        emptyMessage="No transactions to show."
      />,
    );

    expect(screen.getByRole("radio", { name: "Account Holder" })).toBeChecked();
  });

  it("does not report a lookup value while the user is still typing", () => {
    const onLookupValueChange = vi.fn();
    renderSearch({ onLookupValueChange });

    fireEvent.change(screen.getByPlaceholderText("Account Holder"), {
      target: { value: "Inez" },
    });

    expect(onLookupValueChange).not.toHaveBeenCalled();
  });

  it("commits the lookup value when the Search button is clicked", async () => {
    const onLookupValueChange = vi.fn();
    renderSearch({ onLookupValueChange });

    fireEvent.change(screen.getByPlaceholderText("Account Holder"), {
      target: { value: "Inez" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onLookupValueChange).toHaveBeenCalledWith("Inez");
  });

  it("commits the lookup value on Enter", () => {
    const onLookupValueChange = vi.fn();
    renderSearch({ onLookupValueChange });

    const input = screen.getByPlaceholderText("Account Holder");
    fireEvent.change(input, { target: { value: "26PHF07R" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    expect(onLookupValueChange).toHaveBeenCalledWith("26PHF07R");
  });

  it("clears the lookup value when submitted blank", async () => {
    const onLookupValueChange = vi.fn();
    renderSearch({ onLookupValueChange, lookupValue: "Inez" });

    fireEvent.change(screen.getByPlaceholderText("Account Holder"), {
      target: { value: "   " },
    });
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onLookupValueChange).toHaveBeenCalledWith(null);
  });

  it("resets the draft value when the committed lookup value is cleared externally", () => {
    const { rerender } = renderSearch({ lookupValue: "Inez" });

    expect(screen.getByPlaceholderText("Account Holder")).toHaveValue("Inez");

    rerender(
      <TransactionSearch
        feeType={null}
        payType={null}
        lookupType="accountHolder"
        lookupValue={null}
        onFeeTypeChange={vi.fn()}
        onPayTypeChange={vi.fn()}
        onLookupTypeChange={vi.fn()}
        onLookupValueChange={vi.fn()}
          rows={[]}
        sorting={{ sort: "createdAt", order: "desc" }}
        onSortingChange={vi.fn()}
        emptyMessage="No transactions to show."
      />,
    );

    expect(screen.getByPlaceholderText("Account Holder")).toHaveValue("");
  });

  it("does not show a clear button while the input is empty", () => {
    renderSearch();

    expect(
      screen.queryByRole("button", { name: "Clear search text" }),
    ).not.toBeInTheDocument();
  });

  it("shows a clear button once text is typed, and clears the input without searching", async () => {
    const onLookupValueChange = vi.fn();
    renderSearch({ onLookupValueChange });

    fireEvent.change(screen.getByPlaceholderText("Account Holder"), {
      target: { value: "Inez" },
    });

    const clearButton = screen.getByRole("button", {
      name: "Clear search text",
    });
    await userEvent.click(clearButton);

    expect(screen.getByPlaceholderText("Account Holder")).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Clear search text" }),
    ).not.toBeInTheDocument();
    expect(onLookupValueChange).not.toHaveBeenCalled();
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
