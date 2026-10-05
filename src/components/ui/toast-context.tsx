"use client";

import {
  createContext,
  useMemo,
  useContext,
  useState,
  useCallback,
} from "react";
import dayjs from "dayjs";

type Toast = {
  id: number;
  message: string;
  isClosing: boolean;
};

type ToastContextType = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

const baseClasses =
  "rounded-md border bg-green-100 px-4 py-3 text-black shadow-2xl";

  export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string) => {
    const id = dayjs().valueOf();

    setToasts((current) => [
      ...current,
      {
        id,
        message,
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
      }, 100);
    }, 3000);
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
          return (
            <div
              key={toast.id}
              className={`${baseClasses} ${
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
