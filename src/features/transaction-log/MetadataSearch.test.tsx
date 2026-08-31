import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MetadataSearch from "./MetadataSearch";

type Props = Parameters<typeof MetadataSearch>[0];

const renderMetadataSearch = (overrides: Partial<Props> = {}) =>
  render(
    <MetadataSearch
      feeType={null}
      metadataKey={null}
      metadataValue={null}
      onSearch={vi.fn()}
      {...overrides}
    />,
  );

describe("MetadataSearch", () => {
  it("prompts for a Fee Type before enabling search", () => {
    renderMetadataSearch();

    expect(
      screen.getByText("Select a Fee Type to enable Search."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });

  it("shows a single labeled input for a fee with one metadata key", () => {
    renderMetadataSearch({ feeType: "PETITION_FILING_FEE" });

    expect(screen.getByText("Docket Number")).toBeInTheDocument();
    expect(screen.queryByLabelText("Search by")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Search by Docket Number"),
    ).toBeInTheDocument();
  });

  it("offers a dropdown of keys for a fee with three metadata keys", async () => {
    renderMetadataSearch({ feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE" });

    await userEvent.click(screen.getByLabelText("Search by"));

    expect(
      await screen.findByRole("option", { name: "Email" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Full Name" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Access Code" }),
    ).toBeInTheDocument();
  });

  it("commits the selected key and value when Search is clicked", async () => {
    const onSearch = vi.fn();
    renderMetadataSearch({
      feeType: "PETITION_FILING_FEE",
      onSearch,
    });

    await userEvent.type(
      screen.getByLabelText("Search by Docket Number"),
      "123-26",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith("docketNumber", "123-26");
  });

  it("commits on Enter in the input", async () => {
    const onSearch = vi.fn();
    renderMetadataSearch({ feeType: "PETITION_FILING_FEE", onSearch });

    await userEvent.type(
      screen.getByLabelText("Search by Docket Number"),
      "abc{Enter}",
    );

    expect(onSearch).toHaveBeenCalledWith("docketNumber", "abc");
  });

  it("does not commit while the user is only typing", async () => {
    const onSearch = vi.fn();
    renderMetadataSearch({ feeType: "PETITION_FILING_FEE", onSearch });

    await userEvent.type(
      screen.getByLabelText("Search by Docket Number"),
      "partial",
    );

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("trims the value and treats a blank entry as a cleared lookup", async () => {
    const onSearch = vi.fn();
    renderMetadataSearch({ feeType: "PETITION_FILING_FEE", onSearch });

    await userEvent.type(
      screen.getByLabelText("Search by Docket Number"),
      "   ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith(null, null);
  });

  it("clears a committed value and re-queries when the X is clicked", async () => {
    const onSearch = vi.fn();
    renderMetadataSearch({
      feeType: "PETITION_FILING_FEE",
      metadataKey: "docketNumber",
      metadataValue: "123-26",
      onSearch,
    });

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onSearch).toHaveBeenCalledWith(null, null);
    expect(screen.getByLabelText("Search by Docket Number")).toHaveValue("");
  });

  it("hides the X until there is text, and does not re-query for an uncommitted draft", async () => {
    const onSearch = vi.fn();
    renderMetadataSearch({ feeType: "PETITION_FILING_FEE", onSearch });

    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText("Search by Docket Number"),
      "draft",
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(screen.getByLabelText("Search by Docket Number")).toHaveValue("");
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("seeds the input from an already-committed value", () => {
    renderMetadataSearch({
      feeType: "NONATTORNEY_EXAM_REGISTRATION_FEE",
      metadataKey: "email",
      metadataValue: "foo@example.com",
    });

    expect(screen.getByLabelText("Search by Email")).toHaveValue(
      "foo@example.com",
    );
  });
});
