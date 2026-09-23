"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"
import { ScrollArea } from "./scroll-area"

/**
 * ── Why there are no `slide-in-from-*` classes on the content ──
 *
 * There were, copied from shadcn's Tailwind v3 original, and on v4 they made the modal
 * fly in from the TOP-LEFT of the viewport instead of scaling up in place.
 *
 * The mechanism, because it is not obvious and it will bite the next centred overlay:
 *
 *   v3: `translate-x-[-50%]` compiled INTO `transform`. The enter keyframe also sets
 *       `transform`, so the keyframe simply replaced it. One property, no conflict.
 *
 *   v4: `translate-x-*` compiles to the standalone `translate` property. The keyframe
 *       still animates `transform`. They are different properties and CSS composes them -
 *       translate first, then transform.
 *
 * So `translate: -50% -50%` (the centring) and `transform: translate3d(-50%, -48%, 0)`
 * (the keyframe's start, from `slide-in-from-left-1/2 slide-in-from-top-[48%]`) both
 * applied, putting the first frame at roughly -100%, -98% of the dialog's own size. It
 * then animated `transform` to none and landed centred, which reads as "it came from the
 * corner".
 *
 * Fade and zoom are kept. `scale3d` is also in `transform`, but scaling about the
 * element's own centre does not displace it, so it composes harmlessly.
 *
 * Do not add a `slide-*` class to anything centred with a `translate` utility.
 */

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * `scroll` puts the body in a ScrollArea instead of letting the panel scroll
 * natively - the same rule as SheetContent (JB-1).
 *
 * It defaults to FALSE here where the sheet's defaults to true, and the
 * difference is deliberate. `sheetVariants` carried `overflow-y-auto` in its
 * base class, so every sheet was already scrolling and turning it on by default
 * changed nothing. Dialog's base has never had it: only the two call sites that
 * added `max-h-[..] overflow-y-auto` themselves scroll at all, and switching the
 * other ~30 from `grid gap-4` to a flex column with a scroller would change
 * layouts nobody asked about.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    scroll?: boolean
    /** Hide the corner close button, for a dialog that supplies its own (from gurukulhq). */
    hideClose?: boolean
  }
>(({ className, children, scroll = false, hideClose = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        scroll && "flex flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      {scroll ? (
        <ScrollArea className="min-h-0 min-w-0 flex-1" reflow>
          {children}
        </ScrollArea>
      ) : (
        children
      )}
      {!hideClose && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
