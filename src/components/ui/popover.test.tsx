import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { IconButton } from "./icon-button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./popover";

const renderPopover = () =>
  render(
    <Popover>
      <PopoverTrigger
        render={<IconButton icon="columns" label="Select columns" />}
      />
      <PopoverContent>
        <PopoverTitle>Select columns</PopoverTitle>
      </PopoverContent>
    </Popover>,
  );

describe("Popover", () => {
  it("opens from an IconButton trigger as a dialog named by its title", async () => {
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Select columns" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);

    expect(
      await screen.findByRole("dialog", { name: "Select columns" }),
    ).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes with Escape and returns focus to the trigger", async () => {
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Select columns" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Select columns" });

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Select columns" }),
      ).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
