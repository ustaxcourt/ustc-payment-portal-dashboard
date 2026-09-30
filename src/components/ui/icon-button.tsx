import type { VariantProps } from "class-variance-authority"
import { Columns3, Download, Filter, Link2, type LucideIcon, X } from "lucide-react"

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
}: {
  icon: IconButtonIcon
  label: string
  onClick: () => void
  variant?: VariantProps<typeof buttonVariants>["variant"]
}) {
  const Icon = ICONS[icon]
  return (
    <Button
      type="button"
      variant={variant}
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
    >
      <Icon />
    </Button>
  )
}

export { IconButton }
