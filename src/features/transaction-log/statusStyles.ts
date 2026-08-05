import type { PaymentStatus } from "./types";

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  success: "Successful",
  failed: "Failed",
  pending: "Pending",
};

export const STATUS_TONE: Record<PaymentStatus, string> = {
  success: "bg-green-200 text-green-900",
  failed: "bg-red-200 text-red-900",
  pending: "bg-amber-200 text-amber-900",
};
