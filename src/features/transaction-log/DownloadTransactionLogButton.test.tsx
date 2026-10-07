import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-context";
import type { AppliedDateRange } from "./dateRange";
import DownloadTransactionLogButton from "./DownloadTransactionLogButton";
import { ExportTooLargeError } from "./exportTransactions";

vi.mock("./exportTransactions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./exportTransactions")>()),
  fetchAllTransactions: vi.fn(),
}));
vi.mock("./exportWorkbook", () => ({
  buildWorkbookInWorker: vi.fn(),
  discardSaveDestination: vi.fn(),
  pickSaveDestination: vi.fn(),
  saveWorkbook: vi.fn(),
}));

import { fetchAllTransactions } from "./exportTransactions";
import {
  buildWorkbookInWorker,
  discardSaveDestination,
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

const LABEL = "Download Transaction Log";

const renderButton = (disabled = false) =>
  render(
    <ToastProvider>
      <DownloadTransactionLogButton
        tab="all"
        range={range}
        sorting={sorting}
        disabled={disabled}
      />
    </ToastProvider>,
  );

const downloadButton = () => screen.getByRole("button", { name: LABEL });

describe("DownloadTransactionLogButton", () => {
  beforeEach(() => {
    vi.mocked(fetchAllTransactions).mockReset();
    vi.mocked(buildWorkbookInWorker).mockReset();
    vi.mocked(pickSaveDestination)
      .mockReset()
      .mockResolvedValue({ kind: "download" });
    vi.mocked(discardSaveDestination).mockReset().mockResolvedValue();
    vi.mocked(saveWorkbook).mockReset().mockResolvedValue();
  });

  it("fetches, builds, and saves with the range-based filename", async () => {
    const rows = [{ agencyTrackingId: "a" }] as never[];
    vi.mocked(fetchAllTransactions).mockResolvedValue({ rows, total: 1 });
    const buffer = new ArrayBuffer(8);
    vi.mocked(buildWorkbookInWorker).mockResolvedValue(buffer);

    renderButton();
    await userEvent.click(downloadButton());

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
      expect.any(AbortSignal),
    );
  });

  it("abandons the download quietly when the save dialog is cancelled", async () => {
    vi.mocked(pickSaveDestination).mockRejectedValue(
      new DOMException("cancelled", "AbortError"),
    );

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() =>
      expect(downloadButton()).toBeEnabled(),
    );
    expect(fetchAllTransactions).not.toHaveBeenCalled();
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  it("shows the too-large guidance instead of downloading", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(
      new ExportTooLargeError(60_000),
    );

    renderButton();
    await userEvent.click(downloadButton());

    expect(
      await screen.findByText(/60,000.*Narrow the timeframe/),
    ).toBeInTheDocument();
    expect(saveWorkbook).not.toHaveBeenCalled();
  });

  it("shows a retryable error when the download fails", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(new Error("boom"));

    renderButton();
    await userEvent.click(downloadButton());

    expect(
      await screen.findByText("The download failed. Try again."),
    ).toBeInTheDocument();
    expect(downloadButton()).not.toBeDisabled();
  });

  it("returns quietly to idle when the user cancels", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(
      new DOMException("Download cancelled", "AbortError"),
    );

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() =>
      expect(downloadButton()).toBeEnabled(),
    );
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  it("deletes the picked file when the download is cancelled", async () => {
    const destination = {
      kind: "picker",
      handle: { createWritable: vi.fn(), remove: vi.fn() },
    } as const;
    vi.mocked(pickSaveDestination).mockResolvedValue(destination);
    vi.mocked(fetchAllTransactions).mockRejectedValue(
      new DOMException("Download cancelled", "AbortError"),
    );

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() =>
      expect(discardSaveDestination).toHaveBeenCalledWith(destination),
    );
    expect(saveWorkbook).not.toHaveBeenCalled();
  });

  it("deletes the picked file when the download fails", async () => {
    const destination = {
      kind: "picker",
      handle: { createWritable: vi.fn(), remove: vi.fn() },
    } as const;
    vi.mocked(pickSaveDestination).mockResolvedValue(destination);
    vi.mocked(fetchAllTransactions).mockRejectedValue(
      new ExportTooLargeError(60_000),
    );

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() =>
      expect(discardSaveDestination).toHaveBeenCalledWith(destination),
    );
  });

  it("keeps the file on a successful download", async () => {
    vi.mocked(fetchAllTransactions).mockResolvedValue({
      rows: [] as never[],
      total: 0,
    });
    vi.mocked(buildWorkbookInWorker).mockResolvedValue(new ArrayBuffer(8));

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() => expect(saveWorkbook).toHaveBeenCalled());
    expect(discardSaveDestination).not.toHaveBeenCalled();
  });

  it("offers Cancel while a download is running", async () => {
    let release: (value: { rows: never[]; total: number }) => void = () => {};
    vi.mocked(fetchAllTransactions).mockImplementation(
      (_tab, _range, _sorting, options) =>
        new Promise((resolve, reject) => {
          release = resolve;
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Download cancelled", "AbortError")),
          );
        }),
    );

    renderButton();
    await userEvent.click(downloadButton());

    const cancel = await screen.findByRole("button", { name: "Cancel" });
    await userEvent.click(cancel);

    await waitFor(() =>
      expect(downloadButton()).toBeEnabled(),
    );
    release({ rows: [], total: 0 });
  });

  it("names the tooltip the same as the button", async () => {
    renderButton();

    await userEvent.hover(downloadButton());

    expect(await screen.findByText(LABEL)).toBeInTheDocument();
  });

  it("disables itself while the log is compiled and downloaded", async () => {
    vi.mocked(fetchAllTransactions).mockImplementation(
      () => new Promise(() => {}),
    );

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() => expect(downloadButton()).toBeDisabled());
    expect(await screen.findByText("Preparing download…")).toBeInTheDocument();
  });

  it("announces fetch progress politely", async () => {
    vi.mocked(fetchAllTransactions).mockImplementation(
      (_tab, _range, _sorting, options) => {
        options?.onProgress?.({ fetched: 5_000, total: 12_000 });
        return new Promise(() => {});
      },
    );

    renderButton();
    await userEvent.click(downloadButton());

    const progress = await screen.findByText(
      "Preparing download… 5,000 of 12,000",
    );
    expect(progress).toHaveAttribute("aria-live", "polite");
  });

  it("is disabled when the view has no rows", () => {
    renderButton(true);
    expect(downloadButton()).toBeDisabled();
  });
});
