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

type IconButtonProps = Omit<ButtonPrimitive.Props, "children" | "className"> & {
  icon: IconButtonIcon
  label: string
  className?: string
  variant?: VariantProps<typeof buttonVariants>["variant"]
}

function IconButton({
  icon,
  label,
  className,
  variant = "outline",
  ...props
}: IconButtonProps) {
  const Icon = ICONS[icon]
  const descriptionId = useId()
  return (
    <Button
      type="button"
      variant={variant}
      size="icon-sm"
      aria-label={label}
      className={cn("text-muted-foreground hover:text-primary", className)}
      {...props}
    >
      <Icon />
    </Button>
  )
}

export { IconButton }
