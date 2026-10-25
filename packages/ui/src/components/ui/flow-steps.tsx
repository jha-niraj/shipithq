"use client"

import { Check } from "lucide-react"

import { cn } from "../../lib/utils"
import { Shimmer } from "../skeleton-kit"
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "./stepper"

export type FlowStep = string | { label: string; description?: string }

/**
 * The house step indicator for a multi-step flow, on the ReUI Stepper (plan/repo/ui/reui-components-2026-10-23.md
 * 3.1). It only DRAWS where the flow is - the flow keeps its own step state, validation and Back/Next buttons.
 *
 * Neutral throughout: done steps carry a check on a neutral chip, the current step is ink with an amber ring, the
 * rest are outlined. No green fill. `current` is 0-based. Pass `onStepClick` to let earlier steps be pressed (only
 * the ones `canJump` allows - by default every step before the current one); without it the strip is display only.
 * On a phone only the current step's label shows, so five steps fit in one row.
 */
export function FlowSteps({
  steps,
  current,
  onStepClick,
  canJump,
  size = "default",
  className,
  "aria-label": ariaLabel,
}: {
  steps: readonly FlowStep[]
  current: number
  onStepClick?: (index: number) => void
  canJump?: (index: number) => boolean
  size?: "sm" | "default"
  className?: string
  "aria-label"?: string
}) {
  const jumpable = (i: number) => !!onStepClick && i !== current && (canJump ? canJump(i) : i < current)
  return (
    <Stepper
      value={current + 1}
      onValueChange={(v) => {
        if (jumpable(v - 1)) onStepClick?.(v - 1)
      }}
      className={cn("min-w-0", className)}
      aria-label={ariaLabel ?? `Step ${current + 1} of ${steps.length}`}
      indicators={{ completed: <Check className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={2.5} /> }}
    >
      <StepperNav className="min-w-0 gap-1">
        {steps.map((s, i) => {
          const label = typeof s === "string" ? s : s.label
          const description = typeof s === "string" ? undefined : s.description
          const canPress = jumpable(i)
          return (
            <StepperItem key={label} step={i + 1} className="min-w-0 gap-1">
              <StepperTrigger
                type="button"
                disabled={!canPress}
                aria-current={i === current ? "step" : undefined}
                className={cn(
                  "min-w-0 rounded-lg px-1 py-1 text-left disabled:cursor-default disabled:opacity-100",
                  canPress && "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <StepperIndicator
                  className={cn(
                    size === "sm" ? "size-5 text-[11px]" : "size-6 text-xs",
                    "border font-semibold transition-colors",
                    "data-[state=inactive]:border-neutral-300 data-[state=inactive]:bg-white data-[state=inactive]:text-neutral-500 dark:data-[state=inactive]:border-neutral-700 dark:data-[state=inactive]:bg-neutral-900 dark:data-[state=inactive]:text-neutral-400",
                    "data-[state=completed]:border-neutral-200 data-[state=completed]:bg-neutral-100 data-[state=completed]:text-neutral-800 dark:data-[state=completed]:border-neutral-700 dark:data-[state=completed]:bg-neutral-800 dark:data-[state=completed]:text-neutral-100",
                    "data-[state=active]:border-neutral-900 data-[state=active]:bg-neutral-900 data-[state=active]:text-white data-[state=active]:ring-2 data-[state=active]:ring-amber-400/70 data-[state=active]:ring-offset-1 data-[state=active]:ring-offset-white dark:data-[state=active]:border-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-neutral-900 dark:data-[state=active]:ring-offset-neutral-900"
                  )}
                >
                  {i + 1}
                </StepperIndicator>
                <span className={cn("min-w-0", i === current ? "block" : "hidden sm:block")}>
                  <StepperTitle
                    className={cn(
                      "truncate leading-tight",
                      size === "sm" ? "text-xs" : "text-sm",
                      i === current ? "font-medium text-neutral-900 dark:text-white" : "font-normal text-neutral-600 dark:text-neutral-300"
                    )}
                  >
                    {label}
                  </StepperTitle>
                  {description && size !== "sm" && (
                    <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">{description}</span>
                  )}
                </span>
              </StepperTrigger>
              {i < steps.length - 1 && (
                <StepperSeparator className="min-w-3 bg-neutral-200 data-[state=completed]:bg-neutral-400 dark:bg-neutral-800 dark:data-[state=completed]:bg-neutral-500" />
              )}
            </StepperItem>
          )
        })}
      </StepperNav>
    </Stepper>
  )
}

/** The strip's loading shape: the same row of chips and labels, grey. */
export function FlowStepsSkeleton({ count, size = "default", className }: { count: number; size?: "sm" | "default"; className?: string }) {
  return (
    <div className={cn("flex w-full min-w-0 items-center gap-1", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("flex min-w-0 items-center gap-1", i < count - 1 && "flex-1")}>
          <div className="flex shrink-0 items-center gap-2.5 px-1 py-1">
            <Shimmer className={cn("shrink-0 rounded-full", size === "sm" ? "size-5" : "size-6")} delay={i * 0.05} />
            <Shimmer className={cn("h-3 w-14", i === 0 ? "block" : "hidden sm:block")} delay={i * 0.05} />
          </div>
          {i < count - 1 && <span className="m-0.5 h-0.5 min-w-3 flex-1 rounded-sm bg-neutral-200 dark:bg-neutral-800" />}
        </div>
      ))}
    </div>
  )
}
