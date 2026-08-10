"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type AppliedDateRange,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  fromDatePickerValue,
  parseInputDate,
  toDatePickerValue,
} from "./dateRange";

const PRESET_COPY: Record<DateRangePreset, string> = {
  today: "Today",
  last7: "Last 7 days",
  monthToDate: "Month to date",
  custom: "Custom range",
};

type Props = {
  appliedRange: AppliedDateRange;
  onSelectPreset: (preset: Exclude<DateRangePreset, "custom">) => void;
  onApplyCustom: (from: string, to: string) => void;
};

export default function TimeframeControls({
  appliedRange,
  onSelectPreset,
  onApplyCustom,
}: Props) {
  const [isCustomOpen, setIsCustomOpen] = useState(appliedRange.preset === "custom");
  const [draftFrom, setDraftFrom] = useState(toDatePickerValue(appliedRange.from));
  const [draftTo, setDraftTo] = useState(toDatePickerValue(appliedRange.to));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appliedRange.preset === "custom") {
      setIsCustomOpen(true);
      setDraftFrom(toDatePickerValue(appliedRange.from));
      setDraftTo(toDatePickerValue(appliedRange.to));
      setError(null);
    }
  }, [appliedRange.from, appliedRange.preset, appliedRange.to]);

  const openCustomEditor = () => {
    setIsCustomOpen(true);
    setDraftFrom(toDatePickerValue(appliedRange.from));
    setDraftTo(toDatePickerValue(appliedRange.to));
    setError(null);
  };

  const applyCustomRange = () => {
    if (!draftFrom || !draftTo) {
      setError("Enter both From and To dates.");
      return;
    }

    const formattedFrom = fromDatePickerValue(draftFrom);
    const formattedTo = fromDatePickerValue(draftTo);

    if (!formattedFrom || !formattedTo) {
      setError("Dates must be valid.");
      return;
    }

    const parsedFrom = parseInputDate(formattedFrom);
    const parsedTo = parseInputDate(formattedTo);

    if (!parsedFrom || !parsedTo) {
      setError("Dates must be valid.");
      return;
    }

    if (parsedFrom >= parsedTo) {
      setError("The From date must be before the To date.");
      return;
    }

    setError(null);
    onApplyCustom(formattedFrom, formattedTo);
  };

  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium">Timeframe</p>
          <p className="text-sm text-muted-foreground">{appliedRange.label}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_RANGE_PRESETS.map((preset) => {
            const isCustom = preset === "custom";
            const isSelected = isCustom
              ? isCustomOpen
              : appliedRange.preset === preset;

            return (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => {
                  if (isCustom) {
                    openCustomEditor();
                    return;
                  }

                  setIsCustomOpen(false);
                  setError(null);
                  onSelectPreset(preset);
                }}
              >
                {PRESET_COPY[preset]}
              </Button>
            );
          })}
        </div>
      </div>

      {isCustomOpen ? (
        <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium">
            <span>From</span>
            <input
              type="date"
              value={draftFrom}
              onChange={(event) => {
                setDraftFrom(event.target.value);
                setError(null);
              }}
              className={cn(
                "h-9 rounded-md border bg-background px-3 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                error ? "border-destructive" : "border-border",
              )}
              aria-invalid={Boolean(error)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            <span>To</span>
            <input
              type="date"
              value={draftTo}
              onChange={(event) => {
                setDraftTo(event.target.value);
                setError(null);
              }}
              className={cn(
                "h-9 rounded-md border bg-background px-3 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                error ? "border-destructive" : "border-border",
              )}
              aria-invalid={Boolean(error)}
            />
          </label>
          <Button type="button" onClick={applyCustomRange}>
            Apply
          </Button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
