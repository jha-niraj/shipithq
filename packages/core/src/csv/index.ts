/**
 * CSV serialization - the one implementation, usable from a server action or a client component.
 *
 * Before this, the same ~10 lines were written out at least seven times across `main` and `admin`
 * (two `export-csv-button.tsx` files were byte-identical), plus five server actions building the
 * string by hand. Every copy carried the same three defects, and none of them were visible to the
 * person writing the eighth copy:
 *
 *  1. **No UTF-8 BOM, so Excel mojibaked every Nepali name.** Excel on Windows does not sniff UTF-8;
 *     without a leading BOM it decodes as the system codepage and Devanagari becomes garbage. On a
 *     platform for Nepali schools that is not a rounding error - it is most of the student list.
 *     The BOM is added by `downloadCsv` rather than here, so that a string built on the server and a
 *     string built in the browser both get it exactly once, at the single point where a file is
 *     actually produced.
 *  2. **CSV injection.** A cell beginning `=`, `+`, `-`, `@`, tab or CR is interpreted by Excel and
 *     Sheets as a FORMULA. A student nicknamed `=cmd|...` in a school's own data becomes code that
 *     runs on the machine of whoever opens the export. See `sanitizeForSpreadsheet` for why the
 *     obvious fix breaks finance exports and what is done instead.
 *  3. **`\n` line endings.** RFC 4180 specifies CRLF, and older Excel builds run rows together
 *     without it.
 *
 * Everything here is pure - no DOM, no Node APIs - so it imports cleanly into a server action, a
 * route handler, a Worker, or a `'use client'` component. The browser-side half (turning this string
 * into a file the user receives) lives in `@repo/core/documents`.
 */

/** A column definition: the header text, and how to get the cell value out of a row. */
export type CsvColumn<T> = {
    header: string;
    /**
     * `null` / `undefined` render as an empty cell, NOT the strings "null"/"undefined" - which is
     * what `String(value)` produced in several of the hand-written copies.
     */
    value: (row: T) => string | number | boolean | Date | null | undefined;
};

/** RFC 4180 line terminator. */
const CRLF = '\r\n';

/**
 * Neutralise spreadsheet formula injection without corrupting real data.
 *
 * The textbook fix is "prefix any cell starting with =+-@ with a single quote". Applied literally
 * that breaks this product: `-1500` is an ordinary refund amount in the finance exports, and every
 * negative number would arrive in the accountant's spreadsheet as the TEXT `'-1500`, unusable in a
 * formula and silently wrong in a total.
 *
 * So numbers are exempted first - if the whole cell parses as a finite number it cannot be a
 * formula, and it is passed through untouched. Only genuinely suspicious text is prefixed.
 */
function sanitizeForSpreadsheet(text: string): string {
    if (text === '') return text;
    if (!/^[=+\-@\t\r]/.test(text)) return text;
    // `-1500`, `+20`, `-3.5e4` are data, not formulas.
    if (Number.isFinite(Number(text))) return text;
    // The leading apostrophe tells Excel and Sheets "this is text". It is not part of the value and
    // is not displayed once the file is opened.
    return `'${text}`;
}

/**
 * Render one value as a quoted CSV field.
 *
 * Every field is quoted unconditionally rather than only when it contains a delimiter. It costs a
 * few bytes and removes a whole class of "this export is fine until a school puts a comma in its
 * address" bug.
 */
export function escapeCsvCell(value: string | number | boolean | Date | null | undefined): string {
    if (value === null || value === undefined) return '""';

    // Dates go out as ISO 8601. Locale formatting is a DISPLAY concern and belongs to the caller -
    // an export that says `2/3/2026` is ambiguous the moment it crosses a border, and these files
    // are read by accountants, ministries and other software.
    const text = value instanceof Date ? value.toISOString() : String(value);

    return `"${sanitizeForSpreadsheet(text).replace(/"/g, '""')}"`;
}

/**
 * Serialize rows to a CSV string, headers included.
 *
 *     const csv = toCsv(payments, [
 *         { header: 'School', value: (p) => p.schoolName },
 *         { header: 'Amount (NPR)', value: (p) => p.amountTotal },
 *         { header: 'Date', value: (p) => p.createdAt },
 *     ]);
 *
 * The column list is the single place a column's header and its value sit together, so the two
 * cannot drift out of alignment - which is exactly what a `headers` array plus a separate `rows`
 * array invited, and the reason a mismatch there shifts every subsequent column silently.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
    const head = columns.map((c) => escapeCsvCell(c.header)).join(',');
    const body = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(','));
    return [head, ...body].join(CRLF);
}

/**
 * Serialize a pre-built matrix - headers plus already-extracted rows.
 *
 * For the server actions that already had their values in `string[][]` shape. Prefer `toCsv` in new
 * code: this form cannot check that a row's width matches the header's.
 */
export function toCsvRows(
    headers: readonly string[],
    rows: readonly (readonly (string | number | boolean | Date | null | undefined)[])[],
): string {
    const head = headers.map(escapeCsvCell).join(',');
    const body = rows.map((row) => row.map(escapeCsvCell).join(','));
    return [head, ...body].join(CRLF);
}

/**
 * `report-2026-08-06.csv` - a filename that sorts chronologically and never collides across days.
 *
 * Takes the date rather than calling `new Date()` so it stays pure and testable, and so a caller
 * exporting "last month" can stamp the file with the period it covers instead of today.
 */
export function csvFilename(base: string, date: Date = new Date()): string {
    return `${base}-${date.toISOString().slice(0, 10)}.csv`;
}
