"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { COUNTRIES, type Country } from "@repo/core/geo";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";

import { PHONE_COUNTRY_CODES, PhoneInput, useSchoolPhoneCountry } from "./phone-input";
// Country reference data lives in @repo/core/geo so server code (emails, actions) can use the
// same list without importing this "use client" module. Re-exported here so every existing
// `import { COUNTRIES, type Country } from "@repo/ui/components/ui/country-phone-input"` is
// unchanged - there is one list, in one place.
export { COUNTRIES, type Country } from "@repo/core/geo";

// The country list and the school-country provider now live with PhoneInput; re-exported so existing imports keep working.
export { PHONE_COUNTRY_CODES, SchoolCountryProvider } from "./phone-input";

export function getDefaultCountry(): Country {
    return COUNTRIES.find(c => c.code === "NP")!;
}

export function buildE164(country: Country, localNumber: string): string {
    const digits = localNumber.replace(/\D/g, "");
    if (!digits) return "";
    return `${country.dial}${digits}`;
}

// ─── Country Selector (dropdown only) ────────────────────────────────────────

interface CountrySelectorProps {
    value: Country;
    onChange: (country: Country) => void;
    disabled?: boolean;
    className?: string;
    /** ISO-2 codes to offer; defaults to PHONE_COUNTRY_CODES. */
    countries?: string[];
}

export function CountrySelector({ value, onChange, disabled, className, countries = PHONE_COUNTRY_CODES }: CountrySelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    // The offered countries in the given order, filtered by the search (name, dial code or ISO code).
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return countries
            .map((code) => COUNTRIES.find((c) => c.code === code))
            .filter((c): c is Country => !!c)
            .filter((c) => !q || c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q));
    }, [countries, search]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    role="combobox"
                    disabled={disabled}
                    className={cn(
                        "flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400/40 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed",
                        className
                    )}
                >
                    <span className="text-base leading-none">{value.flag}</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{value.dial}</span>
                    <ChevronsUpDown className="h-3 w-3 text-neutral-400 flex-shrink-0" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 overflow-hidden p-0" align="start">
                <Command shouldFilter={false}>
                    {/* CommandInput provides native keyboard nav (↑↓ Enter Escape) via cmdk */}
                    <CommandInput
                        placeholder="Search country or code…"
                        value={search}
                        onValueChange={setSearch}
                        className="h-9"
                    />
                    <CommandList className="max-h-60">
                        <CommandEmpty>No country found.</CommandEmpty>
                        {filtered.length > 0 && (
                            <CommandGroup>
                                {filtered.map(country => (
                                    <CommandItem
                                        key={country.code}
                                        value={country.code}
                                        onSelect={() => { onChange(country); setOpen(false); setSearch(""); }}
                                        className="flex items-center gap-2.5 cursor-pointer"
                                    >
                                        <span className="text-base">{country.flag}</span>
                                        <span className="flex-1 text-sm">{country.name}</span>
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{country.dial}</span>
                                        {value.code === country.code && <Check className="h-3.5 w-3.5 text-neutral-500 ml-1" />}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// ─── Combined input (compatibility wrapper over PhoneInput) ───────────────────

/**
 * DEPRECATED for new code - use `PhoneInput` from `./phone-input` (value/onChange E.164, `undefined` when empty).
 *
 * This keeps the old props contract for the existing call sites: `onChange` fires with a string (`""` when empty),
 * `lockedCountryCode` fixes the dial code, and the default height stays `h-11` (pass `h-9` through
 * `selectorClassName` / `inputClassName` as before). A legacy `value` stored as bare local digits is shown under the
 * starting country's dial code; it is only rewritten (as E.164) once the user edits it.
 */
interface CountryPhoneInputProps {
    value?: string;                 // full E.164 number (controlled)
    onChange?: (e164: string) => void;  // fires with full E.164, "" when empty
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    /** Classes for the COUNTRY side - the flag/dial-code button, or the locked chip when `lockedCountryCode` is set. */
    selectorClassName?: string;
    defaultCountryCode?: string;    // ISO-2; defaults to the SchoolCountryProvider's country, else "NP"
    countries?: string[];           // ISO-2 codes offered; defaults to PHONE_COUNTRY_CODES
    lockedCountryCode?: string;     // ISO-2; when set, the dial code is fixed (school country)
}

export function CountryPhoneInput({
    value,
    onChange,
    placeholder = "98XXXXXXXX",
    disabled,
    className,
    inputClassName,
    selectorClassName,
    defaultCountryCode,
    lockedCountryCode,
    countries,
}: CountryPhoneInputProps) {
    const schoolCountry = useSchoolPhoneCountry();
    const startCode = lockedCountryCode ?? defaultCountryCode ?? schoolCountry ?? "NP";
    // A legacy value of bare local digits is read under the starting country by PhoneInput (normalizePhone).
    return (
        <PhoneInput
            value={value}
            onChange={(next) => onChange?.(next ?? "")}
            defaultCountry={startCode}
            lockedCountry={lockedCountryCode}
            countries={countries}
            variant="lg"
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            inputClassName={cn("bg-neutral-50 dark:bg-neutral-900", inputClassName)}
            selectorClassName={selectorClassName}
        />
    );
}
