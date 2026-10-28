"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  persistent: boolean;
  isClosing: boolean;
};

type ToastOptions = {
  /** Stays until the user dismisses it, and shows a dismiss button. */
  persistent?: boolean;
};

type ToastContextType = {
  /** Returns the toast's id so a caller can dismiss it later. */
  showToast: (
    message: string,
    variant?: ToastVariant,
    options?: ToastOptions,
  ) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);
const TOAST_DISPLAY_DURATION = 3000; // 3 seconds
const TOAST_ANIMATION_DURATION = 300; // 0.3 seconds

const baseClasses = "rounded-md border px-4 py-3 shadow-2xl";

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  error:
    "border-status-failed-foreground bg-status-failed text-status-failed-foreground",
  success:
    "border-status-success-foreground bg-status-success text-status-success-foreground",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const timers = useRef(
    new Map<string, { auto?: number; remove?: number }>(),
  );

  useEffect(() => {
    const live = timers.current;
    return () => {
      for (const { auto, remove } of live.values()) {
        window.clearTimeout(auto);
        window.clearTimeout(remove);
      }
      live.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const entry = timers.current.get(id);
    if (!entry || entry.remove !== undefined) return;
    window.clearTimeout(entry.auto);

    // Start closing animation
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, isClosing: true } : toast,
      ),
    );

    // Remove after animation completes
    entry.remove = window.setTimeout(() => {
      timers.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_ANIMATION_DURATION);
  }, []);

  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = "success",
      { persistent = false }: ToastOptions = {},
    ) => {
      const id = crypto.randomUUID();
      const entry: { auto?: number; remove?: number } = {};
      timers.current.set(id, entry);

      setToasts((current) => [
        ...current,
        { id, message, variant, persistent, isClosing: false },
      ]);

      if (!persistent) {
        entry.auto = window.setTimeout(
          () => dismissToast(id),
          TOAST_DISPLAY_DURATION,
        );
      }

      return id;
    },
    [dismissToast],
  );

  // The container sits after the page in the DOM, so a keyboard user would
  // otherwise tab through everything to reach the dismiss button.
  const hasPersistent = toasts.some(
    (toast) => toast.persistent && !toast.isClosing,
  );
  useEffect(() => {
    if (!hasPersistent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const newest = toasts
        .filter((toast) => toast.persistent && !toast.isClosing)
        .at(-1);
      if (newest) dismissToast(newest.id);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasPersistent, toasts, dismissToast]);

  const contextValue = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* No live attributes here: each toast carries its own role, and a
          polite/atomic parent would re-read or swallow an alert inside it.
          Errors interrupt (the user has to act on them); successes wait. */}
      <div className="fixed top-24 right-4 z-[99999] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.variant === "error" ? "alert" : "status"}
            className={cn(
              baseClasses,
              VARIANT_CLASSES[toast.variant],
              "flex items-start gap-3",
              toast.isClosing
                ? "animate-out fade-out slide-out-to-bottom-2 duration-300"
                : "animate-in fade-in slide-in-from-bottom-2 duration-300",
            )}
          >
            <p className="min-w-0 flex-1">{toast.message}</p>
            {toast.persistent ? (
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(toast.id)}
                className="-m-1 flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-background/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X aria-hidden className="size-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
