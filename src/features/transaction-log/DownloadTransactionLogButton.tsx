"use client";

import { useRef, useState } from "react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast-context";
import type { AppliedDateRange } from "./dateRange";
import { exportFilename } from "./exportFilename";
import {
  ExportTooLargeError,
  fetchAllTransactions,
} from "./exportTransactions";
import {
  buildWorkbookInWorker,
  discardSaveDestination,
  pickSaveDestination,
  type SaveDestination,
  saveWorkbook,
} from "./exportWorkbook";
import type { TransactionSorting, TransactionTab } from "./types";

/** Doubles as the tooltip copy and the button's accessible name, so what a
 *  sighted user reads on hover is what a screen reader announces. */
const LABEL = "Download Transaction Log";

type DownloadPhase =
  | { step: "idle" }
  | { step: "fetching"; fetched: number; total: number }
  | { step: "building" };

const isAbort = (err: unknown) =>
  err instanceof DOMException && err.name === "AbortError";

/** Renders a fragment, not a wrapper: the progress text, Cancel and the icon
 *  sit as siblings in the Transaction Log's toolbar row. */
export default function DownloadTransactionLogButton({
  tab,
  range,
  sorting,
  disabled,
}: {
  tab: TransactionTab;
  range: AppliedDateRange;
  sorting: TransactionSorting;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<DownloadPhase>({ step: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  const busy = phase.step === "fetching" || phase.step === "building";

  const startDownload = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    let destination: SaveDestination | null = null;

    try {
      const filename = exportFilename(range, tab);
      destination = await pickSaveDestination(filename);

      setPhase({ step: "fetching", fetched: 0, total: 0 });
      const { rows } = await fetchAllTransactions(tab, range, sorting, {
        signal: controller.signal,
        onProgress: (progress) => setPhase({ step: "fetching", ...progress }),
      });
      setPhase({ step: "building" });
      const buffer = await buildWorkbookInWorker(rows, controller.signal);
      // A cancel landing after the build resolves must not write the file.
      if (controller.signal.aborted) {
        throw new DOMException("Download cancelled", "AbortError");
      }
      await saveWorkbook(destination, buffer, filename);
      setPhase({ step: "idle" });
    } catch (err) {
      if (destination) void discardSaveDestination(destination);
      setPhase({ step: "idle" });
      if (!isAbort(err)) {
        console.error("Transaction log download failed:", err);
        showToast(
          err instanceof ExportTooLargeError
            ? `${err.message} Narrow the timeframe and try again.`
            : "The download failed. Try again.",
          "error",
        );
      }
    } finally {
      abortRef.current = null;
    }
  };

  const progressText =
    phase.step === "fetching" && phase.total > 0
      ? `Preparing download… ${phase.fetched.toLocaleString()} of ${phase.total.toLocaleString()}`
      : phase.step === "fetching"
        ? "Preparing download…"
        : phase.step === "building"
          ? "Building file…"
          : "";

  return (
    <>
      {/* Always mounted (not conditional on `busy`) so assistive tech is
          already watching the region when the text first appears. */}
      <p
        aria-live="polite"
        className="text-xs text-muted-foreground empty:hidden"
      >
        {progressText}
      </p>
      {busy ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => abortRef.current?.abort()}
        >
          Cancel
        </Button>
      ) : null}
      <AppTooltip content={LABEL}>
        <IconButton
          icon="download"
          label={LABEL}
          disabled={disabled || busy}
          onClick={startDownload}
        />
      </AppTooltip>
    </>
  );
}
