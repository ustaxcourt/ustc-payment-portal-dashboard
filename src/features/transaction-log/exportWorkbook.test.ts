import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWorkbookInWorker,
  discardSaveDestination,
  pickSaveDestination,
  saveWorkbook,
} from "./exportWorkbook";

const stubPicker = (impl: unknown) => {
  Object.defineProperty(window, "showSaveFilePicker", {
    configurable: true,
    value: impl,
  });
};

afterEach(() => {
  Reflect.deleteProperty(window, "showSaveFilePicker");
  vi.restoreAllMocks();
});

describe("pickSaveDestination", () => {
  it("falls back to a plain download when the browser has no picker", async () => {
    await expect(pickSaveDestination("file.xlsx")).resolves.toEqual({
      kind: "download",
    });
  });

  it("returns the chosen handle and suggests the filename", async () => {
    const handle = { createWritable: vi.fn() };
    const picker = vi.fn().mockResolvedValue(handle);
    stubPicker(picker);

    const destination = await pickSaveDestination("file.xlsx");

    expect(destination).toEqual({ kind: "picker", handle });
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: "file.xlsx" }),
    );
  });

  it("propagates a cancelled dialog as AbortError", async () => {
    stubPicker(
      vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError")),
    );

    await expect(pickSaveDestination("file.xlsx")).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("falls back to a plain download when the picker is blocked", async () => {
    stubPicker(
      vi.fn().mockRejectedValue(new DOMException("nope", "SecurityError")),
    );

    await expect(pickSaveDestination("file.xlsx")).resolves.toEqual({
      kind: "download",
    });
  });
});

describe("buildWorkbookInWorker", () => {
  // jsdom has no Worker: this passing also proves the early return fires
  // before the worker would be constructed.
  it("rejects an already-aborted signal without starting a worker", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      buildWorkbookInWorker([], "all", controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("discardSaveDestination", () => {
  it("removes the picked file", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    await discardSaveDestination({
      kind: "picker",
      handle: { createWritable: vi.fn(), remove },
    });

    expect(remove).toHaveBeenCalled();
  });

  it("swallows a failed removal", async () => {
    await expect(
      discardSaveDestination({
        kind: "picker",
        handle: {
          createWritable: vi.fn(),
          remove: vi.fn().mockRejectedValue(new Error("locked")),
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("is a no-op for downloads and handles without remove", async () => {
    await expect(
      discardSaveDestination({ kind: "download" }),
    ).resolves.toBeUndefined();
    await expect(
      discardSaveDestination({
        kind: "picker",
        handle: { createWritable: vi.fn() },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("saveWorkbook", () => {
  it("writes the buffer through a picked handle and closes it", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const handle = {
      createWritable: vi.fn().mockResolvedValue({ write, close }),
    };
    const buffer = new ArrayBuffer(8);

    await saveWorkbook({ kind: "picker", handle }, buffer, "file.xlsx");

    expect(write).toHaveBeenCalledWith(buffer);
    expect(close).toHaveBeenCalled();
  });
});
