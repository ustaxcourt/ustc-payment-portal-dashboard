"use client";

import { Tooltip } from "@base-ui/react";
import React, { ReactElement, ReactNode } from "react";

type AppTooltipProps = {
  children: ReactElement;
  content: ReactNode;
};

export function AppTooltip({
  children,
  content,
}: AppTooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={(props) =>
          React.cloneElement(children, props)
        }
      />

      <Tooltip.Portal>
        <Tooltip.Positioner>
          <Tooltip.Popup>
            <div className="rounded-md border border-border bg-background px-3 py-2 mb-1 text-sm shadow-md">
              {content}
            </div>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
