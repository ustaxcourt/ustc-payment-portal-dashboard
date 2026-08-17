import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SortableHeader from "./SortableHeader";

describe("SortableHeader", () => {
  it("exposes the column as a button named after the column", () => {
    render(<SortableHeader label="Amount" sorted={false} onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Amount" })).toBeInTheDocument();
  });

  it("sorts on click", async () => {
    const onToggle = vi.fn();
    render(<SortableHeader label="Amount" sorted={false} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button", { name: "Amount" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("sorts from the keyboard", async () => {
    const onToggle = vi.fn();
    render(<SortableHeader label="Amount" sorted={false} onToggle={onToggle} />);

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Amount" })).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("hides the indicator from assistive technology", () => {
    const { container } = render(
      <SortableHeader label="Amount" sorted="desc" onToggle={vi.fn()} />,
    );

    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the accessible name free of sort state", () => {
    render(<SortableHeader label="Amount" sorted="asc" onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Amount" })).toBeInTheDocument();
  });
});
