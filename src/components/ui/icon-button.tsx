import type { VariantProps } from "class-variance-authority"
import { Columns3, Download, Filter, Link2, type LucideIcon, X } from "lucide-react"
import type * as React from "react"
import { useId } from "react"

import { Button, type buttonVariants } from "@/components/ui/button"

const ICONS = {
  link: Link2,
  download: Download,
  columns: Columns3,
  filter: Filter,
  close: X,
} satisfies Record<string, LucideIcon>

export type IconButtonIcon = keyof typeof ICONS

function IconButton({
  icon,
  label,
  variant = "outline",
  description,
  "aria-describedby": ariaDescribedBy,
  ...props
}: Omit<
  React.ComponentProps<typeof Button>,
  "children" | "aria-label" | "size" | "variant"
> & {
  icon: IconButtonIcon
  label: string
  variant?: VariantProps<typeof buttonVariants>["variant"]
  /** Extra screen-reader-only context (e.g. a visual-only badge's state) announced alongside `label`, via `aria-describedby`. */
  description?: string
}) {
  const Icon = ICONS[icon]
  const descriptionId = useId()
  return (
    <>
      <Button
        type="button"
        {...props}
        variant={variant}
        size="icon-sm"
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
  )
}

export { IconButton }
