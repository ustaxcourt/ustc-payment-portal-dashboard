import type { TransactionTab, ViewTab } from "./types";

export const TAB_LABEL: Record<ViewTab, string> = {
  all: "All",
  success: "Successful",
  failed: "Failed",
  pending: "Pending",
  search: "Search",
};

export const TAB_TONE: Record<TransactionTab, string> = {
  all: "bg-slate-200 text-slate-900",
  success: "bg-green-200 text-green-900",
  failed: "bg-red-200 text-red-900",
  pending: "bg-amber-200 text-amber-900",
};

export const TAB_HEADER_TONE: Record<TransactionTab, string> = {
  all: "bg-slate-50",
  success: "bg-green-50",
  failed: "bg-red-50",
  pending: "bg-amber-50",
};
