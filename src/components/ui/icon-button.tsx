import type { VariantProps } from "class-variance-authority";
import { Columns3, Download, Filter, Link2, type LucideIcon, X } from "lucide-react";
import type * as React from "react";
import { useId } from "react";

import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS = {
  link: Link2,
  download: Download,
  columns: Columns3,
  filter: Filter,
  close: X,
} satisfies Record<string, LucideIcon>;

export type IconButtonIcon = keyof typeof ICONS;

type IconButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "aria-label" | "size" | "type" | "variant"
> & {
  icon: IconButtonIcon;
  label: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  /** Extra screen-reader-only context announced alongside `label`. */
  description?: string;
};

export function IconButton({
  icon,
  label,
  variant = "outline",
  description,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: IconButtonProps) {
  const Icon = ICONS[icon];
  const descriptionId = useId();

  return (
    <>
      <Button
        {...props}
        type="button"
        size="icon-sm"
        variant={variant}
        className={cn("text-muted-foreground hover:text-primary", className)}
        aria-label={label}
        aria-describedby={
          [ariaDescribedBy, description ? descriptionId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
      >
        <Icon />
      </Button>

      {description ? (
        <span id={descriptionId} className="sr-only">
          {description}
        </span>
      ) : null}
    </>
  );
}
