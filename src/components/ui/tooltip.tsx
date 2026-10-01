"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger


function TooltipPopup({
  className,
  side = "top",
  sideOffset = 6,
  ...props
}: TooltipPrimitive.Popup.Props & {
  side?: TooltipPrimitive.Positioner.Props["side"]
  sideOffset?: number
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-popup"
          className={cn(
            "z-50 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0",
            className
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipPopup }
