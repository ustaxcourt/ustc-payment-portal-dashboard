"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

type ExportPhase =
  | { step: "idle" }
  | { step: "fetching"; fetched: number; total: number }
  | { step: "building" }
  | { step: "error"; message: string };

const isAbort = (err: unknown) =>
  err instanceof DOMException && err.name === "AbortError";

export default function ExportButton({
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
  const [phase, setPhase] = useState<ExportPhase>({ step: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const busy = phase.step === "fetching" || phase.step === "building";

  const startExport = async () => {
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
      const buffer = await buildWorkbookInWorker(rows, tab, controller.signal);
      // A cancel landing after the build resolves must not write the file.
      if (controller.signal.aborted) {
        throw new DOMException("Export cancelled", "AbortError");
      }
      await saveWorkbook(destination, buffer, filename);
      setPhase({ step: "idle" });
    } catch (err) {
      // The picker creates an empty file at pick time; clean it up on any
      // outcome that never wrote it.
      if (destination) void discardSaveDestination(destination);
      if (isAbort(err)) {
        setPhase({ step: "idle" });
      } else {
        setPhase({
          step: "error",
          message:
            err instanceof ExportTooLargeError
              ? `${err.message} Narrow the timeframe and try again.`
              : "The export failed. Try again.",
        });
      }
    } finally {
      abortRef.current = null;
    }
  };

  const progressText =
    phase.step === "fetching" && phase.total > 0
      ? `Preparing export… ${phase.fetched.toLocaleString()} of ${phase.total.toLocaleString()}`
      : phase.step === "fetching"
        ? "Preparing export…"
        : phase.step === "building"
          ? "Building file…"
          : "";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {busy ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => abortRef.current?.abort()}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={startExport}
          disabled={disabled || busy}
        >
          {busy ? "Exporting…" : "Export"}
        </Button>
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {progressText}
      </p>
      {phase.step === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {phase.message}
        </p>
      ) : null}
    </div>
  );
}
