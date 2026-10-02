import type { VariantProps } from "class-variance-authority"
import { Columns3, Download, Filter, Link2, type LucideIcon, X } from "lucide-react"
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
  onClick,
  variant = "outline",
  description,
}: {
  icon: IconButtonIcon
  label: string
  onClick: () => void
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
        variant={variant}
        size="icon-sm"
        aria-label={label}
        aria-describedby={description ? descriptionId : undefined}
        onClick={onClick}
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
