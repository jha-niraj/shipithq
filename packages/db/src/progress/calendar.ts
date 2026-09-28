/*
 * The progress-report calendar (plan/progress overview 7), with no imports, so a client
 * component can use it (Settings > Reports shows the next send day) without pulling
 * table definitions into the browser.
 */

export interface DayRange { from: string; to: string }

export type ReportFrequency = "WEEKLY" | "HALF_MONTHLY" | "MONTHLY"

export const FREQUENCY_LABEL: Record<ReportFrequency | "OFF", string> = {
    WEEKLY: "Weekly",
    HALF_MONTHLY: "Every two weeks",
    MONTHLY: "Monthly",
    OFF: "Off",
}

// ─── The calendar (overview 7) ───────────────────────────────────────────────

const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d))
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }
const startOfDay = (d: Date) => utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())

/**
 * The period a report sent on `today` covers, or null when `today` is not a send day:
 * weekly on Monday for Mon to Sun; every two weeks on the 1st (16th to month end) and
 * the 16th (1st to 15th); monthly on the 1st for the previous month.
 */
export function periodEndingBefore(frequency: ReportFrequency, today: Date): DayRange | null {
    const t = startOfDay(today)
    const y = t.getUTCFullYear(), m = t.getUTCMonth(), d = t.getUTCDate()
    if (frequency === "WEEKLY") {
        if (t.getUTCDay() !== 1) return null
        return { from: iso(addDays(t, -7)), to: iso(addDays(t, -1)) }
    }
    if (frequency === "HALF_MONTHLY") {
        if (d === 1) return { from: iso(utc(y, m - 1, 16)), to: iso(addDays(t, -1)) }
        if (d === 16) return { from: iso(utc(y, m, 1)), to: iso(utc(y, m, 15)) }
        return null
    }
    if (d !== 1) return null
    return { from: iso(utc(y, m - 1, 1)), to: iso(addDays(t, -1)) }
}

/** The next day on or after `from` that a report of this frequency goes out. */
export function nextSendDay(frequency: ReportFrequency, from: Date): Date {
    let t = startOfDay(from)
    for (let i = 0; i < 40; i++) {
        if (periodEndingBefore(frequency, t)) return t
        t = addDays(t, 1)
    }
    return t
}

/** The most recent full period (for a manual preview): the one the last send day covered. */
export function lastFullPeriod(frequency: ReportFrequency, today: Date): DayRange {
    let t = startOfDay(today)
    for (let i = 0; i < 40; i++) {
        const p = periodEndingBefore(frequency, t)
        if (p) return p
        t = addDays(t, -1)
    }
    throw new Error("No period found")
}


/** "Sep 21 to Sep 27, 2026", or across years "Dec 16, 2025 to Jan 1, 2026". */
export function periodLabel(p: DayRange): string {
    const a = new Date(`${p.from}T00:00:00Z`), b = new Date(`${p.to}T00:00:00Z`)
    const md = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    return a.getUTCFullYear() === b.getUTCFullYear()
        ? `${md(a)} to ${md(b)}, ${b.getUTCFullYear()}`
        : `${md(a)}, ${a.getUTCFullYear()} to ${md(b)}, ${b.getUTCFullYear()}`
}
