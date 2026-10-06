"use client";

import {
  createContext,
  useMemo,
  useContext,
  useState,
  useCallback,
} from "react";

type Toast = {
  id: string;
  message: string;
  variant: "success" | "error";
  isClosing: boolean;
};

type ToastContextType = {
  showToast: (
    message: string,
    variant?: "success" | "error",
  ) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);
const TOAST_DISPLAY_DURATION = 3000; // 3 seconds
const TOAST_ANIMATION_DURATION = 300; // 0.3 seconds

const baseClasses =
  "rounded-md border px-4 py-3 shadow-2xl";

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (
      message: string,
      variant: "success" | "error" = "success",
    ) => {
      const id = crypto.randomUUID();

      setToasts((current) => [
        ...current,
        {
          id,
          message,
          variant,
          isClosing: false,
        },
      ]);

    // Wait for toast display duration
    window.setTimeout(() => {
      // Start closing animation
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? { ...toast, isClosing: true }
            : toast,
        ),
      );

      // Remove after animation completes
      window.setTimeout(() => {
        setToasts((current) =>
          current.filter((toast) => toast.id !== id),
        );
      }, TOAST_ANIMATION_DURATION);
    }, TOAST_DISPLAY_DURATION);
  }, []);


  const contextValue = useMemo(
    () => ({ showToast }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-24 right-4 z-[99999] flex flex-col gap-2"
      >
        {toasts.map((toast) => {
          const variantClasses =
            toast.variant === "error"
              ? "border-red-300 bg-red-100 text-red-900"
              : "border-green-300 bg-green-100 text-green-900";

          return (
            <div
              key={toast.id}
              className={`${baseClasses} ${variantClasses} ${
                toast.isClosing
                  ? "animate-out fade-out slide-out-to-bottom-2 duration-300"
                  : "animate-in fade-in slide-in-from-bottom-2 duration-300"
              }`}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast must be used within ToastProvider",
    );
  }

  return context;
}
