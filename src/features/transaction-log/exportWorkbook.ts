import type { WorkbookResult } from "./exportWorkbook.worker";
import type { TransactionLogEntry, TransactionTab } from "./types";

/** Builds the .xlsx off the main thread so a 50k-row file cannot freeze the UI. */
export const buildWorkbookInWorker = (
  rows: TransactionLogEntry[],
  tab: TransactionTab,
  signal?: AbortSignal,
): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./exportWorkbook.worker.ts", import.meta.url),
    );

    const abort = () => {
      worker.terminate();
      reject(new DOMException("Export cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });

    const settle = (fn: () => void) => {
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      fn();
    };

    worker.onmessage = (event: MessageEvent<WorkbookResult>) => {
      const result = event.data;
      settle(() =>
        result.ok ? resolve(result.buffer) : reject(new Error(result.error)),
      );
    };
    worker.onerror = (event) => {
      settle(() =>
        reject(new Error(event.message || "The export worker failed")),
      );
    };

    worker.postMessage({ rows, tab });
  });

export const downloadWorkbook = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
