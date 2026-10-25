"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "../../lib/utils"
import { buttonVariants } from "./button"

/*
 * AlertDialog - the centred dialog for BIG or IRREVERSIBLE actions only (delete a class with its
 * students, void a receipt, refund, ban a user). Routine one-item confirms stay in a
 * `ConfirmPopover` on the button (Niraj, 2026-10-20).
 *
 * Look follows ReUI's alert-dialog (radix-nova): rounded-2xl panel, an optional icon chip
 * (`AlertDialogMedia`, tone rose / amber / neutral), `size="sm"` for a compact stacked layout,
 * house buttons (rounded-xl from `buttonVariants`). With `size="default"` and a media chip, the chip
 * sits left of the title from `sm` up; on a phone everything stacks centred.
 */

type AlertDialogSize = "sm" | "default"
type AlertDialogTone = "destructive" | "warning" | "default"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
	React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Overlay
		className={cn(
			"fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className
		)}
		{...props}
		ref={ref}
	/>
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
	React.ElementRef<typeof AlertDialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & { size?: AlertDialogSize }
>(({ className, size = "default", ...props }, ref) => (
	<AlertDialogPortal>
		<AlertDialogOverlay />
		<AlertDialogPrimitive.Content
			ref={ref}
			data-size={size}
			className={cn(
				// No slide-in-from-*: those animate a translate that composes with the centering
				// translate-x/y-[-50%] and make the dialog fly in from the top-left corner instead of
				// growing from the centre. Zoom + fade only - same as DialogContent.
				"group/alert-dialog-content fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-5 rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-xl duration-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
				size === "sm" ? "sm:max-w-sm" : "sm:max-w-lg",
				className
			)}
			{...props}
		/>
	</AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center",
			"has-[[data-slot=alert-dialog-media]]:grid-rows-[auto_auto_1fr] has-[[data-slot=alert-dialog-media]]:gap-x-4",
			"sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left",
			"sm:group-data-[size=default]/alert-dialog-content:has-[[data-slot=alert-dialog-media]]:grid-cols-[auto_1fr] sm:group-data-[size=default]/alert-dialog-content:has-[[data-slot=alert-dialog-media]]:grid-rows-[auto_1fr]",
			className
		)}
		{...props}
	/>
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const MEDIA_TONE: Record<AlertDialogTone, string> = {
	destructive: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
	warning: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
	default: "bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700",
}

/** The icon chip above (or beside) the title. Pass a lucide icon as the child. */
const AlertDialogMedia = ({
	className,
	tone = "default",
	...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: AlertDialogTone }) => (
	<div
		data-slot="alert-dialog-media"
		className={cn(
			"mb-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 [&_svg]:size-5 [&_svg]:shrink-0",
			"sm:group-data-[size=default]/alert-dialog-content:row-span-2 sm:group-data-[size=default]/alert-dialog-content:mb-0",
			MEDIA_TONE[tone],
			className
		)}
		{...props}
	/>
)
AlertDialogMedia.displayName = "AlertDialogMedia"

const AlertDialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
			"group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2",
			className
		)}
		{...props}
	/>
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
	React.ElementRef<typeof AlertDialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Title
		ref={ref}
		className={cn(
			"text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-50",
			"sm:group-data-[size=default]/alert-dialog-content:group-has-[[data-slot=alert-dialog-media]]/alert-dialog-content:col-start-2",
			className
		)}
		{...props}
	/>
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
	React.ElementRef<typeof AlertDialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Description
		ref={ref}
		className={cn(
			"text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-medium [&_strong]:text-neutral-900 dark:[&_strong]:text-neutral-100",
			"sm:group-data-[size=default]/alert-dialog-content:group-has-[[data-slot=alert-dialog-media]]/alert-dialog-content:col-start-2",
			className
		)}
		{...props}
	/>
))
AlertDialogDescription.displayName =
	AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
	React.ElementRef<typeof AlertDialogPrimitive.Action>,
	React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
	<AlertDialogPrimitive.Action
		ref={ref}
		className={cn(
			buttonVariants(),
			destructive && "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500",
			className
		)}
		{...props}
	/>
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
	React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
	React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Cancel
		ref={ref}
		className={cn(buttonVariants({ variant: "outline" }), className)}
		{...props}
	/>
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export type { AlertDialogSize, AlertDialogTone }
export {
	AlertDialog,
	AlertDialogPortal,
	AlertDialogOverlay,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogAction,
	AlertDialogCancel,
}
