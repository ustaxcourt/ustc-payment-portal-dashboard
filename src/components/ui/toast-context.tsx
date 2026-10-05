"use client";

import {
  createContext,
  useMemo,
  useContext,
  useState,
} from "react";
import dayjs from "dayjs";

type Toast = {
  id: number;
  message: string;
};

type ToastContextType = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string) => {
    const id = dayjs().valueOf();

    setToasts((current) => [...current, { id, message }]);

    window.setTimeout(() => {
      setToasts((current) =>
        current.filter((toast) => toast.id !== id),
      );
    }, 3000);
  };

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
              className="rounded-md bg-green-100 px-4 py-3 text-black border-1 shadow-2xl"
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
