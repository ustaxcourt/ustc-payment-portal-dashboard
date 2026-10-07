import { Tooltip } from "@base-ui/react";


export function AppTooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Tooltip.Provider>{children}</Tooltip.Provider>;
}
