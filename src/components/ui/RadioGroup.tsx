"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/** A labeled radio group for a single filter option, mirroring FilterSelect's shape. */
export default function RadioGroup({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      <RadioGroupPrimitive
        value={value}
        onValueChange={(next) => onChange(String(next))}
        className="flex flex-col gap-2"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 text-sm select-none"
          >
            <Radio.Root
              value={option.value}
              className="flex size-4 items-center justify-center rounded-full border border-input outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[checked]:border-primary data-[checked]:bg-primary"
            >
              <Radio.Indicator className="size-1.5 rounded-full bg-primary-foreground" />
            </Radio.Root>
            {option.label}
          </label>
        ))}
      </RadioGroupPrimitive>
    </div>
  );
}
