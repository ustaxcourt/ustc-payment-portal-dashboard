import type { TransactionTab } from "./types";

export const TAB_LABEL: Record<TransactionTab, string> = {
  all: "All",
  success: "Successful",
  failed: "Failed",
  pending: "Pending",
};

export const TAB_TONE: Record<TransactionTab, string> = {
  all: "bg-slate-200 text-slate-900",
  success: "bg-green-200 text-green-900",
  failed: "bg-red-200 text-red-900",
  pending: "bg-amber-200 text-amber-900",
};
