import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { Columns3, Download, Filter, Icon, Link2, type LucideIcon, X } from "lucide-react";

import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

const ICONS = {
  link: Link2,
  download: Download,
  columns: Columns3,
  filter: Filter,
  close: X,
} satisfies Record<string, LucideIcon>;

export type IconButtonIcon = keyof typeof ICONS;

type IconButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children"
> & {
  icon: IconButtonIcon;
  label: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
};

export function IconButton({
  icon,
  label,
  variant = "outline",
  ...props
}: IconButtonProps) {
  const IconComponent = ICONS[icon];

  return (
    <Button
      type="button"
      variant={variant}
      size="icon-sm"
      aria-label={label}
      {...props}
    >
      <IconComponent />
    </Button>
  );
}
