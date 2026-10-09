import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import ColumnPicker from "./ColumnPicker";
import {
  COLUMN_IDS,
  type ColumnVisibility,
  DEFAULT_COLUMN_VISIBILITY,
} from "./columns";

const renderPicker = (
  overrides: Partial<Parameters<typeof ColumnPicker>[0]> = {},
) => {
  const props = {
    visibility: DEFAULT_COLUMN_VISIBILITY,
    lockedId: null,
    isDefault: true,
    onToggle: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  render(
    <ColumnPicker
      visibility={props.visibility}
      searchedIds={props.searchedIds}
      onToggle={props.onToggle}
      defaultVisibility={DEFAULT_COLUMN_VISIBILITY}
      onReset={props.onReset}
    />,
  );
  return props;
};

const openPicker = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Select columns" }));
  return screen.findByRole("dialog", { name: "Select columns" });
};

const onlyVisible = (id: keyof ColumnVisibility): ColumnVisibility =>
  Object.fromEntries(
    COLUMN_IDS.map((columnId) => [columnId, columnId === id]),
  ) as ColumnVisibility;

describe("ColumnPicker", () => {
  it("lists every column, grouped, checked to match the visibility", async () => {
    renderPicker();
    const dialog = await openPicker();

    const transaction = within(dialog).getByRole("group", {
      name: "Transaction",
    });
    const metadata = within(dialog).getByRole("group", { name: "Metadata" });

    expect(within(transaction).getAllByRole("checkbox")).toHaveLength(12);
    expect(within(metadata).getAllByRole("checkbox")).toHaveLength(4);

    expect(within(dialog).getByRole("checkbox", { name: "Fee" })).toBeChecked();
    expect(
      within(dialog).getByRole("checkbox", { name: "Created" }),
    ).not.toBeChecked();
    expect(
      within(dialog).getByRole("checkbox", { name: "Docket number" }),
    ).not.toBeChecked();
  });

  it("reports the column and its new state when checked", async () => {
    const { onToggle } = renderPicker();
    const dialog = await openPicker();

    await userEvent.click(
      within(dialog).getByRole("checkbox", { name: "Created" }),
    );

    expect(onToggle).toHaveBeenCalledWith("createdAt", true);
  });

  it("reports the column and its new state when unchecked", async () => {
    const { onToggle } = renderPicker();
    const dialog = await openPicker();

    await userEvent.click(
      within(dialog).getByRole("checkbox", { name: "Amount" }),
    );

    expect(onToggle).toHaveBeenCalledWith("transactionAmount", false);
  });

  it("won't let the last visible column be hidden, and says why", async () => {
    const { onToggle } = renderPicker({
      visibility: onlyVisible("feeName"),
      lockedId: "feeName",
    });
    const dialog = await openPicker();

    const fee = within(dialog).getByRole("checkbox", { name: "Fee" });
    expect(fee).toHaveAttribute("aria-disabled", "true");
    expect(fee).toHaveAccessibleDescription(
      "At least one column must stay visible",
    );

    await userEvent.click(fee);

    expect(onToggle).not.toHaveBeenCalled();
    const amount = within(dialog).getByRole("checkbox", { name: "Amount" });
    expect(amount).not.toHaveAttribute("aria-disabled", "true");
    expect(amount).not.toHaveAccessibleDescription();
  });

  it("locks only the locked column while others are checked too", async () => {
    const { onToggle } = renderPicker({
      visibility: { ...onlyVisible("feeName"), transactionStatus: true },
      lockedId: "feeName",
    });
    const dialog = await openPicker();

    expect(
      within(dialog).getByRole("checkbox", { name: "Fee" }),
    ).toHaveAttribute("aria-disabled", "true");
    const transactionStatus = within(dialog).getByRole("checkbox", {
      name: "Transaction status",
    });
    expect(transactionStatus).toBeChecked();
    expect(transactionStatus).not.toHaveAttribute("aria-disabled", "true");

    await userEvent.click(transactionStatus);

    expect(onToggle).toHaveBeenCalledWith("transactionStatus", false);
  });

  it("disables Reset to defaults while showing the defaults", async () => {
    renderPicker();
    const dialog = await openPicker();

    expect(
      within(dialog).getByRole("button", { name: "Reset to defaults" }),
    ).toBeDisabled();
  });

  it("enables Reset to defaults when not at the defaults", async () => {
    const { onReset } = renderPicker({ isDefault: false });
    const dialog = await openPicker();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Reset to defaults" }),
    );

    expect(onReset).toHaveBeenCalledOnce();
  });

  it("works from the keyboard and returns focus to the trigger on Escape", async () => {
    const { onToggle } = renderPicker();
    const trigger = screen.getByRole("button", { name: "Select columns" });

    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", {
      name: "Select columns",
    });

    const created = within(dialog).getByRole("checkbox", { name: "Created" });
    created.focus();
    await userEvent.keyboard(" ");

    expect(onToggle).toHaveBeenCalledWith("createdAt", true);

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Select columns" }),
      ).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("has no accessibility violations axe can detect while open", async () => {
    renderPicker();
    await openPicker();

    const { violations } = await axe.run(document.body);

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
