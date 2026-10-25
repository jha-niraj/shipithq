"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "../../lib/utils"

/**
 * Shared progress bar. Neutral track and neutral ink fill (amber only when the
 * caller passes `indicatorClassName`). Feed it REAL progress only - a done/total
 * from a job row, upload bytes, a batch counter. Never a time-based fake fill:
 * when nothing real is known, show a spinner and a status line instead.
 *
 * - `size`: "sm" = 4px, "default" = 8px.
 * - `label`: text on the left above the bar (e.g. the current step name).
 * - `valueLabel`: text on the right (e.g. "12 of 40"). With `showValue` and no
 *   `valueLabel`, the rounded percent is shown.
 * - `className` styles the bar itself (kept for existing callers passing `h-1.5`);
 *   `containerClassName` styles the wrapper when a label row is rendered.
 */
type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
	size?: "sm" | "default"
	label?: React.ReactNode
	valueLabel?: React.ReactNode
	showValue?: boolean
	indicatorClassName?: string
	containerClassName?: string
}

const Progress = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	ProgressProps
>(
	(
		{
			className,
			value,
			size = "default",
			label,
			valueLabel,
			showValue = false,
			indicatorClassName,
			containerClassName,
			...props
		},
		ref
	) => {
		const pct = Math.max(0, Math.min(100, value ?? 0))
		const right = valueLabel ?? (showValue ? `${Math.round(pct)}%` : null)

		const bar = (
			<ProgressPrimitive.Root
				ref={ref}
				value={pct}
				className={cn(
					"relative w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800",
					size === "sm" ? "h-1" : "h-2",
					className
				)}
				{...props}
			>
				<ProgressPrimitive.Indicator
					className={cn(
						"h-full w-full flex-1 rounded-full bg-neutral-900 transition-transform duration-300 ease-out dark:bg-neutral-100",
						indicatorClassName
					)}
					style={{ transform: `translateX(-${100 - pct}%)` }}
				/>
			</ProgressPrimitive.Root>
		)

		if (label == null && right == null) return bar

		return (
			<div className={cn("flex w-full min-w-0 flex-col gap-1.5", containerClassName)}>
				<div className="flex min-w-0 items-center justify-between gap-3 text-xs">
					<span className="min-w-0 truncate font-medium text-neutral-700 dark:text-neutral-200">
						{label}
					</span>
					{right != null && (
						<span className="shrink-0 tabular-nums text-neutral-600 dark:text-neutral-300">
							{right}
						</span>
					)}
				</div>
				{bar}
			</div>
		)
	}
)
Progress.displayName = ProgressPrimitive.Root.displayName

/**
 * Multi-step checklist (ReUI c-progress-7 style) for a job that reports WHICH
 * step it is on but no counts. Each step is done / active / pending, driven by
 * the job's real status - never advanced on a timer.
 */
type ProgressStepState = "done" | "active" | "pending" | "failed"

type ProgressStep = {
	key: string
	label: React.ReactNode
	state: ProgressStepState
	hint?: React.ReactNode
}

function ProgressSteps({
	steps,
	className,
}: {
	steps: ProgressStep[]
	className?: string
}) {
	return (
		<ol className={cn("flex min-w-0 flex-col gap-2", className)}>
			{steps.map((s) => (
				<li key={s.key} className="flex min-w-0 items-start gap-2.5 text-sm">
					<span
						aria-hidden
						className={cn(
							"mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ring-1",
							s.state === "done" && "bg-neutral-900 ring-neutral-900 dark:bg-neutral-100 dark:ring-neutral-100",
							s.state === "active" && "ring-amber-500",
							s.state === "pending" && "ring-neutral-300 dark:ring-neutral-700",
							s.state === "failed" && "ring-rose-500"
						)}
					>
						{s.state === "done" && (
							<svg viewBox="0 0 12 12" className="size-2.5 text-white dark:text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M2.5 6.5l2.2 2.2L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						)}
						{s.state === "active" && <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />}
						{s.state === "failed" && <span className="size-1.5 rounded-full bg-rose-500" />}
					</span>
					<span className="flex min-w-0 flex-col">
						<span
							className={cn(
								"truncate",
								s.state === "pending" ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-900 dark:text-neutral-100",
								s.state === "active" && "font-medium",
								s.state === "failed" && "text-rose-600 dark:text-rose-400"
							)}
						>
							{s.label}
						</span>
						{s.hint != null && (
							<span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{s.hint}</span>
						)}
					</span>
				</li>
			))}
		</ol>
	)
}

/** Build checklist states from an ordered step list and the index of the current step. */
function stepStates<K extends string>(
	order: readonly { key: K; label: React.ReactNode }[],
	current: K | null,
	opts?: { failed?: boolean; complete?: boolean }
): ProgressStep[] {
	const idx = current == null ? -1 : order.findIndex((o) => o.key === current)
	return order.map((o, i) => ({
		key: o.key,
		label: o.label,
		state: opts?.complete
			? "done"
			: i < idx
				? "done"
				: i === idx
					? opts?.failed
						? "failed"
						: "active"
					: "pending",
	}))
}

export { Progress, ProgressSteps, stepStates }
export type { ProgressProps, ProgressStep, ProgressStepState }
