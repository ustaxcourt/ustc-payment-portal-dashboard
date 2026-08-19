"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TransactionSearchTable from "./TransactionSearchTable";
import {
  FEE_TYPE_LABEL,
  FEE_TYPES,
  LOOKUP_TYPE_LABEL,
  LOOKUP_TYPES,
  PAY_TYPES,
  type FeeType,
  type LookupType,
  type PayType,
  type TransactionLogEntry,
  type TransactionSorting,
} from "./types";

type Props = {
  feeType: FeeType | null;
  payType: PayType | null;
  lookupType: LookupType;
  lookupValue: string | null;
  onFeeTypeChange: (value: FeeType | null) => void;
  onPayTypeChange: (value: PayType | null) => void;
  onLookupTypeChange: (value: LookupType) => void;
  onLookupValueChange: (value: string | null) => void;
  onClear: () => void;
  rows: TransactionLogEntry[];
  sorting: TransactionSorting;
  onSortingChange: (next: TransactionSorting) => void;
  emptyMessage: string;
};

export default function TransactionSearch({
  feeType,
  payType,
  lookupType,
  lookupValue,
  onFeeTypeChange,
  onPayTypeChange,
  onLookupTypeChange,
  onLookupValueChange,
  onClear,
  rows,
  sorting,
  onSortingChange,
  emptyMessage,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-6 rounded-md border bg-background p-4 lg:grid-cols-2 lg:divide-x">
        <div>
          <h3 className="text-sm font-semibold">Filter by Type</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
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
            <div className="flex flex-1 flex-col gap-1.5">
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

        <div className="flex flex-col gap-3 border-t pt-4 lg:border-t-0 lg:pt-0 lg:pl-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold">Direct Lookup</h3>
                <RadioGroup
                  className="mt-2 flex flex-row gap-4"
                  value={lookupType}
                  onValueChange={(value) =>
                    onLookupTypeChange(value as LookupType)
                  }
                >
                  {LOOKUP_TYPES.map((option) => (
                    <Label
                      key={option}
                      htmlFor={`search-lookup-${option}`}
                      className="flex items-center gap-2 font-normal"
                    >
                      <RadioGroupItem
                        id={`search-lookup-${option}`}
                        value={option}
                      />
                      {LOOKUP_TYPE_LABEL[option]}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <Input
                aria-label={LOOKUP_TYPE_LABEL[lookupType]}
                value={lookupValue ?? ""}
                onChange={(event) =>
                  onLookupValueChange(event.target.value || null)
                }
                placeholder={LOOKUP_TYPE_LABEL[lookupType]}
              />
            </div>
            <Button type="button" variant="outline" onClick={onClear}>
              Clear Search
            </Button>
          </div>
        </div>
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
