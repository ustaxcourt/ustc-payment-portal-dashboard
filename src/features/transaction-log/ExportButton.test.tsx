import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppliedDateRange } from "./dateRange";
import ExportButton from "./ExportButton";
import { ExportTooLargeError } from "./exportTransactions";

vi.mock("./exportTransactions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./exportTransactions")>()),
  fetchAllTransactions: vi.fn(),
}));
vi.mock("./exportWorkbook", () => ({
  buildWorkbookInWorker: vi.fn(),
  pickSaveDestination: vi.fn(),
  saveWorkbook: vi.fn(),
}));

import { fetchAllTransactions } from "./exportTransactions";
import {
  buildWorkbookInWorker,
  pickSaveDestination,
  saveWorkbook,
} from "./exportWorkbook";

const range: AppliedDateRange = {
  preset: "today",
  from: "08/17/2026",
  to: "08/17/2026",
  label: "Today",
};

const sorting = { sort: "createdAt", order: "desc" } as const;

const renderButton = (disabled = false) =>
  render(
    <ExportButton tab="all" range={range} sorting={sorting} disabled={disabled} />,
  );

describe("ExportButton", () => {
  beforeEach(() => {
    vi.mocked(fetchAllTransactions).mockReset();
    vi.mocked(buildWorkbookInWorker).mockReset();
    vi.mocked(pickSaveDestination)
      .mockReset()
      .mockResolvedValue({ kind: "download" });
    vi.mocked(saveWorkbook).mockReset().mockResolvedValue();
  });

  it("fetches, builds, and saves with the range-based filename", async () => {
    const rows = [{ agencyTrackingId: "a" }] as never[];
    vi.mocked(fetchAllTransactions).mockResolvedValue({ rows, total: 1 });
    const buffer = new ArrayBuffer(8);
    vi.mocked(buildWorkbookInWorker).mockResolvedValue(buffer);

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() =>
      expect(saveWorkbook).toHaveBeenCalledWith(
        { kind: "download" },
        buffer,
        "2026-08-17 - USTC Fee Payment Summary.xlsx",
      ),
    );
    expect(vi.mocked(pickSaveDestination).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(fetchAllTransactions).mock.invocationCallOrder[0],
    );
    expect(buildWorkbookInWorker).toHaveBeenCalledWith(
      rows,
      "all",
      expect.any(AbortSignal),
    );
  });

  it("abandons the export quietly when the save dialog is cancelled", async () => {
    vi.mocked(pickSaveDestination).mockRejectedValue(
      new DOMException("cancelled", "AbortError"),
    );

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Export" })).toBeEnabled(),
    );
    expect(fetchAllTransactions).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the too-large guidance instead of downloading", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(
      new ExportTooLargeError(60_000),
    );

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /60,000.*Narrow the timeframe/,
    );
    expect(saveWorkbook).not.toHaveBeenCalled();
  });

  it("shows a retryable error when the export fails", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(new Error("boom"));

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The export failed. Try again.",
    );
    expect(
      screen.getByRole("button", { name: "Export" }),
    ).not.toBeDisabled();
  });

  it("returns quietly to idle when the user cancels", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(
      new DOMException("Export cancelled", "AbortError"),
    );

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Export" })).toBeEnabled(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers Cancel while an export is running", async () => {
    let release: (value: { rows: never[]; total: number }) => void = () => {};
    vi.mocked(fetchAllTransactions).mockImplementation(
      (_tab, _range, _sorting, options) =>
        new Promise((resolve, reject) => {
          release = resolve;
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Export cancelled", "AbortError")),
          );
        }),
    );

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    const cancel = await screen.findByRole("button", { name: "Cancel" });
    await userEvent.click(cancel);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Export" })).toBeEnabled(),
    );
    release({ rows: [], total: 0 });
  });

  it("is disabled when the view has no rows", () => {
    renderButton(true);
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });
});
