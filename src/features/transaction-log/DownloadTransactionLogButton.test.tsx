import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-context";
import DownloadTransactionLogButton from "./DownloadTransactionLogButton";
import type { AppliedDateRange } from "./dateRange";
import { ExportTooLargeError } from "./exportTransactions";
import type { TransactionSearchFilters } from "./types";

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

const NO_FILTERS: TransactionSearchFilters = {
  feeType: null,
  payType: null,
  paymentStatus: null,
  transactionStatus: null,
  metadataKey: null,
  metadataValue: null,
};

const sorting = { sort: "createdAt", order: "desc" } as const;

const LABEL = "Download Transaction Log";

// Mirrors the real parent: progress text is rendered outside the button.
function Harness({
  disabled,
  paymentStatus,
  total,
}: {
  disabled: boolean;
  total?: number;
  paymentStatus: "success" | null;
}) {
  const [progress, setProgress] = useState("");
  return (
    <>
      <p role="status">{progress}</p>
      <DownloadTransactionLogButton
        filters={{ ...NO_FILTERS, paymentStatus }}
        range={range}
        sorting={sorting}
        disabled={disabled}
        total={total}
        onProgress={setProgress}
      />
    </>
  );
}

const renderButton = (disabled = false, total?: number) =>
  render(
    <ToastProvider>
      <Harness disabled={disabled} paymentStatus={null} total={total} />
    </ToastProvider>,
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

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This view has 60,000 transactions, but downloads are limited to 50,000. Shorten the timeframe and try again.",
      ),
    );
    expect(saveWorkbook).not.toHaveBeenCalled();
  });

  it("refuses an oversized view before opening the save dialog", async () => {
    renderButton(false, 60_000);
    await userEvent.click(downloadButton());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This view has 60,000 transactions, but downloads are limited to 50,000.",
    );
    expect(pickSaveDestination).not.toHaveBeenCalled();
    expect(fetchAllTransactions).not.toHaveBeenCalled();
  });

  it("shows a retryable error when the download fails", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(new Error("boom"));

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "The download failed. Try again.",
      ),
    );
    expectDownloadDisabled(false);
  });

  it("keeps the error until the user dismisses it", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(new Error("boom"));

    renderButton();
    await userEvent.click(downloadButton());
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );

    await new Promise((resolve) => setTimeout(resolve, 3_500));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  }, 10_000);

  it("clears the message when the view changes", async () => {
    vi.mocked(fetchAllTransactions).mockRejectedValue(new Error("boom"));

    const { rerender } = renderButton();
    await userEvent.click(downloadButton());
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );

    rerender(
      <ToastProvider>
        <Harness disabled={false} paymentStatus="success" />
      </ToastProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
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
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Preparing download…",
      ),
    );
  });

  it("reports fetch progress to its parent", async () => {
    vi.mocked(fetchAllTransactions).mockImplementation(
      (_tab, _range, _sorting, options) => {
        options?.onProgress?.({ fetched: 5_000, total: 12_000 });
        return new Promise(() => { });
      },
    );

    renderButton();
    await userEvent.click(downloadButton());

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Preparing download… 5,000 of 12,000",
      ),
    );
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
