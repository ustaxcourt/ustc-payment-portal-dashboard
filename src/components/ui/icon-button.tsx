import { Columns3, Download, Filter, Link2, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

const ICONS = {
  link: Link2,
  download: Download,
  columns: Columns3,
  filter: Filter,
} satisfies Record<string, LucideIcon>

export type IconButtonIcon = keyof typeof ICONS

function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: IconButtonIcon
  label: string
  onClick: () => void
}) {
  const Icon = ICONS[icon]
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
    >
      <Icon />
    </Button>
  )
}

export { IconButton }
