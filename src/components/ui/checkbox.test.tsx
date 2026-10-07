import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

const renderCheckbox = (props: Parameters<typeof Checkbox>[0] = {}) =>
  render(
    <label>
      <Checkbox {...props} />
      Created
    </label>,
  );

describe("Checkbox", () => {
  it("is announced as a checkbox named by its label", () => {
    renderCheckbox();

    expect(screen.getByRole("checkbox", { name: "Created" })).not.toBeChecked();
  });

  it("toggles on click and reports the new state", async () => {
    const onCheckedChange = vi.fn();
    renderCheckbox({ onCheckedChange });

    await userEvent.click(screen.getByRole("checkbox", { name: "Created" }));

    expect(screen.getByRole("checkbox", { name: "Created" })).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it("toggles with the Space key", async () => {
    renderCheckbox({ defaultChecked: true });

    screen.getByRole("checkbox", { name: "Created" }).focus();
    await userEvent.keyboard(" ");

    expect(screen.getByRole("checkbox", { name: "Created" })).not.toBeChecked();
  });

  it("ignores interaction while disabled", async () => {
    const onCheckedChange = vi.fn();
    renderCheckbox({ defaultChecked: true, disabled: true, onCheckedChange });

    await userEvent.click(screen.getByRole("checkbox", { name: "Created" }));

    expect(screen.getByRole("checkbox", { name: "Created" })).toBeChecked();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
