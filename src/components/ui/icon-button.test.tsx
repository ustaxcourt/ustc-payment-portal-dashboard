import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("is a button named by its label", () => {
    render(<IconButton icon="columns" label="Select columns" />);

    expect(
      screen.getByRole("button", { name: "Select columns" }),
    ).toHaveAttribute("type", "button");
  });

  it("calls onClick", async () => {
    const onClick = vi.fn();
    render(<IconButton icon="link" label="Copy share link" onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Copy share link" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("announces its description alongside any caller-supplied one", () => {
    render(
      <>
        <span id="external">Three filters</span>
        <IconButton
          icon="filter"
          label="Show filters"
          description="Filters active"
          aria-describedby="external"
        />
      </>,
    );

    expect(
      screen.getByRole("button", { name: "Show filters" }),
    ).toHaveAccessibleDescription("Three filters Filters active");
  });

  it("forwards its ref and extra props to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton
        ref={ref}
        icon="columns"
        label="Select columns"
        aria-expanded={false}
      />,
    );

    const button = screen.getByRole("button", { name: "Select columns" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps its own label even if the caller passes one", () => {
    render(
      <IconButton
        icon="columns"
        label="Select columns"
        {...({ "aria-label": "Something else" } as object)}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Select columns" }),
    ).toBeInTheDocument();
  });
});
