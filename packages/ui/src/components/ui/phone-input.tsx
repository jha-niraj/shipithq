"use client"

import * as React from "react"
import { createContext, useContext, useMemo, useState } from "react"
import BasePhoneInput, {
  formatPhoneNumberIntl,
  getCountryCallingCode,
  isSupportedCountry,
  isValidPhoneNumber,
  type Country as PhoneCountry,
  type FlagProps,
} from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import { Check, ChevronsUpDown, GlobeIcon } from "lucide-react"
import { phoneToE164 } from "@repo/core/geo"

import { cn } from "../../lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { ScrollArea } from "./scroll-area"

/**
 * THE phone input (ReUI's phone input, 2026-10-23): a flag button with a searchable country list, then the number.
 * Built on react-phone-number-input, with our Popover + Command + ScrollArea for the list.
 *
 * `value` and `onChange` are E.164 (`+9779812345678`); `onChange` gives `undefined` when the box is empty. New code uses
 * this; `CountryPhoneInput` is a compatibility wrapper over it for the older call sites.
 */

export type { PhoneCountry }

/**
 * The countries a phone number may be in, for now (Niraj, 2026-10-22: Nepal and India only). One list, so widening it
 * later is this line. A caller can still pass its own `countries`.
 */
export const PHONE_COUNTRY_CODES: PhoneCountry[] = ["NP", "IN"]

/**
 * The school's country (ISO-2), so every phone box in an app starts on it without each caller passing it. The app shell
 * provides it (apps/main (main)/layout); outside a provider the box starts on Nepal.
 */
const SchoolCountryContext = createContext<string | null>(null)

export function SchoolCountryProvider({
  code,
  children,
}: {
  code: string | null
  children: React.ReactNode
}) {
  return (
    <SchoolCountryContext.Provider value={code}>
      {children}
    </SchoolCountryContext.Provider>
  )
}

/** The provider's country as a phone country, if it is one the library knows. */
export function useSchoolPhoneCountry(): PhoneCountry | undefined {
  const code = useContext(SchoolCountryContext)
  return toPhoneCountry(code)
}

/** An ISO-2 string as a phone country, or `undefined` when the library has no such country. */
export function toPhoneCountry(
  code: string | null | undefined
): PhoneCountry | undefined {
  if (!code) return undefined
  const upper = code.toUpperCase()
  return isSupportedCountry(upper) ? upper : undefined
}

/**
 * A stored phone as E.164 for the box. Values saved before the sweep can be bare local digits (`9812345678`) or
 * spaced (`+977 981-2345678`); those are read as local to `country` (ISO-2, default Nepal). `undefined` when empty or
 * not a phone at all. PhoneInput applies this to its `value`, so callers pass what they stored.
 */
export function normalizePhone(
  value: string | null | undefined,
  country?: string | null
): string | undefined {
  if (!value || !value.trim()) return undefined
  /* Already international: pass through untouched, so a half-typed `+97798` from the box itself is never dropped. */
  const plain = value.replace(/[\s().-]/g, "")
  if (/^\+\d*$/.test(plain)) return plain
  const code = toPhoneCountry(country) ?? "NP"
  return phoneToE164(value, `+${getCountryCallingCode(code)}`) ?? undefined
}

/** True when `value` is a complete, valid phone number (E.164). */
export function isValidPhone(value: string | null | undefined): boolean {
  if (!value) return false
  return isValidPhoneNumber(value)
}

/** An E.164 number for display (`+977 981-2345678`); the input back unchanged when it cannot be read. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return ""
  return formatPhoneNumberIntl(value) || value
}

type PhoneInputVariant = "sm" | "default" | "lg"

const HEIGHT: Record<PhoneInputVariant, string> = {
  sm: "h-8",
  default: "h-9",
  lg: "h-11",
}

const PhoneInputContext = createContext<{
  variant: PhoneInputVariant
  invalid: boolean
  popupClassName?: string
}>({ variant: "default", invalid: false })

export interface PhoneInputProps {
  /** E.164, e.g. `+9779812345678`. */
  value?: string
  onChange?: (value: string | undefined) => void
  /** ISO-2 the box starts on (`NP`, `IN`); defaults to the SchoolCountryProvider's country, else Nepal. */
  defaultCountry?: string
  /** ISO-2 codes to offer; defaults to PHONE_COUNTRY_CODES. */
  countries?: string[]
  /** Fix the country: no list, and the dial code cannot be edited away. */
  lockedCountry?: string
  variant?: PhoneInputVariant
  disabled?: boolean
  placeholder?: string
  "aria-invalid"?: boolean | "true" | "false"
  className?: string
  /** Classes for the number field. */
  inputClassName?: string
  /** Classes for the country button. */
  selectorClassName?: string
  /** Classes for the country list popover. */
  popupClassName?: string
  id?: string
  name?: string
  autoFocus?: boolean
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void
}

