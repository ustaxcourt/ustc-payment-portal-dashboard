import { buildWorkbook } from "./workbookBuilder";
import type { TransactionLogEntry, TransactionTab } from "./types";

export type WorkbookRequest = {
  rows: TransactionLogEntry[];
  tab: TransactionTab;
};

export type WorkbookResult =
  | { ok: true; buffer: ArrayBuffer }
  | { ok: false; error: string };

// Every path must post a message; a silent throw would hang the caller.
self.onmessage = async (event: MessageEvent<WorkbookRequest>) => {
  try {
    const buffer = await buildWorkbook(event.data.rows, event.data.tab);
    const result: WorkbookResult = { ok: true, buffer };
    self.postMessage(result, { transfer: [buffer] });
  } catch (err) {
    const result: WorkbookResult = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(result);
  }
};
