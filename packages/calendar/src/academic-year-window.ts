// The academic year as a window of time, worked out from a school's start month and calendar - the pure rule shared
// by apps/main (`getSchoolAcademicYearWindow`) and the academic_years seed script (plan configure-review D4).
import { getAdDateFromBs, getBsPartsFromAd, type SchoolCalendarSystem } from './calendar-system';

/** Nepal time, UTC+05:45 - a year starts at the school's local midnight. */
const NPT_MS = (5 * 60 + 45) * 60_000;

export interface ComputedAcademicYearWindow {
    /** "2026-27" - the AD form every academicYear column holds. */
    label: string;
    /** First instant of the year (Nepal midnight). */
    from: Date;
    /** First instant of the next year (exclusive). */
    to: Date;
    /** The start month used, 1-12. */
    startMonth: number;
}

/**
 * The year that contains `now`: from the 1st of the start month (default April) to a year later - or, for a BS school
 * on the Nepali session (the April default), from 1 Baisakh to the next 1 Baisakh.
 */
export function computeAcademicYearWindow(
    settings: { academicYearStart?: number | null; calendarSystem?: SchoolCalendarSystem | string | null },
    now: Date = new Date(),
): ComputedAcademicYearWindow {
    const raw = settings.academicYearStart ?? 4;
    const startMonth = raw >= 1 && raw <= 12 ? raw : 4;

    if (settings.calendarSystem === 'BS' && startMonth === 4) {
        const bs = getBsPartsFromAd(new Date(now.getTime() + NPT_MS));
        const start = bs ? getAdDateFromBs(bs.year, 1, 1) : null;
        const next = bs ? getAdDateFromBs(bs.year + 1, 1, 1) : null;
        if (start && next) {
            const atNptMidnight = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - NPT_MS);
            const y = start.getFullYear();
            return { label: `${y}-${String(y + 1).slice(2)}`, from: atNptMidnight(start), to: atNptMidnight(next), startMonth };
        }
    }

    const npt = new Date(now.getTime() + NPT_MS);
    const startYear = npt.getUTCMonth() >= startMonth - 1 ? npt.getUTCFullYear() : npt.getUTCFullYear() - 1;
    return {
        label: `${startYear}-${String(startYear + 1).slice(2)}`,
        from: new Date(Date.UTC(startYear, startMonth - 1, 1) - NPT_MS),
        to: new Date(Date.UTC(startYear + 1, startMonth - 1, 1) - NPT_MS),
        startMonth,
    };
}

/** The year after a window: same rule, worked out from a day inside the next year. */
export function computeNextAcademicYearWindow(
    settings: { academicYearStart?: number | null; calendarSystem?: SchoolCalendarSystem | string | null },
    current: { to: Date },
): ComputedAcademicYearWindow {
    return computeAcademicYearWindow(settings, new Date(current.to.getTime() + 15 * 86_400_000));
}
