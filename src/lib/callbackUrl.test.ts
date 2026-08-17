import { describe, expect, it } from "vitest";
import { loginUrlReturningTo, safeCallbackUrl } from "./callbackUrl";

describe("safeCallbackUrl", () => {
  it("keeps a path inside the app", () => {
    expect(safeCallbackUrl("/?status=failed&sort=feeName&order=asc")).toBe(
      "/?status=failed&sort=feeName&order=asc",
    );
  });

  it.each([
    ["an absolute url", "https://evil.example"],
    ["an http url", "http://evil.example/x"],
    ["a protocol-relative host", "//evil.example"],
    ["a backslash host some browsers normalise", "/\\evil.example"],
    ["a newline smuggling a second value", "/\nhttps://evil.example"],
    ["a C1 control character", "/\u0085https://evil.example"],
  ])("refuses %s", (_label, value) => {
    expect(safeCallbackUrl(value)).toBe("/");
  });

  it("falls back when nothing usable is supplied", () => {
    expect(safeCallbackUrl(undefined)).toBe("/");
    expect(safeCallbackUrl(null)).toBe("/");
    expect(safeCallbackUrl("")).toBe("/");
  });

  it("takes the first entry when the param is repeated", () => {
    expect(safeCallbackUrl(["/?status=failed", "https://evil.example"])).toBe(
      "/?status=failed",
    );
  });
});

describe("loginUrlReturningTo", () => {
  it("carries an internal destination through sign-in", () => {
    expect(loginUrlReturningTo("/?status=failed")).toBe(
      "/login?callbackUrl=%2F%3Fstatus%3Dfailed",
    );
  });

  it("omits the parameter when there is nowhere specific to return", () => {
    expect(loginUrlReturningTo("/")).toBe("/login");
  });

  it("never echoes a rejected destination back into the url", () => {
    expect(loginUrlReturningTo("https://evil.example")).toBe("/login");
  });
});
