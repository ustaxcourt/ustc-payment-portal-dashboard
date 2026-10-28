import type { PaymentStatus } from "./types";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  success: "Successful",
  failed: "Failed",
  pending: "Pending",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, string> = {
  success: "bg-status-success text-status-success-foreground",
  failed: "bg-status-failed text-status-failed-foreground",
  pending: "bg-status-pending text-status-pending-foreground",
};

/** Text-only variant for the Payment Status filter labels (radio group). */
export const PAYMENT_STATUS_TEXT_TONE = {
  success: "text-status-success-foreground",
  failed: "text-status-failed-foreground",
  pending: "text-status-pending-foreground",
} satisfies Record<PaymentStatus, string>;

export const RADIO_STATUS_TEXT_TONE = {
  success: "text-radio-success-foreground",
  failed: "text-radio-failed-foreground",
  pending: "text-radio-pending-foreground",
} satisfies Record<PaymentStatus, string>;
