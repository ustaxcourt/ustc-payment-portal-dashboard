import { afterEach, describe, expect, it, vi } from "vitest";
import { pickSaveDestination, saveWorkbook } from "./exportWorkbook";

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
