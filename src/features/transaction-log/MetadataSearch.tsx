"use client";

import { XIcon } from "lucide-react";
import { type SubmitEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import FilterSelect from "@/components/ui/FilterSelect";
import { Label } from "@/components/ui/label";
import {
  FEE_METADATA_KEYS,
  type FeeType,
  METADATA_KEY_LABEL,
  type MetadataDraft,
  type MetadataKey,
} from "./types";

type Props = {
  feeType: FeeType | null;
  metadataKey: MetadataKey | null;
  metadataValue: string | null;
  onSearch: (key: MetadataKey | null, value: string | null) => void;
  draftCache?: MetadataDraft;
  onDraftChange?: (draft: MetadataDraft) => void;
};

/**
 * Direct-lookup control for the Search tab: pick one metadata key tied to the
 * selected fee, type a value, and commit it on Search / Enter. Remounted by a
 * `key` on the fee type, so drafts reset when the available keys change. A
 * fee with a single metadata key shows a static label; two or more show a
 * dropdown.
 */
export default function MetadataSearch({
  feeType,
  metadataKey,
  metadataValue,
  onSearch,
  draftCache,
  onDraftChange,
}: Props) {
  const keys: readonly MetadataKey[] = feeType ? FEE_METADATA_KEYS[feeType] : [];
  const [selectedKey, setSelectedKeyState] = useState<MetadataKey | null>(
    draftCache
      ? draftCache.key
      : metadataKey && keys.includes(metadataKey)
        ? metadataKey
        : (keys[0] ?? null),
  );
  const [draft, setDraftState] = useState(draftCache?.value ?? metadataValue ?? "");

  const previousMetadataKeyRef = useRef(metadataKey);
  const previousMetadataValueRef = useRef(metadataValue);
  const previousFeeTypeRef = useRef(feeType);
  const clearedByKeyChangeRef = useRef(false);
  if (
    previousMetadataKeyRef.current !== metadataKey ||
    previousMetadataValueRef.current !== metadataValue ||
    previousFeeTypeRef.current !== feeType
  ) {
    previousMetadataKeyRef.current = metadataKey;
    previousMetadataValueRef.current = metadataValue;
    previousFeeTypeRef.current = feeType;
    if (clearedByKeyChangeRef.current) {
      clearedByKeyChangeRef.current = false;
    } else {
      setSelectedKeyState(
        metadataKey && keys.includes(metadataKey) ? metadataKey : (keys[0] ?? null),
      );
      setDraftState(metadataValue ?? "");
    }
  }

  const setSelectedKey = (key: MetadataKey | null) => {
    setSelectedKeyState(key);
    setDraftState("");
    onDraftChange?.({ key, value: "" });
    if (metadataValue) {
      clearedByKeyChangeRef.current = true;
      onSearch(null, null);
    }
  };

  const setDraft = (value: string) => {
    setDraftState(value);
    onDraftChange?.({ key: selectedKey, value });
  };

  if (!feeType) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a Fee Type to enable Search.
      </p>
    );
  }

  const options = keys.map((key) => ({
    value: key,
    label: METADATA_KEY_LABEL[key],
  }));

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedKey) return;
    const trimmed = draft.trim();
    onSearch(trimmed ? selectedKey : null, trimmed || null);
  };

  const clear = () => {
    setDraft("");
    // Only re-query if a value was actually committed; otherwise just wipe the text.
    if (metadataValue) onSearch(null, null);
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This fee has no searchable fields.
        </p>
      ) : keys.length === 1 ? (
        <Label htmlFor="metadata-search-input">
          {METADATA_KEY_LABEL[keys[0]]}
        </Label>
      ) : (
        <FilterSelect
          id="metadata-search-key"
          label="Search by"
          value={selectedKey ?? ""}
          options={options}
          onChange={(value) => setSelectedKey(value as MetadataKey)}
          triggerClassName="bg-background"
        />
      )}

      <div className="flex flex-col gap-2">
        <div className="relative">
          <input
            id="metadata-search-input"
            type="text"
            maxLength={200}
            className="h-8 w-full rounded-lg border border-input bg-background py-2 pr-8 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!selectedKey}
            aria-label={
              selectedKey ? `Search by ${METADATA_KEY_LABEL[selectedKey]}` : "Search"
            }
          />
          {draft ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>
        <Button type="submit" variant="outline" disabled={!selectedKey} className="w-1/3">
          Search
        </Button>
      </div>
    </form>
  );
}
