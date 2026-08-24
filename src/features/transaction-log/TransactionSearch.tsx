"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TransactionSearchTable from "./TransactionSearchTable";
import {
  FEE_TYPES,
  FEE_TYPE_LABEL,
  PAY_TYPES,
  type FeeType,
  type PayType,
  type TransactionLogEntry,
  type TransactionSorting,
} from "./types";

type Props = {
  feeType: FeeType | null;
  payType: PayType | null;
  onFeeTypeChange: (value: FeeType | null) => void;
  onPayTypeChange: (value: PayType | null) => void;
  rows: TransactionLogEntry[];
  sorting: TransactionSorting;
  onSortingChange: (next: TransactionSorting) => void;
  emptyMessage: string;
};

export default function TransactionSearch({
  feeType,
  payType,
  onFeeTypeChange,
  onPayTypeChange,
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
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 lg:border-t-0 lg:pt-0 lg:pl-6" />
      </div>

      <TransactionSearchTable
        rows={rows}
        sorting={sorting}
        onSortingChange={onSortingChange}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
