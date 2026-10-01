import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LAST_ACTIVITY_STORAGE_KEY,
  LOGOUT_SIGNAL_STORAGE_KEY,
} from "./session";
import {
  broadcastLogout,
  clearSessionMarkers,
  readLastActivity,
  writeLastActivity,
} from "./sessionStorage";

describe("sessionStorage markers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null when no activity has been recorded", () => {
    expect(readLastActivity()).toBeNull();
  });

  it("round-trips a timestamp", () => {
    writeLastActivity(1_700_000_000_000);
    expect(readLastActivity()).toBe(1_700_000_000_000);
  });

  it("treats an unparseable stored value as no activity", () => {
    window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, "not-a-number");
    expect(readLastActivity()).toBeNull();
  });

  it("clears both markers together so neither outlives the session", () => {
    writeLastActivity(Date.now());
    window.localStorage.setItem(LOGOUT_SIGNAL_STORAGE_KEY, "123");

    clearSessionMarkers();

    expect(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(LOGOUT_SIGNAL_STORAGE_KEY)).toBeNull();
  });

  it("drops the clock before raising the logout signal", () => {
    writeLastActivity(Date.now());

    broadcastLogout();

    expect(readLastActivity()).toBeNull();
    expect(
      window.localStorage.getItem(LOGOUT_SIGNAL_STORAGE_KEY),
    ).not.toBeNull();
  });

  it("degrades quietly when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => writeLastActivity(Date.now())).not.toThrow();
    expect(readLastActivity()).toBeNull();
  });
});
