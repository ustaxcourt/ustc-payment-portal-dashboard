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
import {
  COLUMN_IDS,
  COLUMN_LABEL,
  type ColumnVisibility,
  DEFAULT_COLUMN_VISIBILITY,
  isMetadataColumnId,
  type TransactionColumnId,
  withSearchedColumns,
} from "./columns";

const COLUMN_GROUPS: { legend: string; ids: TransactionColumnId[] }[] = [
  {
    legend: "Transaction",
    ids: COLUMN_IDS.filter((id) => !isMetadataColumnId(id)),
  },
  { legend: "Metadata", ids: COLUMN_IDS.filter(isMetadataColumnId) },
];

const LAST_COLUMN_HINT = "At least one column must stay visible";
const SEARCHED_COLUMN_HINT = "Shown while you're searching by this column";

export default function ColumnPicker({
  visibility,
  searchedIds,
  onToggle,
  onReset,
}: {
  visibility: ColumnVisibility;
  searchedIds: readonly TransactionColumnId[];
  onToggle: (id: TransactionColumnId, visible: boolean) => void;
  onReset: () => void;
}) {
  const lastColumnHintId = useId();
  const searchedColumnHintId = useId();
  const shownVisibility = withSearchedColumns(visibility, searchedIds);
  const chosenCount = COLUMN_IDS.filter((id) => visibility[id]).length;
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
              const isChecked = shownVisibility[id];
              const isSearched = searchedIds.includes(id);
              const isLastVisible = visibility[id] && chosenCount === 1;
              const hint = isSearched
                ? { id: searchedColumnHintId, text: SEARCHED_COLUMN_HINT }
                : isLastVisible
                  ? { id: lastColumnHintId, text: LAST_COLUMN_HINT }
                  : null;
              return (
                <Label
                  key={id}
                  title={hint?.text}
                  className="cursor-pointer font-normal leading-normal has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60"
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={hint !== null}
                    aria-describedby={hint?.id}
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
        <p id={searchedColumnHintId} className="sr-only">
          {SEARCHED_COLUMN_HINT}
        </p>
      </PopoverContent>
    </Popover>
  );
}
