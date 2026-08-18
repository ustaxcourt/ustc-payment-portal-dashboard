import type { WorkbookResult } from "./exportWorkbook.worker";
import type { TransactionLogEntry, TransactionTab } from "./types";

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

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type WritableFileHandle = {
  createWritable: () => Promise<{
    write: (data: ArrayBuffer | Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type PickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<WritableFileHandle>;
};

export type SaveDestination =
  | { kind: "picker"; handle: WritableFileHandle }
  | { kind: "download" };

export const pickSaveDestination = async (
  suggestedName: string,
): Promise<SaveDestination> => {
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (!picker) return { kind: "download" };

  try {
    const handle = await picker({
      suggestedName,
      types: [
        { description: "Excel workbook", accept: { [XLSX_MIME]: [".xlsx"] } },
      ],
    });
    return { kind: "picker", handle };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { kind: "download" };
  }
};

export const saveWorkbook = async (
  destination: SaveDestination,
  buffer: ArrayBuffer,
  filename: string,
): Promise<void> => {
  if (destination.kind === "picker") {
    const writable = await destination.handle.createWritable();
    await writable.write(buffer);
    await writable.close();
    return;
  }
  downloadWorkbook(buffer, filename);
};

export const downloadWorkbook = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
