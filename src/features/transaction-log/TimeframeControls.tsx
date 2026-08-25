"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type AppliedDateRange,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  fromDatePickerValue,
  getCustomRangeValidationError,
  getCourtCalendarDate,
  MIN_CUSTOM_RANGE_YEAR,
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
  /** Server-confirmed start of the shown window, e.g. "Aug 22, 2026". */
  appliedDate?: string | null;
  onSelectPreset: (preset: Exclude<DateRangePreset, "custom">) => void;
  onApplyCustom: (from: string, to: string) => void;
};

export default function TimeframeControls({
  appliedRange,
  appliedDate,
  onSelectPreset,
  onApplyCustom,
}: Props) {
  const requestedFrom = appliedRange.requestedFrom ?? appliedRange.from;
  const requestedTo = appliedRange.requestedTo ?? appliedRange.to;
  const courtToday = getCourtCalendarDate();
  const minDate = `${MIN_CUSTOM_RANGE_YEAR}-01-01`;
  const maxDate = `${courtToday.getUTCFullYear()}-${String(
    courtToday.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(courtToday.getUTCDate()).padStart(2, "0")}`;
  const [isCustomOpen, setIsCustomOpen] = useState(appliedRange.preset === "custom");
  const [draftFrom, setDraftFrom] = useState(toDatePickerValue(requestedFrom));
  const [draftTo, setDraftTo] = useState(toDatePickerValue(requestedTo));
  const [error, setError] = useState<string | null>(null);

  const errorId = "timeframe-date-error";

  useEffect(() => {
    const isCustomPreset = appliedRange.preset === "custom";

    setIsCustomOpen(isCustomPreset);

    if (isCustomPreset) {
      setDraftFrom(toDatePickerValue(requestedFrom));
      setDraftTo(toDatePickerValue(requestedTo));
    }

    setError(null);
  }, [appliedRange.preset, requestedFrom, requestedTo]);

  const openCustomEditor = () => {
    setIsCustomOpen(true);
    setDraftFrom(toDatePickerValue(requestedFrom));
    setDraftTo(toDatePickerValue(requestedTo));
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

    const validationError = getCustomRangeValidationError(
      formattedFrom,
      formattedTo,
      courtToday,
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onApplyCustom(formattedFrom, formattedTo);
  };

  return (
    <div className="py-1">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-40">
          <p className="text-sm font-medium">Timeframe</p>
          <p className="text-sm text-muted-foreground">
            {appliedRange.label}
            {appliedDate ? ` – ${appliedDate}` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_RANGE_PRESETS.map((preset) => {
            const isCustom = preset === "custom";
            const isSelected = isCustom
              ? isCustomOpen
              : !isCustomOpen && appliedRange.preset === preset;

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

        {isCustomOpen ? (
          <div className="flex flex-wrap items-center gap-3 self-stretch border-l pl-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <span>From</span>
              <input
                type="date"
                value={draftFrom}
                min={minDate}
                max={maxDate}
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
                aria-describedby={error ? errorId : undefined}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <span>To</span>
              <input
                type="date"
                value={draftTo}
                min={minDate}
                max={maxDate}
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
                aria-describedby={error ? errorId : undefined}
              />
            </label>
            <Button type="button" size="sm" onClick={applyCustomRange}>
              Apply
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
