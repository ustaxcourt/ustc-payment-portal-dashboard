"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ShareViewButton() {
const [copied, setCopied] = useState(false);
const [tooltipOpen, setTooltipOpen] = useState(false);

const copyCurrentUrl = async () => {
  await navigator.clipboard.writeText(window.location.href);

  setCopied(true);
  setTooltipOpen(true);

  window.setTimeout(() => {
    setCopied(false);
    setTooltipOpen(false);
  }, 2000);
};

  return (
    <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
      <TooltipTrigger
        type="button"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => !copied && setTooltipOpen(false)}
        onClick={() => void copyCurrentUrl()}
        aria-label="Share View"
        className="
          flex h-8 w-8 items-center justify-center
          rounded-sm
          bg-slate-300
          text-slate-700
          hover:bg-slate-400
        "
      >
        <Link2 className="h-5 w-5" />
      </TooltipTrigger>

      <TooltipContent
        side="top"
        sideOffset={8}
        className="
          bg-white
          text-slate-900
          border
          border-slate-200
          shadow-md
          rounded-xl
          px-4
          py-2
          text-base
          font-medium
        "
      >
        {copied ? "Link copied to clipboard" : "Share View"}
      </TooltipContent>
    </Tooltip>
  );
}
