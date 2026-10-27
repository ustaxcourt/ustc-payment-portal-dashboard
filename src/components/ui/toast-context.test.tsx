import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast-context";

let toast: ReturnType<typeof useToast>;

function Capture() {
  toast = useToast();
  return null;
}

const renderProvider = () =>
  render(
    <ToastProvider>
      <Capture />
    </ToastProvider>,
  );

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes a regular toast after its display time and exit animation", () => {
    renderProvider();

    act(() => {
      toast.showToast("Link copied");
    });
    expect(screen.getByText("Link copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByText("Link copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  });

  it("keeps a persistent toast until it is dismissed", () => {
    renderProvider();

    act(() => {
      toast.showToast("Download failed", "error", { persistent: true });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Download failed");

    act(() => {
      screen.getByRole("button", { name: "Dismiss notification" }).click();
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("dismisses the newest persistent toast on Escape", () => {
    renderProvider();
    act(() => {
      toast.showToast("First failure", "error", { persistent: true });
      toast.showToast("Second failure", "error", { persistent: true });
    });

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText("Second failure")).not.toBeInTheDocument();
    expect(screen.getByText("First failure")).toBeInTheDocument();
  });

  it("leaves regular toasts alone on Escape", () => {
    renderProvider();
    act(() => {
      toast.showToast("Link copied");
    });

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Link copied")).toBeInTheDocument();
  });

  it("ignores Escape that another handler already claimed", () => {
    renderProvider();
    act(() => {
      toast.showToast("Download failed", "error", { persistent: true });
    });

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        cancelable: true,
      });
      event.preventDefault();
      document.dispatchEvent(event);
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Download failed")).toBeInTheDocument();
  });

  it("stops listening for Escape once no persistent toast remains", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    renderProvider();
    act(() => {
      toast.showToast("Download failed", "error", { persistent: true });
    });

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
      vi.advanceTimersByTime(300);
    });

    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("ignores a second dismissal and one for a toast that is already gone", () => {
    renderProvider();

    let id = "";
    act(() => {
      id = toast.showToast("Download failed", "error", { persistent: true });
    });
    act(() => {
      toast.dismissToast(id);
      toast.dismissToast(id);
    });
    // One removal timer, not two.
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => {
      toast.dismissToast(id);
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not auto-dismiss a toast that was already dismissed by hand", () => {
    renderProvider();

    let id = "";
    act(() => {
      id = toast.showToast("Link copied");
      toast.dismissToast(id);
    });

    // The pending 3s timer was cancelled; only the removal timer remains.
    expect(vi.getTimerCount()).toBe(1);
  });

  it("clears pending timers when the provider unmounts", () => {
    const { unmount } = renderProvider();

    act(() => {
      toast.showToast("Link copied");
      toast.showToast("Download failed", "error", { persistent: true });
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
