"use client";

import { formatCourtDate } from "@/lib/format";
import ExportButton from "./ExportButton";
import TimeframeControls from "./TimeframeControls";
import { useTransactionLog } from "./useTransactionLog";
import { useTransactionLogParams } from "./useTransactionLogParams";

export default function TimeframeBar() {
  const { setParams, appliedRange, activeSorting, searchFilters } =
    useTransactionLogParams();
  // Same arguments as TransactionLog, so both subscribe to one cached query.
  const { data } = useTransactionLog(appliedRange, activeSorting, searchFilters);

  return (
    // Band ≈ half the header's height (PO-approved); pairs with TimeframeControls' py-1.
    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted px-6 py-2 sm:px-8">
      <TimeframeControls
        appliedRange={appliedRange}
        appliedDate={data ? formatCourtDate(data.from) : null}
        onSelectPreset={(preset) =>
          setParams({ from: null, range: preset, to: null })
        }
        onApplyCustom={(from, to) => setParams({ from, range: "custom", to })}
      />
      <ExportButton
        tab={searchFilters.paymentStatus ?? "all"}
        range={appliedRange}
        sorting={activeSorting}
        disabled={!data || data.data.length === 0}
      />
    </div>
  );
}
