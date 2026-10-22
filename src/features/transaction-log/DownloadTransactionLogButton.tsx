"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast-context";
import type { AppliedDateRange } from "./dateRange";
import { exportCriteriaRows } from "./exportCriteria";
import { exportFilename } from "./exportFilename";
import {
  EXPORT_ROW_LIMIT,
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
import { exportViewKey } from "./transactionLogParams";
import type { TransactionSearchFilters, TransactionSorting } from "./types";

const LABEL = "Download Transaction Log";

type DownloadPhase =
  | { step: "idle" }
  | { step: "fetching"; fetched: number; total: number }
  | { step: "building" };

const tooLargeMessage = (total: number) =>
  `Downloads are limited to ${EXPORT_ROW_LIMIT.toLocaleString()} transactions, and this view has ${total.toLocaleString()}. Shorten the timeframe or add filters to reduce the count.`;

const isAbort = (err: unknown) =>
  err instanceof DOMException && err.name === "AbortError";

export default function DownloadTransactionLogButton({
  filters,
  range,
  sorting,
  disabled,
  total,
  onProgress,
}: {
  filters: TransactionSearchFilters;
  range: AppliedDateRange;
  sorting: TransactionSorting;
  disabled?: boolean;
  /** Row count of the current view; lets an oversized export be refused
   *  before the save dialog opens. */
  total?: number;
  onProgress: (text: string) => void;
}) {
  const [phase, setPhase] = useState<DownloadPhase>({ step: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const { showToast, dismissToast } = useToast();
  const errorToastRef = useRef<{ id: string; viewKey: string } | null>(null);
  const viewKey = exportViewKey(filters, range, sorting);

  const clearError = useCallback(() => {
    if (errorToastRef.current) dismissToast(errorToastRef.current.id);
    errorToastRef.current = null;
  }, [dismissToast]);

  // Stays until dismissed: the user has to act on it.
  const showError = (message: string) => {
    clearError();
    errorToastRef.current = {
      id: showToast(message, "error", { persistent: true }),
      viewKey,
    };
  };

  const busy = phase.step === "fetching" || phase.step === "building";

  // A message about one view must not outlive it.
  useEffect(() => {
    if (errorToastRef.current && errorToastRef.current.viewKey !== viewKey) {
      clearError();
    }
  }, [viewKey, clearError]);

  // The toolbar unmounts when the log query errors. The parent renders the
  // progress text, so it must be told to drop it too.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      clearError();
      onProgress("");
    },
    [clearError, onProgress],
  );

  const startDownload = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    let destination: SaveDestination | null = null;
    clearError();

    // Best effort: the on-screen total can be stale, so the check after page 1
    // in fetchAllTransactions remains the authority.
    if (total !== undefined && total > EXPORT_ROW_LIMIT) {
      showError(tooLargeMessage(total));
      abortRef.current = null;
      return;
    }

    try {
      const filename = exportFilename(range, filters);
      destination = await pickSaveDestination(filename);

      setPhase({ step: "fetching", fetched: 0, total: 0 });
      const { rows } = await fetchAllTransactions(filters, range, sorting, {
        signal: controller.signal,
        onProgress: (progress) => setPhase({ step: "fetching", ...progress }),
      });
      setPhase({ step: "building" });
      const buffer = await buildWorkbookInWorker(
        rows,
        exportCriteriaRows(range, sorting, filters),
        controller.signal,
      );
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
        setPhase({ step: "idle" });
        showError(
          err instanceof ExportTooLargeError
            ? tooLargeMessage(err.total)
            : "The download failed. Try again.",
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

  useEffect(() => {
    onProgress(progressText);
  }, [progressText, onProgress]);

  return (
    <>
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
          focusableWhenDisabled
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          onClick={startDownload}
        />
      </AppTooltip>
    </>
  );
}
