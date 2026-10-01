import type { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { VariantProps } from "class-variance-authority"
import { Columns3, Download, Filter, Link2, type LucideIcon, X } from "lucide-react"
import { useId } from "react"

import { Button, type buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ICONS = {
  link: Link2,
  download: Download,
  columns: Columns3,
  filter: Filter,
  close: X,
} satisfies Record<string, LucideIcon>

export type IconButtonIcon = keyof typeof ICONS

// Every prop other than the icon and its label passes straight through, so
// callers can disable the button, and so popup primitives (Tooltip.Trigger)
// can merge their own ref/aria/handlers in via `render`.
type IconButtonProps = Omit<ButtonPrimitive.Props, "children" | "className"> & {
  icon: IconButtonIcon
  label: string
  className?: string
  variant?: VariantProps<typeof buttonVariants>["variant"]
  /** Extra screen-reader-only context (e.g. a visual-only badge's state) announced alongside `label`, via `aria-describedby`. */
  description?: string
}

function IconButton({
  icon,
  label,
  className,
  variant = "outline",
  description,
  ...props
}: IconButtonProps) {
  const Icon = ICONS[icon]
  const descriptionId = useId()
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="icon-sm"
        aria-label={label}
        aria-describedby={description ? descriptionId : undefined}
        className={cn("text-muted-foreground hover:text-primary", className)}
        {...props}
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
