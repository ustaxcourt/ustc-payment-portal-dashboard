"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLabel } from "@/lib/format";
import { getColumns } from "./columns";
import TransactionTable from "./TransactionTable";
import {
  FEE_TYPE_LABEL,
  FEE_TYPES,
  type FeeType,
  PAY_TYPES,
  PAYMENT_STATUSES,
  type PaymentStatus,
  type PayType,
  TRANSACTION_STATUSES,
  type TransactionLogEntry,
  type TransactionSorting,
  type TransactionStatus,
} from "./types";

type Props = {
  feeType: FeeType | null;
  payType: PayType | null;
  paymentStatus: PaymentStatus | null;
  transactionStatus: TransactionStatus | null;
  onFeeTypeChange: (value: FeeType | null) => void;
  onPayTypeChange: (value: PayType | null) => void;
  onPaymentStatusChange: (value: PaymentStatus | null) => void;
  onTransactionStatusChange: (value: TransactionStatus | null) => void;
  rows: TransactionLogEntry[];
  sorting: TransactionSorting;
  onSortingChange: (next: TransactionSorting) => void;
  emptyMessage: string;
};

export default function TransactionSearch({
  feeType,
  payType,
  paymentStatus,
  transactionStatus,
  onFeeTypeChange,
  onPayTypeChange,
  onPaymentStatusChange,
  onTransactionStatusChange,
  rows,
  sorting,
  onSortingChange,
  emptyMessage,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-y-6 rounded-md border bg-background p-4 lg:grid-cols-2 lg:gap-y-0 lg:divide-x">
        <div className="lg:pr-6">
          <h3 className="text-sm font-semibold">Filter by Type</h3>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="search-fee-type">Fee Type</Label>
              <Select
                value={feeType}
                onValueChange={(value) => onFeeTypeChange(value as FeeType)}
              >
                <SelectTrigger id="search-fee-type" className="w-full">
                  <SelectValue placeholder="- Select -" />
                </SelectTrigger>
                <SelectContent>
                  {FEE_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {FEE_TYPE_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="search-pay-type">Pay Type</Label>
              <Select
                value={payType}
                onValueChange={(value) => onPayTypeChange(value as PayType)}
              >
                <SelectTrigger id="search-pay-type" className="w-full">
                  <SelectValue placeholder="- Select -" />
                </SelectTrigger>
                <SelectContent>
                  {PAY_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="search-payment-status">Payment Status</Label>
              <Select
                value={paymentStatus}
                onValueChange={(value) =>
                  onPaymentStatusChange(value as PaymentStatus)
                }
              >
                <SelectTrigger id="search-payment-status" className="w-full">
                  <SelectValue placeholder="- Select -" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="search-transaction-status">
                Transaction Status
              </Label>
              <Select
                value={transactionStatus}
                onValueChange={(value) =>
                  onTransactionStatusChange(value as TransactionStatus)
                }
              >
                <SelectTrigger
                  id="search-transaction-status"
                  className="w-full"
                >
                  <SelectValue placeholder="- Select -" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 lg:border-t-0 lg:pt-0 lg:pl-6" />
      </div>

      <TransactionTable
        rows={rows}
        columns={getColumns("all")}
        caption="Transaction log, Search results"
        headerTone="bg-slate-50"
        sorting={sorting}
        onSortingChange={onSortingChange}
        emptyMessage={emptyMessage}
        wrapperClassName="max-h-[60vh] overflow-auto rounded-md border"
      />
    </div>
  );
}
