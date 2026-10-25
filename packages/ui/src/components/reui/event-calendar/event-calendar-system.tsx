// Title: Event Calendar System
// Description: The ONE place the event calendar does calendar-system math. AD (Gregorian, as ReUI
// ships) and BS (Bikram Sambat, Nepal) share one API - month range, month step, same-month/year,
// and a date-fns-compatible formatter - so the views never branch on the system themselves.
//
// Contract: every Date stays an AD instant (events, drag/drop, recurrence, ranges). BS only moves
// the month BOUNDARIES (a BS month starts mid-AD-month) and changes the LABELS (day numbers, month
// names, years). Weekdays are calendar-independent, so weekday tokens are left to date-fns.

import {
  BS_MONTHS_ABBR,
  BS_MONTHS_LONG,
  getAdDateFromBs,
  getBsPartsFromAd,
  type SchoolCalendarSystem,
} from "@repo/calendar"
import { TZDate } from "@date-fns/tz"
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isSameMonth,
  isSameYear,
  startOfMonth,
  type Locale,
} from "date-fns"

type EventCalendarSystem = SchoolCalendarSystem

/** Nepal's zone. A BS calendar with no explicit timeZone highlights the Nepal local day. */
const BS_DEFAULT_TIME_ZONE = "Asia/Kathmandu"

interface BsParts {
  year: number
  month: number
  day: number
}

/**
 * BS parts of the day a (zoned) date names. Reads the date's own wall-clock fields - a TZDate's
 * are the display zone's - and converts THAT calendar day at local noon, so the host machine's
 * zone can never shift the answer by a day.
 */
function bsPartsOf(date: Date): BsParts | null {
  return getBsPartsFromAd(
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  )
}

/** Display-zone midnight of BS year/month/day, or null outside the converter's range. */
function zonedFromBs(
  year: number,
  month: number,
  day: number,
  timeZone: string
): TZDate | null {
  const ad = getAdDateFromBs(year, month, day)
  if (!ad) return null
  return new TZDate(ad.getFullYear(), ad.getMonth(), ad.getDate(), timeZone)
}

