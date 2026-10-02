"use client";

import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/** A labeled Select for a single filter option, meant to be mapped over a filter config. */
export default function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  triggerClassName,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  triggerClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => onChange(next ?? value)}
      >
        <SelectTrigger id={id} className={cn("w-full", triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
