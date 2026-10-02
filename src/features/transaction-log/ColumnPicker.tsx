"use client";

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
import {
  COLUMN_IDS,
  COLUMN_LABEL,
  type ColumnVisibility,
  DEFAULT_COLUMN_VISIBILITY,
  isMetadataColumnId,
  type TransactionColumnId,
} from "./columns";

const COLUMN_GROUPS: { legend: string; ids: TransactionColumnId[] }[] = [
  {
    legend: "Transaction",
    ids: COLUMN_IDS.filter((id) => !isMetadataColumnId(id)),
  },
  { legend: "Metadata", ids: COLUMN_IDS.filter(isMetadataColumnId) },
];

export default function ColumnPicker({
  visibility,
  onVisibilityChange,
  onReset,
}: {
  visibility: ColumnVisibility;
  onVisibilityChange: (next: ColumnVisibility) => void;
  onReset: () => void;
}) {
  const visibleCount = COLUMN_IDS.filter((id) => visibility[id]).length;
  const isDefault = COLUMN_IDS.every(
    (id) => visibility[id] === DEFAULT_COLUMN_VISIBILITY[id],
  );

  return (
    <Popover>
      <PopoverTrigger
        render={<IconButton icon="columns" label="Select columns" />}
      />
      <PopoverContent
        align="end"
        className="max-h-[min(32rem,var(--available-height))] w-64 overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2">
          <PopoverTitle className="text-sm font-semibold">
            Visible columns
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
              const isChecked = visibility[id];
              const isLastVisible = isChecked && visibleCount === 1;
              return (
                <Label
                  key={id}
                  className="cursor-pointer font-normal leading-normal has-data-disabled:cursor-not-allowed"
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isLastVisible}
                    onCheckedChange={(checked) =>
                      onVisibilityChange({ ...visibility, [id]: checked })
                    }
                  />
                  <span>{COLUMN_LABEL[id]}</span>
                </Label>
              );
            })}
          </fieldset>
        ))}
      </PopoverContent>
    </Popover>
  );
}