function shiftBsMonth(year: number, month: number, by: number) {
  const index = year * 12 + (month - 1) + by
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** BS month containing the zoned date, as display-zone midnights [start, end). */
function bsMonthRange(
  zoned: Date,
  timeZone: string
): { start: Date; end: Date } | null {
  const parts = bsPartsOf(zoned)
  if (!parts) return null
  const next = shiftBsMonth(parts.year, parts.month, 1)
  const start = zonedFromBs(parts.year, parts.month, 1, timeZone)
  const end = zonedFromBs(next.year, next.month, 1, timeZone)
  if (!start || !end) return null
  return { start, end }
}

/**
 * The month (in the calendar system) containing `zoned`, half-open. AD is exactly ReUI's
 * startOfMonth pair; BS falls back to it only when the date is outside the BS converter's range.
 */
function getCalendarMonthRange(
  zoned: Date,
  calendarSystem: EventCalendarSystem,
  timeZone: string
): { start: Date; end: Date } {
  if (calendarSystem === "BS") {
    const range = bsMonthRange(zoned, timeZone)
    if (range) return range
  }
  return { start: startOfMonth(zoned), end: startOfMonth(addMonths(zoned, 1)) }
}

/** Day of month of the last day of the AD month containing the zoned date. */
function lastDayOfZonedMonth(date: Date): number {
  return addDays(startOfMonth(addMonths(date, 1)), -1).getDate()
}

/**
 * The anchor stepped one month. A month-end anchor sticks to the target month's end (so
 * next-then-prev from the 31st, or from 32 Ashadh, comes back to where it started); any other day
 * clamps into a shorter month. The time of day is kept.
 */
function stepCalendarMonth(
  zoned: Date,
  direction: 1 | -1,
  calendarSystem: EventCalendarSystem,
  timeZone: string
): Date {
  if (calendarSystem === "BS") {
    const parts = bsPartsOf(zoned)
    const current = bsMonthRange(zoned, timeZone)
    if (parts && current) {
      const target = shiftBsMonth(parts.year, parts.month, direction)
      const targetStart = zonedFromBs(target.year, target.month, 1, timeZone)
      const after = shiftBsMonth(target.year, target.month, 1)
      const targetEnd = zonedFromBs(after.year, after.month, 1, timeZone)
      if (targetStart && targetEnd) {
        const currentLen = differenceInCalendarDays(current.end, current.start)
        const targetLen = differenceInCalendarDays(targetEnd, targetStart)
        const day =
          parts.day >= currentLen ? targetLen : Math.min(parts.day, targetLen)
        const stepped = addDays(targetStart, day - 1)
        stepped.setHours(
          zoned.getHours(),
          zoned.getMinutes(),
          zoned.getSeconds(),
          zoned.getMilliseconds()
        )
        return stepped
      }
    }
  }
  const stepped = addMonths(zoned, direction)
  // addMonths clamps the day down into a shorter month and never restores
  // it, so next-then-prev from the 31st would leave the anchor on the 28th.
  // Sticking a month end to the target month's end keeps stepping
  // invertible, which matters because the anchor is what day and week view
  // open on after a month navigation.
  if (zoned.getDate() !== lastDayOfZonedMonth(zoned)) return stepped
  return addDays(stepped, lastDayOfZonedMonth(stepped) - stepped.getDate())
}

function isSameCalendarMonth(
  a: Date,
  b: Date,
  calendarSystem: EventCalendarSystem
): boolean {
  if (calendarSystem === "BS") {
    const pa = bsPartsOf(a)
    const pb = bsPartsOf(b)
    if (pa && pb) return pa.year === pb.year && pa.month === pb.month
  }
  return isSameMonth(a, b)
}

function isSameCalendarYear(
  a: Date,
  b: Date,
  calendarSystem: EventCalendarSystem
): boolean {
  if (calendarSystem === "BS") {
    const pa = bsPartsOf(a)
    const pb = bsPartsOf(b)
    if (pa && pb) return pa.year === pb.year
  }
  return isSameYear(a, b)
}

// date-fns localized-date tokens, expanded so their y/M/d parts can be rewritten.
const LONG_DATE_PATTERNS: Record<number, string> = {
  1: "MM/dd/yyyy",
  2: "MMM d, yyyy",
  3: "MMMM do, yyyy",
  4: "EEEE, MMMM do, yyyy",
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  const rem10 = n % 10
  if (rem10 === 1) return `${n}st`
  if (rem10 === 2) return `${n}nd`
  if (rem10 === 3) return `${n}rd`
  return `${n}th`
}

function quote(text: string): string {
  return `'${text.replace(/'/g, "''")}'`
}

/**
 * Rewrites a date-fns format string so its year, month and day-of-month tokens print the BS date
 * as quoted literals; every other token (weekday, time, era) is left for date-fns.
 */
function rewriteForBs(fmt: string, parts: BsParts): string {
  let out = ""
  let i = 0
  while (i < fmt.length) {
    const ch = fmt[i]!
    if (ch === "'") {
      // copy a quoted literal verbatim, '' included
      let j = i + 1
      while (j < fmt.length) {
        if (fmt[j] === "'") {
          if (fmt[j + 1] === "'") {
            j += 2
            continue
          }
          break
        }
        j++
      }
      out += fmt.slice(i, j + 1)
      i = j + 1
      continue
    }
    if (!/[A-Za-z]/.test(ch)) {
      out += ch
      i++
      continue
    }
    let j = i
    while (fmt[j] === ch) j++
    const len = j - i
    if (ch === "P") {
      out += rewriteForBs(LONG_DATE_PATTERNS[Math.min(len, 4)]!, parts)
    } else if (ch === "y" || ch === "Y") {
      out += quote(
        len === 2 ? String(parts.year).slice(-2) : String(parts.year)
      )
    } else if (ch === "M" || ch === "L") {
      const index = parts.month - 1
      if (len === 1) out += quote(String(parts.month))
      else if (len === 2) out += quote(String(parts.month).padStart(2, "0"))
      else if (len === 3) out += quote(BS_MONTHS_ABBR[index] ?? "")
      else if (len === 4) out += quote(BS_MONTHS_LONG[index] ?? "")
      else out += quote((BS_MONTHS_LONG[index] ?? "").slice(0, 1))
    } else if (ch === "d") {
      if (len === 1 && fmt[j] === "o") {
        out += quote(ordinal(parts.day))
        j++
      } else {
        out += quote(
          len === 1 ? String(parts.day) : String(parts.day).padStart(2, "0")
        )
      }
    } else {
      out += fmt.slice(i, j)
    }
    i = j
  }
  return out
}

/**
 * date-fns `format` that speaks the calendar system. AD is a straight `format` call. BS prints the
 * BS year, month and day for y/M/L/d/do/P tokens; weekdays and times are unchanged. Pass the
 * ZONED date, as every view already does.
 */
function formatCalendarDate(
  date: Date,
  fmt: string,
  opts: { locale?: Locale; calendarSystem?: EventCalendarSystem }
): string {
  if (opts.calendarSystem === "BS") {
    const parts = bsPartsOf(date)
    if (parts) {
      return format(date, rewriteForBs(fmt, parts), { locale: opts.locale })
    }
  }
  return format(date, fmt, { locale: opts.locale })
}

/** A zoned date's calendar day as a plain local Date (for pickers that work in local days). */
function zonedToLocalDay(zoned: Date): Date {
  return new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate())
}

/** A picker's local day back to display-zone midnight. */
function localDayToZoned(day: Date, timeZone: string): Date {
  return new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), timeZone)
}

export {
  BS_DEFAULT_TIME_ZONE,
  formatCalendarDate,
  getCalendarMonthRange,
  isSameCalendarMonth,
  isSameCalendarYear,
  localDayToZoned,
  stepCalendarMonth,
  zonedToLocalDay,
}
export type { EventCalendarSystem }
