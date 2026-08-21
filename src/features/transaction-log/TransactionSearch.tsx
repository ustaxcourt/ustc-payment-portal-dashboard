"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
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
  FEE_TYPES,
  FEE_TYPE_LABEL,
  LOOKUP_TYPES,
  LOOKUP_TYPE_LABEL,
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
  rows,
  sorting,
  onSortingChange,
  emptyMessage,
}: Props) {
  // Neither the lookup type nor the typed value searches on its own — both
  // are only committed (and the query fires) on submit, so switching
  // Account Holder/Agency ID or typing doesn't re-run the search by itself.
  const [draftLookupType, setDraftLookupType] = useState(lookupType);
  const [draftLookupValue, setDraftLookupValue] = useState(lookupValue ?? "");

  useEffect(() => {
    setDraftLookupType(lookupType);
  }, [lookupType]);

  useEffect(() => {
    setDraftLookupValue(lookupValue ?? "");
  }, [lookupValue]);

  const submitLookup = () => {
    onLookupTypeChange(draftLookupType);
    onLookupValueChange(draftLookupValue.trim() || null);
  };

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

        <div className="flex flex-col gap-3 border-t pt-4 lg:border-t-0 lg:pt-0 lg:pl-6">
          <h3 className="text-sm font-semibold">Direct Lookup</h3>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Lookup Type</p>
            <RadioGroup
              className="flex flex-col gap-2"
              value={draftLookupType}
              onValueChange={(value) =>
                setDraftLookupType(value as LookupType)
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
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitLookup();
            }}
          >
            <div className="relative flex-1">
              <Input
                aria-label={LOOKUP_TYPE_LABEL[draftLookupType]}
                value={draftLookupValue}
                onChange={(event) =>
                  setDraftLookupValue(event.target.value)
                }
                placeholder={LOOKUP_TYPE_LABEL[draftLookupType]}
                className={draftLookupValue ? "pr-7" : undefined}
              />
              {draftLookupValue ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Clear search text"
                  className="-translate-y-1/2 absolute top-1/2 right-1"
                  onClick={() => setDraftLookupValue("")}
                >
                  <X />
                </Button>
              ) : null}
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
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
