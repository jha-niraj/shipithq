/**
 * Country reference data - ISO-2 code, display name, dialling code, flag.
 *
 * This lives in @repo/core rather than in the phone-input component because that component is
 * `"use client"`, and server code (email templates, server actions, cron jobs) needs the same
 * list. Importing a client module from an email builder happens to work in Next, but it drags a
 * client chunk along for what is a plain array - and it would break outright anywhere outside
 * Next, such as the Cloudflare worker.
 *
 * `country-phone-input.tsx` re-exports COUNTRIES and Country from here, so every existing
 * `import { COUNTRIES } from "@repo/ui/components/ui/country-phone-input"` keeps working and
 * there is still exactly ONE list.
 */

export interface Country {
    code: string;   // ISO-2: "NP"
    name: string;   // "Nepal"
    dial: string;   // "+977"
    flag: string;   // "🇳🇵"
}

export const COUNTRIES: Country[] = [
    // South Asia
    { code: "NP", name: "Nepal", dial: "+977", flag: "🇳🇵" },
    { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
    { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
    { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
    { code: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰" },
    { code: "BT", name: "Bhutan", dial: "+975", flag: "🇧🇹" },
    // Gulf / Middle East
    { code: "AE", name: "UAE", dial: "+971", flag: "🇦🇪" },
    { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦" },
    { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
    { code: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼" },
    { code: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭" },
    { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲" },
    // North America
    { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
    { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
    { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
    // Europe
    { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
    { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
    { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
    { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
    { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
    { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
    { code: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
    { code: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
    { code: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
    { code: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
    { code: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
    { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
    // Oceania
    { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
    { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
    // SE Asia
    { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
    { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
    { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
    { code: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
    { code: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
    { code: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
    // East Asia
    { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
    { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
    { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
    // Africa
    { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
    { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
    { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
    { code: "ET", name: "Ethiopia", dial: "+251", flag: "🇪🇹" },
    // South America
    { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
    { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
    { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
];

/** The launch market, and the default anywhere a country has not been chosen yet. */
export const DEFAULT_COUNTRY_CODE = "NP"

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code.toUpperCase(), c]))

/** Look up a country by ISO-2 code. Case-insensitive; null for an unknown or missing code. */
export function findCountry(code: string | null | undefined): Country | null {
    if (!code) return null
    return BY_CODE.get(code.toUpperCase()) ?? null
}

/**
 * Display name for a country code, for use in copy.
 *
 * Falls back to the code itself rather than to "Nepal": a wrong-but-plausible country name in an
 * email to a school in Doha is worse than a terse one, because the reader cannot tell it is a
 * bug. Pass `fallback` where a generic phrase reads better than a code.
 */
export function countryName(code: string | null | undefined, fallback?: string): string {
    return findCountry(code)?.name ?? fallback ?? (code ?? "").toUpperCase()
}

/** Flag emoji for a country code, or an empty string when unknown - never a wrong flag. */
export function countryFlag(code: string | null | undefined): string {
    return findCountry(code)?.flag ?? ""
}

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * ISO-4217 currency per country, for the markets Gurukul serves or plausibly will.
 *
 * Deliberately NOT exhaustive across all 46 countries above: a currency we have not verified is
 * worse than none, because a wrong currency code on a school's own fee figures is a number the
 * principal will act on. Add a row when a market is actually opened.
 */
export const CURRENCY_BY_COUNTRY: Record<string, string> = {
    NP: 'NPR',
    IN: 'INR',
    BT: 'BTN',
    LK: 'LKR',
    BD: 'BDT',
    PK: 'PKR',
    AE: 'AED',
    QA: 'QAR',
    SA: 'SAR',
    KW: 'KWD',
    BH: 'BHD',
    OM: 'OMR',
    US: 'USD',
    GB: 'GBP',
    AU: 'AUD',
    CA: 'CAD',
    MY: 'MYR',
    SG: 'SGD',
}

/** ISO-4217 code for a country, or null when we have not verified one. */
export function currencyForCountry(code: string | null | undefined): string | null {
    if (!code) return null
    return CURRENCY_BY_COUNTRY[code.toUpperCase()] ?? null
}

/**
 * Render an amount for display in email/PDF copy.
 *
 * With a known currency: "NPR 12,500". Without one: "12,500" - a bare, unambiguous number.
 * It never guesses, because labelling a Qatari school's fees "NPR" is a specific, confident lie
 * about their money, and an unlabelled figure at least cannot mislead.
 */
export function formatMoney(amount: number, currency: string | null | undefined): string {
    const n = amount.toLocaleString('en-US')
    return currency ? `${currency} ${n}` : n
}

// --- Phone numbers (E.164) ---

/**
 * An E.164 phone number: `+`, a country code that does not start with 0, then 7 to 14 more digits. The light server
 * check for every phone field (the client checks fully with `isValidPhone` from `@repo/ui/components/ui/phone-input`).
 */
export const E164_RE = /^\+[1-9]\d{6,14}$/

/** True when `value` is shaped like an E.164 number. */
export function isE164(value: string | null | undefined): boolean {
    return !!value && E164_RE.test(value)
}

/**
 * A phone as E.164, reading a legacy value that has no `+` as local to `dial` (e.g. "+977"): spaces and dashes go,
 * a leading `00` becomes `+`, a leading 0 is dropped, and a number that already starts with the country code just
 * gets its `+`. Null when it cannot be a phone number (a local part under 7 digits, or outside 8 to 15 digits in all).
 * PhoneInput uses this to show old bare-digit values; servers can use it to normalise before `isE164`.
 */
export function phoneToE164(raw: string | null | undefined, dial: string): string | null {
    let s = (raw ?? '').trim().replace(/[^\d+]/g, '')
    if (s.startsWith('00')) s = `+${s.slice(2)}`
    let digits: string
    if (s.startsWith('+')) {
        digits = s.slice(1).replace(/\D/g, '')
    } else {
        const local = s.replace(/\D/g, '')
        const cc = dial.replace(/\D/g, '')
        const national = local.replace(/^0+/, '')
        if (local.startsWith(cc) && local.length >= cc.length + 8) digits = local
        else if (national.length >= 7) digits = `${cc}${national}`
        else return null
    }
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
}

/**
 * A phone field for a server write: empty or missing -> null (cleared), a phone -> E.164 (an older bare-digit value is
 * read under `dial`), anything that is not a phone -> false, so the action can refuse it.
 */
export function phoneField(raw: string | null | undefined, dial = '+977'): string | null | false {
    if (!raw || !raw.trim()) return null
    const e164 = phoneToE164(raw, dial)
    return e164 && E164_RE.test(e164) ? e164 : false
}
