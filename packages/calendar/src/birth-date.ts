import { getAdDateFromBs, getBsPartsFromAd } from './calendar-system';

// A staff member's date of birth, typed or spoken as BS or AD (plan/main/staff/voice-onboarding-and-profile.md,
// date of birth follow-up). Stored as an AD calendar date string ('YYYY-MM-DD') so it never shifts with time zones.

const NEPALI_DIGITS = '०१२३४५६७८९';

function asciiDigits(s: string): string {
	return s.replace(/[०-९]/g, (d) => String(NEPALI_DIGITS.indexOf(d)));
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Reads a birth date such as "2045-03-12", "2045/3/12 BS", "1988-06-26 AD" or "२०४५-०३-१२" and returns the AD date
 * as 'YYYY-MM-DD', or null when it isn't a real date for a working adult.
 *
 * Which calendar, when the text doesn't say: a year of 2015 or later is BS (an AD birth year that late would be a
 * child, and staff are adults); anything earlier is AD (a BS year before 2015 is before 1958 AD).
 */
export function parseBirthDate(raw: string, now: Date = new Date()): string | null {
	const text = asciiDigits(raw.trim()).toUpperCase().replace(/\s+/g, ' ');
	if (!text) return null;
	const said = /\bB\.?\s?S\.?$/.test(text) ? 'BS' : /\bA\.?\s?D\.?$/.test(text) ? 'AD' : null;
	const m = /^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/.exec(text);
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	if (mo < 1 || mo > 12 || d < 1 || d > 32) return null;

	let ad: string;
	if ((said ?? (y >= 2015 ? 'BS' : 'AD')) === 'BS') {
		const date = getAdDateFromBs(y, mo, d);
		if (!date) return null;
		// The converter builds a local-midnight Date, so its local parts are the AD calendar day.
		ad = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	} else {
		const check = new Date(Date.UTC(y, mo - 1, d));
		if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
		ad = `${y}-${pad(mo)}-${pad(d)}`;
	}

	const year = Number(ad.slice(0, 4));
	if (year < 1930 || year > now.getFullYear() - 14) return null;
	return ad;
}

/** The stored AD birth date in the school's own calendar, as 'YYYY-MM-DD' - for prefilling an edit box. */
export function birthDateForEdit(adDate: string | null | undefined, calendarSystem: 'AD' | 'BS'): string {
	if (!adDate) return '';
	if (calendarSystem === 'AD') return adDate;
	const p = getBsPartsFromAd(new Date(`${adDate}T00:00:00`));
	return p ? `${p.year}-${pad(p.month)}-${pad(p.day)}` : adDate;
}
