import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IDLE_LOGOUT_TIMEOUT_MS,
  LAST_ACTIVITY_STORAGE_KEY,
  LOGOUT_SIGNAL_STORAGE_KEY,
} from "@/lib/session";
import { readLastActivity } from "@/lib/sessionStorage";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useIdleLogout } from "./useIdleLogout";

type Status = "loading" | "authenticated" | "unauthenticated";

const MINUTE = 60 * 1000;
const replace = vi.fn();
const update = vi.fn();

const setStatus = (status: Status) => {
  vi.mocked(useSession).mockReturnValue({ status, update } as never);
};

const seedClock = (agoMs: number) => {
  window.localStorage.setItem(
    LAST_ACTIVITY_STORAGE_KEY,
    String(Date.now() - agoMs),
  );
};

const signIn = () => {
  setStatus("loading");
  const view = renderHook(() => useIdleLogout());

  setStatus("authenticated");
  act(() => {
    view.rerender();
  });

  return view;
};

describe("useIdleLogout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    replace.mockClear();
    vi.mocked(signOut).mockClear();
    vi.mocked(useRouter).mockReturnValue({ replace } as never);
    vi.mocked(usePathname).mockReturnValue("/");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("a stale clock never outlives its session", () => {
    it("starts a full idle window on sign-in despite a stale clock", () => {
      seedClock(10 * MINUTE);

      signIn();

      expect(readLastActivity()).toBe(Date.now());

      act(() => {
        vi.advanceTimersByTime(6 * MINUTE);
      });
      expect(signOut).not.toHaveBeenCalled();
    });

    it("seeds a fresh clock when the first render is already authenticated", () => {
      seedClock(30 * MINUTE);

      setStatus("authenticated");
      renderHook(() => useIdleLogout());

      expect(readLastActivity()).toBe(Date.now());

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(signOut).not.toHaveBeenCalled();
    });

    it("clears a lingering logout signal on sign-in", () => {
      window.localStorage.setItem(LOGOUT_SIGNAL_STORAGE_KEY, "1");

      signIn();

      expect(
        window.localStorage.getItem(LOGOUT_SIGNAL_STORAGE_KEY),
      ).toBeNull();
      expect(readLastActivity()).toBe(Date.now());
    });

    it("reseeds the clock when a sibling tab clears it mid-session", () => {
      setStatus("authenticated");
      const view = renderHook(() => useIdleLogout());

      window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);

      setStatus("loading");
      act(() => {
        view.rerender();
      });
      setStatus("authenticated");
      act(() => {
        view.rerender();
      });

      expect(readLastActivity()).not.toBeNull();
    });

    it("clears stale markers on a signed-out page load", () => {
      seedClock(0);
      window.localStorage.setItem(LOGOUT_SIGNAL_STORAGE_KEY, "1");

      setStatus("loading");
      const view = renderHook(() => useIdleLogout());

      setStatus("unauthenticated");
      act(() => {
        view.rerender();
      });

      expect(window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY)).toBeNull();
      expect(
        window.localStorage.getItem(LOGOUT_SIGNAL_STORAGE_KEY),
      ).toBeNull();
    });
  });

  describe("idle timeout", () => {
    it("signs out after genuine inactivity", () => {
      signIn();

      act(() => {
        vi.advanceTimersByTime(IDLE_LOGOUT_TIMEOUT_MS + 1000);
      });

      expect(signOut).toHaveBeenCalledWith({
        callbackUrl: "/api/auth/federated-logout",
      });
    });

    it("does not sign out one minute before the timeout", () => {
      signIn();

      act(() => {
        vi.advanceTimersByTime(IDLE_LOGOUT_TIMEOUT_MS - MINUTE);
      });

      expect(signOut).not.toHaveBeenCalled();
    });

    it("extends the window while the user is active", () => {
      signIn();

      for (
        let elapsed = 0;
        elapsed < IDLE_LOGOUT_TIMEOUT_MS * 2;
        elapsed += MINUTE
      ) {
        act(() => {
          vi.advanceTimersByTime(MINUTE);
          window.dispatchEvent(new Event("keydown"));
        });
      }

      expect(signOut).not.toHaveBeenCalled();
    });

    it("throttles activity writes so mousemove cannot storm storage", () => {
      signIn();

      const setItem = vi.spyOn(Storage.prototype, "setItem");
      act(() => {
        for (let index = 0; index < 200; index += 1) {
          window.dispatchEvent(new Event("mousemove"));
        }
      });

      expect(setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe("sibling tabs", () => {
    it("signs out when another tab broadcasts a logout", () => {
      signIn();

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: LOGOUT_SIGNAL_STORAGE_KEY,
            newValue: String(Date.now()),
          }),
        );
      });

      expect(signOut).toHaveBeenCalledWith({ redirect: false });
    });

    it("ignores another tab clearing the logout signal", () => {
      signIn();

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: LOGOUT_SIGNAL_STORAGE_KEY,
            newValue: null,
          }),
        );
      });

      expect(signOut).not.toHaveBeenCalled();
    });

    it("signs out only once when both tab and timer fire", () => {
      signIn();

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: LOGOUT_SIGNAL_STORAGE_KEY,
            newValue: String(Date.now()),
          }),
        );
        vi.advanceTimersByTime(IDLE_LOGOUT_TIMEOUT_MS + 1000);
      });

      expect(signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe("routing", () => {
    it("sends a signed-out visitor to the login page", () => {
      vi.mocked(usePathname).mockReturnValue("/dashboard");
      setStatus("unauthenticated");
      renderHook(() => useIdleLogout());

      expect(replace).toHaveBeenCalledWith("/login");
    });

    it("sends a signed-in visitor off the login page", () => {
      vi.mocked(usePathname).mockReturnValue("/login");
      signIn();

      expect(replace).toHaveBeenCalledWith("/");
    });

    it("does not redirect while the session is still loading", () => {
      vi.mocked(usePathname).mockReturnValue("/dashboard");
      setStatus("loading");
      renderHook(() => useIdleLogout());

      expect(replace).not.toHaveBeenCalled();
    });
  });
});
