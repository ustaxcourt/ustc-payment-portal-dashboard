"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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

  const dismissToast = useCallback((id: string) => {
    // Start closing animation
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, isClosing: true } : toast,
      ),
    );

    // Remove after animation completes
    window.setTimeout(() => {
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

      setToasts((current) => [
        ...current,
        { id, message, variant, persistent, isClosing: false },
      ]);

      if (!persistent) {
        window.setTimeout(() => dismissToast(id), TOAST_DISPLAY_DURATION);
      }

      return id;
    },
    [dismissToast],
  );

  const contextValue = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-24 right-4 z-[99999] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            // Errors interrupt: the user has to act on them.
            role={toast.variant === "error" ? "alert" : undefined}
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
