import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "./instrumentation";

describe("register", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs the Node.js runtime version on the Node.js runtime", () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    register();

    expect(info).toHaveBeenCalledWith(
      `[dashboard] Node.js runtime ${process.version}`,
    );
  });

  it("logs nothing on the edge runtime", () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    register();

    expect(info).not.toHaveBeenCalled();
  });
});
