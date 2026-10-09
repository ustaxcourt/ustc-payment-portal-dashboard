"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COLUMN_LABEL, type TransactionColumnId } from "./columnLabels";
import {
  COLUMN_IDS,
  type ColumnVisibility,
  isMetadataColumnId,
} from "./columns";

const COLUMN_GROUPS: { legend: string; ids: TransactionColumnId[] }[] = [
  {
    legend: "Transaction",
    ids: COLUMN_IDS.filter((id) => !isMetadataColumnId(id)),
  },
  { legend: "Metadata", ids: COLUMN_IDS.filter(isMetadataColumnId) },
];

const LAST_COLUMN_HINT = "At least one column must stay visible";

export default function ColumnPicker({
  visibility,
  lockedId,
  isDefault,
  onToggle,
  onReset,
}: {
  visibility: ColumnVisibility;
  lockedId: TransactionColumnId | null;
  isDefault: boolean;
  onToggle: (id: TransactionColumnId, visible: boolean) => void;
  defaultVisibility: ColumnVisibility;
  onReset: () => void;
}) {
  const lastColumnHintId = useId();

  return (
    <Popover>
      <PopoverTrigger
        render={<IconButton icon="columns" label="Select columns" />}
      />
      <PopoverContent
        align="end"
        collisionAvoidance={{ fallbackAxisSide: "none" }}
        className="max-h-[min(32rem,var(--available-height))] w-64 overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2">
          <PopoverTitle className="text-sm font-semibold">
            Select columns
          </PopoverTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isDefault}
            onClick={onReset}
          >
            Reset to defaults
          </Button>
        </div>

        {COLUMN_GROUPS.map((group) => (
          <fieldset key={group.legend} className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold text-muted-foreground">
              {group.legend}
            </legend>
            {group.ids.map((id) => {
              const isLocked = id === lockedId;
              return (
                <Label
                  key={id}
                  title={isLocked ? LAST_COLUMN_HINT : undefined}
                  className="cursor-pointer font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60"
                >
                  <Checkbox
                    checked={visibility[id]}
                    disabled={isLocked}
                    aria-describedby={isLocked ? lastColumnHintId : undefined}
                    onCheckedChange={(checked) => onToggle(id, checked)}
                  />
                  <span>{COLUMN_LABEL[id]}</span>
                </Label>
              );
            })}
          </fieldset>
        ))}
        <p id={lastColumnHintId} className="sr-only">
          {LAST_COLUMN_HINT}
        </p>
      </PopoverContent>
    </Popover>
  );
}
