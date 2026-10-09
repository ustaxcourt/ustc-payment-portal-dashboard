import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    <DownloadTransactionLogButton
      tab="all"
      range={range}
      sorting={sorting}
      disabled={disabled}
    />,
  );

const downloadButton = () => screen.getByRole("button", { name: LABEL });

const expectDownloadDisabled = (yes: boolean) =>
  expect(downloadButton()).toHaveAttribute("aria-disabled", String(yes));

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
      expectDownloadDisabled(false),
    );
    expect(fetchAllTransactions).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the too-large guidance instead of downloading", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(
      new ExportTooLargeError(60_000),
    );

    renderButton();
    await userEvent.click(downloadButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /60,000.*Narrow the timeframe/,
    );
    expect(saveWorkbook).not.toHaveBeenCalled();
  });

  it("shows a retryable error when the download fails", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(new Error("boom"));

    renderButton();
    await userEvent.click(downloadButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The download failed. Try again.",
    );
    expectDownloadDisabled(false);
  });

  it("returns quietly to idle when the user cancels", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(
      new DOMException("Download cancelled", "AbortError"),
    );

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() =>
      expectDownloadDisabled(false),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
    let release: (value: { rows: never[]; total: number }) => void = () => { };
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
      expectDownloadDisabled(false),
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
      () => new Promise(() => { }),
    );

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() => expectDownloadDisabled(true));
    expect(
      (await screen.findAllByText("Preparing download…")).length,
    ).toBeGreaterThan(0);
  });

  it("announces fetch progress politely", async () => {
    vi.mocked(fetchAllTransactions).mockImplementation(
      (_tab, _range, _sorting, options) => {
        options?.onProgress?.({ fetched: 5_000, total: 12_000 });
        return new Promise(() => { });
      },
    );

    renderButton();
    await userEvent.click(downloadButton());

    const [liveRegion] = await screen.findAllByText(
      "Preparing download… 5,000 of 12,000",
    );
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveClass("sr-only");
  });

  it("aborts an in-flight download when the toolbar unmounts", async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(fetchAllTransactions).mockImplementation(
      (_tab, _range, _sorting, options) => {
        signal = options?.signal;
        return new Promise(() => { });
      },
    );

    const { unmount } = renderButton();
    await userEvent.click(downloadButton());
    await waitFor(() => expect(signal).toBeDefined());
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it("is disabled when the view has no rows", () => {
    renderButton(true);
    expectDownloadDisabled(true);
  });
});
