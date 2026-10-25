"use client"

/**
 * Number field (ReUI, on base-ui's NumberField): a typed number with - / + steppers, arrow keys, wheel and an optional
 * scrub label. House sizes: default h-9, sm h-8, lg h-11, rounded-xl.
 *
 *   <NumberField defaultValue={0} min={0}>
 *     <NumberFieldGroup><NumberFieldDecrement /><NumberFieldInput /><NumberFieldIncrement /></NumberFieldGroup>
 *   </NumberField>
 */

import type { ComponentProps, ReactNode } from "react"
import { createContext, useContext, useId } from "react"
import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field"
import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

import { cn } from "../../lib/utils"
import { MinusIcon, PlusIcon } from "lucide-react"

import { Label } from "./label"

const NumberFieldContext = createContext<{
  fieldId: string
  size: "sm" | "default" | "lg"
} | null>(null)

const numberFieldGroupVariants = cva(
  "relative flex w-full justify-between border border-input data-disabled:pointer-events-none data-disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive focus-within:has-aria-invalid:border-destructive focus-within:has-aria-invalid:ring-destructive/20 dark:focus-within:has-aria-invalid:ring-destructive/40 rounded-xl bg-white dark:bg-neutral-900 transition-colors focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-3",
  {
    variants: {
      size: {
        sm: "h-8 text-sm",
        default: "h-9 text-sm",
        lg: "h-11 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const numberFieldButtonVariants = cva(
  "relative flex shrink-0 cursor-pointer items-center justify-center transition-colors pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:bg-accent",
  {
    variants: {
      size: {
        sm: ["px-1.5", "[&_svg:not([class*='size-'])]:size-3.5"],
        default:
          ["px-2", "[&_svg:not([class*='size-'])]:size-4"],
        lg: ["px-2.5", "[&_svg:not([class*='size-'])]:size-4"],
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const numberFieldInputVariants = cva(
  "w-full min-w-0 flex-1 bg-transparent text-center tabular-nums outline-none",
  {
    variants: {
      size: {
        sm: "px-2 py-0.5",
        default: "px-2.5 py-1",
        lg: "px-2.5 py-1.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function NumberField({
  id,
  className,
  size = "default",
  ...props
}: NumberFieldPrimitive.Root.Props &
  VariantProps<typeof numberFieldGroupVariants>) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const sizeValue = size ?? "default"

  return (
    <NumberFieldContext.Provider value={{ fieldId, size: sizeValue }}>
      <NumberFieldPrimitive.Root
        className={cn("flex w-full flex-col items-start gap-2", className)}
        data-size={sizeValue}
        data-slot="number-field"
        id={fieldId}
        {...props}
      />
    </NumberFieldContext.Provider>
  )
}

function NumberFieldGroup({
  className,
  size: sizeProp,
  ...props
}: NumberFieldPrimitive.Group.Props &
  Partial<VariantProps<typeof numberFieldGroupVariants>>) {
  const context = useContext(NumberFieldContext)
  if (!context) {
    throw new Error(
      "NumberFieldGroup must be used within a NumberField component."
    )
  }
  const size = sizeProp ?? context.size

  return (
    <NumberFieldPrimitive.Group
      className={cn(numberFieldGroupVariants({ size }), className)}
      data-slot="number-field-group"
      {...props}
    />
  )
}

function NumberFieldDecrement({
  className,
  size: sizeProp,
  children,
  ...props
}: NumberFieldPrimitive.Decrement.Props &
  Partial<VariantProps<typeof numberFieldButtonVariants>> & {
    children?: ReactNode
  }) {
  const context = useContext(NumberFieldContext)
  if (!context) {
    throw new Error(
      "NumberFieldDecrement must be used within a NumberField component."
    )
  }
  const size = sizeProp ?? context.size

  return (
    <NumberFieldPrimitive.Decrement
      className={cn(
        numberFieldButtonVariants({ size }),
        "rounded-s-xl border-e-0",
        className
      )}
      data-slot="number-field-decrement"
      {...props}
    >
      {children ?? (
        <MinusIcon />
      )}
    </NumberFieldPrimitive.Decrement>
  )
}

function NumberFieldIncrement({
  className,
  size: sizeProp,
  children,
  ...props
}: NumberFieldPrimitive.Increment.Props &
  Partial<VariantProps<typeof numberFieldButtonVariants>> & {
    children?: ReactNode
  }) {
  const context = useContext(NumberFieldContext)
  if (!context) {
    throw new Error(
      "NumberFieldIncrement must be used within a NumberField component."
    )
  }
  const size = sizeProp ?? context.size

  return (
    <NumberFieldPrimitive.Increment
      className={cn(
        numberFieldButtonVariants({ size }),
        "rounded-e-xl border-s-0",
        className
      )}
      data-slot="number-field-increment"
      {...props}
    >
      {children ?? (
        <PlusIcon />
      )}
    </NumberFieldPrimitive.Increment>
  )
}

function NumberFieldInput({
  className,
  size: sizeProp,
  ...props
}: NumberFieldPrimitive.Input.Props &
  Partial<VariantProps<typeof numberFieldInputVariants>>) {
  const context = useContext(NumberFieldContext)
  if (!context) {
    throw new Error(
      "NumberFieldInput must be used within a NumberField component."
    )
  }
  const size = sizeProp ?? context.size

  return (
    <NumberFieldPrimitive.Input
      className={cn(numberFieldInputVariants({ size }), className)}
      data-slot="number-field-input"
      {...props}
    />
  )
}

function NumberFieldScrubArea({
  className,
  label,
  ...props
}: NumberFieldPrimitive.ScrubArea.Props & {
  label: string
}) {
  const context = useContext(NumberFieldContext)
  if (!context) {
    throw new Error(
      "NumberFieldScrubArea must be used within a NumberField component for accessibility."
    )
  }

  return (
    <NumberFieldPrimitive.ScrubArea
      className={cn("flex cursor-ew-resize", className)}
      data-slot="number-field-scrub-area"
      {...props}
    >
      <Label className="cursor-ew-resize" htmlFor={context.fieldId}>
        {label}
      </Label>
      <NumberFieldPrimitive.ScrubAreaCursor className="drop-shadow-[0_1px_1px_#0008] filter">
        <CursorGrowIcon />
      </NumberFieldPrimitive.ScrubAreaCursor>
    </NumberFieldPrimitive.ScrubArea>
  )
}

function CursorGrowIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="black"
      height="14"
      stroke="white"
      viewBox="0 0 24 14"
      width="26"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19.5 5.5L6.49737 5.51844V2L1 6.9999L6.5 12L6.49737 8.5L19.5 8.5V12L25 6.9999L19.5 2V5.5Z" />
    </svg>
  )
}

/**
 * The house shorthand: - / + steppers round the input, plus an optional scrub label (drag the label left/right to
 * change the value). Use it for a bounded count or amount typed in a form - never inside a dense grid.
 *
 *   <NumberStepper value={marks} onValueChange={setMarks} min={0} max={100} scrubLabel="Max marks" />
 *
 * Forms that keep the value as a string: `value={toStepperValue(s)}` and
 * `onValueChange={(v) => setS(fromStepperValue(v))}` - an empty box stays empty (null), never 0.
 */
function NumberStepper({
  size = "default",
  className,
  groupClassName,
  inputClassName,
  placeholder,
  scrubLabel,
  "aria-label": ariaLabel,
  ...props
}: Omit<NumberFieldPrimitive.Root.Props, "children"> &
  VariantProps<typeof numberFieldGroupVariants> & {
    groupClassName?: string
    inputClassName?: string
    placeholder?: string
    /** Renders a draggable label above the control that scrubs the value. */
    scrubLabel?: string
    "aria-label"?: string
  }) {
  return (
    <NumberField className={className} size={size} {...props}>
      {scrubLabel ? <NumberFieldScrubArea label={scrubLabel} /> : null}
      <NumberFieldGroup className={groupClassName}>
        <NumberFieldDecrement aria-label="Decrease" />
        <NumberFieldInput aria-label={ariaLabel} className={inputClassName} placeholder={placeholder} />
        <NumberFieldIncrement aria-label="Increase" />
      </NumberFieldGroup>
    </NumberField>
  )
}

/** A string form value -> the stepper's value ('' and junk are null, so the box stays empty). */
function toStepperValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/** The stepper's value -> a string form value (null is ''). */
function fromStepperValue(value: number | null): string {
  return value === null ? "" : String(value)
}

export {
  NumberStepper,
  toStepperValue,
  fromStepperValue,
  NumberField,
  NumberFieldScrubArea,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldGroup,
  NumberFieldInput,
}