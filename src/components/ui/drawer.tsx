"use client"

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

import { cn } from "@/lib/utils"

const Drawer = DrawerPrimitive.Root
const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerClose = DrawerPrimitive.Close

function DrawerPortal(props: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "absolute top-0 left-0 z-40 h-dvh w-full bg-black/40 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerPopup({ className, ...props }: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPrimitive.Popup
      data-slot="drawer-popup"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto bg-background shadow-lg outline-none",
        className
      )}
      {...props}
    />
  )
}

// Base UI requires Popup to be rendered inside Viewport (it drives swipe
// handling and touch scroll locking), so Viewport carries the positioning
// and slide transform, while Popup carries the visible surface + scrolling.
function DrawerViewport({
  className,
  ...props
}: DrawerPrimitive.Viewport.Props) {
  return (
    <DrawerPrimitive.Viewport
      data-slot="drawer-viewport"
      className={cn(
        "absolute top-0 left-0 z-50 flex h-dvh w-56 flex-col transition-transform duration-200 data-starting-style:-translate-x-full data-ending-style:-translate-x-full",
        className
      )}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerPortal,
  DrawerBackdrop,
  DrawerPopup,
  DrawerViewport,
}
