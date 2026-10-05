"use client";

import { Tooltip } from "@base-ui/react";
import React, { ReactElement, ReactNode } from "react";

type AppTooltipProps = {
  children: ReactElement<{
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  }>;
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
          React.cloneElement(children, {
            ...children.props,
            ...props,
            onClick: (event: React.MouseEvent<HTMLElement>) => {
              props.onClick?.(event);
              children.props.onClick?.(event);
            },
          })
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={4}>
          <Tooltip.Popup>
            <div className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-md">
              {content}
            </div>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
