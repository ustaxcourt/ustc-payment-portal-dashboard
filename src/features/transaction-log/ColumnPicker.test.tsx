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
    onVisibilityChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  render(<ColumnPicker {...props} />);
  return props;
};

const openPicker = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Select columns" }));
  return screen.findByRole("dialog", { name: "Visible columns" });
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
      within(dialog).getByRole("checkbox", { name: "Docket Number" }),
    ).not.toBeChecked();
  });

  it("reports the next visibility when a column is checked", async () => {
    const { onVisibilityChange } = renderPicker();
    const dialog = await openPicker();

    await userEvent.click(
      within(dialog).getByRole("checkbox", { name: "Created" }),
    );

    expect(onVisibilityChange).toHaveBeenCalledWith({
      ...DEFAULT_COLUMN_VISIBILITY,
      createdAt: true,
    });
  });

  it("reports the next visibility when a column is unchecked", async () => {
    const { onVisibilityChange } = renderPicker();
    const dialog = await openPicker();

    await userEvent.click(
      within(dialog).getByRole("checkbox", { name: "Amount" }),
    );

    expect(onVisibilityChange).toHaveBeenCalledWith({
      ...DEFAULT_COLUMN_VISIBILITY,
      transactionAmount: false,
    });
  });

  it("won't let the last visible column be hidden", async () => {
    const { onVisibilityChange } = renderPicker({
      visibility: onlyVisible("feeName"),
    });
    const dialog = await openPicker();

    const fee = within(dialog).getByRole("checkbox", { name: "Fee" });
    expect(fee).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(fee);

    expect(onVisibilityChange).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole("checkbox", { name: "Amount" }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("disables Reset to defaults while showing the defaults", async () => {
    renderPicker();
    const dialog = await openPicker();

    expect(
      within(dialog).getByRole("button", { name: "Reset to defaults" }),
    ).toBeDisabled();
  });

  it("resets once the visibility differs from the defaults", async () => {
    const { onReset } = renderPicker({
      visibility: { ...DEFAULT_COLUMN_VISIBILITY, createdAt: true },
    });
    const dialog = await openPicker();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Reset to defaults" }),
    );

    expect(onReset).toHaveBeenCalledOnce();
  });

  it("works from the keyboard and returns focus to the trigger on Escape", async () => {
    const { onVisibilityChange } = renderPicker();
    const trigger = screen.getByRole("button", { name: "Select columns" });

    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", {
      name: "Visible columns",
    });

    const created = within(dialog).getByRole("checkbox", { name: "Created" });
    created.focus();
    await userEvent.keyboard(" ");

    expect(onVisibilityChange).toHaveBeenCalledWith({
      ...DEFAULT_COLUMN_VISIBILITY,
      createdAt: true,
    });

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Visible columns" }),
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
