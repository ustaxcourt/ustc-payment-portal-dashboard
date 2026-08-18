import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimeframeControls from "./TimeframeControls";
import type { AppliedDateRange } from "./dateRange";

const customRange = (
  overrides: Partial<AppliedDateRange> = {},
): AppliedDateRange => ({
  preset: "custom",
  from: "08/04/2026",
  to: "08/10/2026",
  label: "08/04/2026 - 08/10/2026",
  requestedFrom: "08/04/2026",
  requestedTo: "08/10/2026",
  ...overrides,
});

const renderControls = (
  appliedRange: AppliedDateRange = customRange(),
) => {
  const onSelectPreset = vi.fn();
  const onApplyCustom = vi.fn();

  render(
    <TimeframeControls
      appliedRange={appliedRange}
      onSelectPreset={onSelectPreset}
      onApplyCustom={onApplyCustom}
    />,
  );

  return { onSelectPreset, onApplyCustom };
};

describe("TimeframeControls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T16:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows min and max bounds on both date pickers", () => {
    renderControls();

    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");

    expect(from).toHaveAttribute("min", "2026-01-01");
    expect(to).toHaveAttribute("min", "2026-01-01");
    expect(from).toHaveAttribute("max", "2026-08-18");
    expect(to).toHaveAttribute("max", "2026-08-18");
  });

  it("submits a valid custom range in MM/DD/YYYY format", () => {
    const { onApplyCustom } = renderControls();

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-08-05" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-08-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApplyCustom).toHaveBeenCalledWith("08/05/2026", "08/12/2026");
  });

  it("shows an inline error for a reversed range", () => {
    const { onApplyCustom } = renderControls();

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-08-10" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The From date must be on or before the To date.",
    );
    expect(onApplyCustom).not.toHaveBeenCalled();
  });

  it("lets the user switch to a preset and closes custom-only selection", () => {
    const { onSelectPreset } = renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(onSelectPreset).toHaveBeenCalledWith("today");
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
  });
});
