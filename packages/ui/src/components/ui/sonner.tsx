"use client"

import {
	CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

/**
 * The app-wide toast surface.
 *
 * Every default lives HERE rather than on each app's <Toaster/>, so all five
 * apps look identical and a change lands everywhere at once. The apps used to
 * each pass `position="top-center" closeButton richColors`, which meant five
 * places to keep in sync and one of them would always drift.
 *
 * `richColors` is deliberately NOT used. It paints the entire toast a saturated
 * green/red/amber, which fights the monochrome palette and reads as a browser
 * alert rather than product UI. Instead the surface stays neutral in both
 * themes and only the ICON carries the state - the pattern Linear, Vercel and
 * Raycast use. It also keeps the copy legible, which a coloured fill at low
 * contrast does not.
 *
 * Warning is intentionally neutral rather than amber: the house palette rules
 * out orange and yellow, and the triangle glyph already carries the meaning.
 */
const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme()

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			position="top-right"
			closeButton
			// Long enough to read an error, short enough not to linger.
			duration={4500}
			// Clears the sidebar/header chrome on every app.
			offset={18}
			gap={10}
			visibleToasts={4}
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-[18px]" />,
				info: <InfoIcon className="size-[18px]" />,
				warning: <TriangleAlertIcon className="size-[18px]" />,
				error: <OctagonXIcon className="size-[18px]" />,
				loading: <Loader2Icon className="size-[18px] animate-spin" />,
			}}
			toastOptions={{
				closeButton: true,
				classNames: {
					toast: [
						"group/toast relative flex w-full items-start gap-3",
						"rounded-xl border p-4 pr-10",
						// GLASS (Niraj, 2026-09-23). A translucent surface with a blur
						// behind it, so the toast reads as floating above the page
						// rather than as a flat box dropped on top of it. The opacity
						// is high enough that body text still clears AA over whatever
						// is underneath.
						"bg-white/80 backdrop-blur-xl border-neutral-200/80",
						"dark:bg-neutral-950/75 dark:border-white/10",
						// A wide, low-opacity shadow reads as depth rather than as a
						// drop shadow, which is what makes it feel considered.
						"shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)]",
						"dark:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.75)]",
					].join(" "),
					title: "text-[13.5px] font-medium leading-5 text-neutral-900 dark:text-neutral-50",
					description:
						"!text-[13px] leading-5 !text-neutral-600 dark:!text-neutral-300 mt-0.5",
					icon: "shrink-0 mt-px",
					content: "flex-1 min-w-0",
					// Monochrome, matching the primary button used elsewhere.
					actionButton:
						"!bg-neutral-900 !text-white hover:!bg-neutral-800 dark:!bg-white dark:!text-neutral-900 dark:hover:!bg-neutral-200 !rounded-lg !px-2.5 !h-7 !text-xs !font-medium",
					cancelButton:
						"!bg-transparent !text-neutral-500 hover:!text-neutral-900 dark:hover:!text-white !rounded-lg !px-2.5 !h-7 !text-xs !font-medium",
					closeButton:
						"!bg-transparent !border-0 !text-neutral-600 hover:!text-neutral-900 dark:!text-neutral-400 dark:hover:!text-white !transition-colors",
					/*
					 * State is carried by the GLYPH, not by colour.
					 *
					 * Success was emerald, which is the one bit of colour most people
					 * notice and the one the palette rules out (Niraj, 2026-09-23:
					 * "remove this green colour"). A tick already means it worked; it
					 * does not need to be green to say so.
					 *
					 * Error keeps its red, because that is the one state where colour
					 * is doing work rather than decoration - something failed and the
					 * user has to act on it.
					 */
					success: "[&_[data-icon]]:text-neutral-900 dark:[&_[data-icon]]:text-white",
					error: "[&_[data-icon]]:text-rose-600 dark:[&_[data-icon]]:text-rose-400",
					warning: "[&_[data-icon]]:text-neutral-900 dark:[&_[data-icon]]:text-neutral-100",
					info: "[&_[data-icon]]:text-neutral-500 dark:[&_[data-icon]]:text-neutral-400",
					loading: "[&_[data-icon]]:text-neutral-500 dark:[&_[data-icon]]:text-neutral-400",
				},
			}}
			{...props}
		/>
	)
}

export { Toaster, toast }
export default toast;
