"use client";

import { useEffect, useRef, useState } from "react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
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

const LABEL = "Download Transaction Log";

type DownloadPhase =
  | { step: "idle" }
  | { step: "fetching"; fetched: number; total: number }
  | { step: "building" }
  | { step: "error"; message: string };

const isAbort = (err: unknown) =>
  err instanceof DOMException && err.name === "AbortError";

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

  const busy = phase.step === "fetching" || phase.step === "building";

  // The toolbar unmounts when the log query errors.
  useEffect(() => () => abortRef.current?.abort(), []);

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
      if (isAbort(err)) {
        setPhase({ step: "idle" });
      } else {
        console.error("Transaction log download failed:", err);
        setPhase({
          step: "error",
          message:
            err instanceof ExportTooLargeError
              ? `${err.message} Narrow the timeframe and try again.`
              : "The download failed. Try again.",
        });
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
      <span aria-live="polite" className="sr-only">
        {progressText}
      </span>
      {progressText ? (
        <p aria-hidden className="text-xs text-muted-foreground">
          {progressText}
        </p>
      ) : null}
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
      {phase.step === "error" ? (
        <p role="alert" className="text-xs text-destructive">
          {phase.message}
        </p>
      ) : null}
      <AppTooltip content={LABEL}>
        <IconButton
          icon="download"
          label={LABEL}
          disabled={disabled || busy}
          focusableWhenDisabled
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          onClick={startDownload}
        />
      </AppTooltip>
    </>
  );
}
