import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ShareViewButton from "./ShareViewButton";

describe("ShareViewButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders the share view button", () => {
    render(<ShareViewButton />);

    expect(
      screen.getByRole("button", { name: "Share View" }),
    ).toBeInTheDocument();
  });

  it("copies the current url to the clipboard", async () => {
    render(<ShareViewButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "Share View" }),
    );

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      window.location.href,
    );
  });

  it("shows copied confirmation after clicking", async () => {
    render(<ShareViewButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "Share View" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Link copied to clipboard",
        }),
      ).toBeInTheDocument(),
    );
  });

  it("returns to share view state after timeout", async () => {
    render(<ShareViewButton />);

    await userEvent.click(
      screen.getByRole("button", { name: "Share View" }),
    );

    vi.advanceTimersByTime(2000);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Share View" }),
      ).toBeInTheDocument(),
    );
  });
});
