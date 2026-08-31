import type { TransactionTab, ViewTab } from "./types";

export const TAB_LABEL: Record<ViewTab, string> = {
  all: "All",
  success: "Successful",
  failed: "Failed",
  pending: "Pending",
  search: "Search",
};

export const TAB_TONE: Record<TransactionTab, string> = {
  all: "bg-status-neutral text-status-neutral-foreground",
  success: "bg-status-success text-status-success-foreground",
  failed: "bg-status-failed text-status-failed-foreground",
  pending: "bg-status-pending text-status-pending-foreground",
};

export const TAB_HEADER_TONE: Record<TransactionTab, string> = {
  all: "bg-status-neutral-subtle",
  success: "bg-status-success-subtle",
  failed: "bg-status-failed-subtle",
  pending: "bg-status-pending-subtle",
};