function PhoneInput({
  value,
  onChange,
  defaultCountry,
  countries,
  lockedCountry,
  variant = "default",
  disabled,
  placeholder = "98XXXXXXXX",
  "aria-invalid": ariaInvalid,
  className,
  inputClassName,
  selectorClassName,
  popupClassName,
  id,
  name,
  autoFocus,
  onBlur,
}: PhoneInputProps) {
  const schoolCountry = useSchoolPhoneCountry()
  const locked = toPhoneCountry(lockedCountry)
  const offered = useMemo(() => {
    if (locked) return [locked]
    const list = (countries ?? PHONE_COUNTRY_CODES)
      .map(toPhoneCountry)
      .filter((code): code is PhoneCountry => code !== undefined)
    return list.length > 0 ? list : PHONE_COUNTRY_CODES
  }, [countries, locked])
  const wanted = locked ?? toPhoneCountry(defaultCountry) ?? schoolCountry
  /* The library ignores a default outside `countries`, so fall back to the first offered. */
  const start: PhoneCountry =
    wanted && offered.includes(wanted) ? wanted : (offered[0] ?? "NP")
  const invalid = ariaInvalid === true || ariaInvalid === "true"

  return (
    <PhoneInputContext.Provider value={{ variant, invalid, popupClassName }}>
      <BasePhoneInput
        className={cn("flex w-full min-w-0", className)}
        value={normalizePhone(value, start)}
        onChange={(next) => onChange?.(next || undefined)}
        defaultCountry={start}
        countries={offered}
        addInternationalOption={false}
        international={locked ? true : undefined}
        countryCallingCodeEditable={locked ? false : undefined}
        flagComponent={FlagComponent}
        countrySelectComponent={CountrySelect}
        countrySelectProps={{ locked: locked !== undefined, className: selectorClassName }}
        inputComponent={NumberInput}
        numberInputProps={{ className: inputClassName }}
        smartCaret={false}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        id={id}
        name={name}
        autoFocus={autoFocus}
        onBlur={onBlur}
      />
    </PhoneInputContext.Provider>
  )
}

const NumberInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function NumberInput({ className, ...props }, ref) {
  const { variant, invalid } = useContext(PhoneInputContext)
  return (
    <input
      ref={ref}
      className={cn(
        "flex w-full min-w-0 flex-1 rounded-xl rounded-s-none border border-neutral-200 bg-white px-3 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:z-10 focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-500",
        HEIGHT[variant],
        invalid && "border-rose-500 focus-visible:ring-rose-500/30 dark:border-rose-500",
        className
      )}
      {...props}
    />
  )
})

type CountryOption = { label: string; value?: PhoneCountry; divider?: boolean }

interface CountrySelectProps {
  value?: PhoneCountry
  options: CountryOption[]
  onChange: (country?: PhoneCountry) => void
  disabled?: boolean
  readOnly?: boolean
  locked?: boolean
  className?: string
  "aria-label"?: string
}

function CountrySelect({
  value: selected,
  options,
  onChange,
  disabled,
  readOnly,
  locked,
  className,
  "aria-label": ariaLabel,
}: CountrySelectProps) {
  const { variant, invalid, popupClassName } = useContext(PhoneInputContext)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const countries = useMemo(
    () =>
      options.filter(
        (option): option is CountryOption & { value: PhoneCountry } =>
          option.value !== undefined && !option.divider
      ),
    [options]
  )
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase().replace(/^\+/, "")
    if (!query) return countries
    return countries.filter(
      ({ value, label }) =>
        label.toLowerCase().includes(query) ||
        value.toLowerCase().includes(query) ||
        getCountryCallingCode(value).includes(query)
    )
  }, [countries, search])
  const selectedLabel =
    countries.find((option) => option.value === selected)?.label ?? selected ?? ""

  const triggerClass = cn(
    "flex shrink-0 items-center gap-1.5 rounded-xl rounded-e-none border border-e-0 border-neutral-200 bg-neutral-50 px-2.5 text-sm transition-colors focus:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:border-neutral-700 dark:bg-neutral-900",
    HEIGHT[variant],
    invalid && "border-rose-500 dark:border-rose-500",
    className
  )
  const face = (
    <>
      <FlagComponent country={selected ?? "NP"} countryName={selectedLabel} />
      {selected && (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">
          +{getCountryCallingCode(selected)}
        </span>
      )}
    </>
  )

  if (locked || countries.length <= 1) {
    return (
      <div
        aria-label={ariaLabel ? `${ariaLabel}: ${selectedLabel}` : selectedLabel}
        title={selectedLabel}
        className={cn(triggerClass, "select-none", disabled && "opacity-50")}
      >
        {face}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ? `${ariaLabel}: ${selectedLabel}` : selectedLabel}
          disabled={disabled || readOnly}
          className={cn(
            triggerClass,
            "cursor-pointer hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-800"
          )}
        >
          {face}
          <ChevronsUpDown className="size-3 shrink-0 text-neutral-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-72 overflow-hidden p-0", popupClassName)}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search country or code"
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList className="max-h-none overflow-visible">
            <CommandEmpty>No country found.</CommandEmpty>
            {filtered.length > 0 && (
              <ScrollArea orientation="vertical" viewportClassName="max-h-64">
                <CommandGroup>
                  {filtered.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onChange(option.value)
                        setOpen(false)
                        setSearch("")
                      }}
                      className="flex cursor-pointer items-center gap-2.5"
                    >
                      <FlagComponent
                        country={option.value}
                        countryName={option.label}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {option.label}
                      </span>
                      <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                        +{getCountryCallingCode(option.value)}
                      </span>
                      {option.value === selected && (
                        <Check className="size-3.5 text-neutral-500" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FlagComponent({ country, countryName }: FlagProps) {
  const Flag = flags[country]
  return (
    <span className="flex h-3.5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] [&_svg]:size-full">
      {Flag ? (
        <Flag title={countryName} />
      ) : (
        <GlobeIcon className="size-4 opacity-60" aria-hidden />
      )}
    </span>
  )
}

export { PhoneInput }
