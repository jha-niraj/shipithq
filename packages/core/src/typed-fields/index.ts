/**
 * @repo/core/typed-fields - a question someone defines ("Do you have a bike?", yes / no) and the typed answer to it, shared
 * by every feature that lets a school ask its own questions (plan/main/settings/settings-manual-pass-2026-10-21.md D2).
 *
 * Pure - no React, no database. One definition (`FieldDef`), checked by one zod schema (`fieldDefSchema`) and one
 * plain-words check (`fieldDefProblem`); one reader that turns what was typed or said into a typed value
 * (`validateAnswer`); one way to show it (`formatAnswer`), store it as text (`answerText`) and tell an AI interviewer
 * what to expect (`describeForPrompt`). The React pieces (editor, input, read-only view) are in @repo/ui at
 * `@repo/ui/components/typed-fields/*`.
 *
 * Core stays free of the calendar package: reading a BS date needs a BS -> AD converter and showing a date in the
 * school's calendar needs a formatter, both passed in (`getAdDateFromBs` and `formatSchoolDate` from @repo/calendar).
 * Without the converter a date said as BS is refused, never guessed.
 *
 * Typed values: short / long text -> string, yes / no -> boolean, number -> number, date -> AD 'YYYY-MM-DD' string,
 * email -> lower-cased string, phone -> digits with an optional leading +, one choice -> string (the option as
 * written), several choices -> string[] (in the order said), document -> { fileKey, fileName?, number?, expiresAt? }
 * (the upload itself is the caller's - this kit never knows storage).
 *
 * Stored data needs no migration: `normalizeFieldType` reads the older type names (text, textarea, checkbox, select,
 * multiselect, one_choice, many_choices...) and `readFieldDef` reads a stored definition tolerantly (more than eight
 * choices from old data are kept); the strict rules (`fieldDefProblem`, `fieldDefSchema`) are for NEW definitions.
 */
import { z } from 'zod';

/** A BS -> AD converter, e.g. `getAdDateFromBs` from @repo/calendar (a local-midnight Date, or null when not a real BS date). */
export type BsToAd = (year: number, month: number, day: number) => Date | null;
/** Shows an AD 'YYYY-MM-DD' in the school's calendar, e.g. `(d) => formatSchoolDate(d, calendarSystem)` from @repo/calendar. */
export type FormatDate = (adIso: string) => string;

// ─── Definitions ─────────────────────────────────────────────────────────────

/** Every answer type, in the order a picker lists them. */
export const FIELD_TYPES = [
    'short_text', 'long_text', 'number', 'date', 'yes_no', 'email', 'phone', 'single_choice', 'multi_choice', 'document',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
    short_text: 'Short text',
    long_text: 'Long text',
    number: 'Number',
    date: 'Date',
    yes_no: 'Yes / No',
    email: 'Email',
    phone: 'Phone',
    single_choice: 'One choice',
    multi_choice: 'Several choices',
    document: 'Document',
};

/** Older names for the same types, as stored by earlier features - read through `normalizeFieldType`. */
const LEGACY_TYPE: Record<string, FieldType> = {
    text: 'short_text', short: 'short_text', string: 'short_text',
    textarea: 'long_text', long: 'long_text', paragraph: 'long_text',
    checkbox: 'yes_no', yesno: 'yes_no', boolean: 'yes_no', bool: 'yes_no',
    select: 'single_choice', one_choice: 'single_choice', single: 'single_choice', radio: 'single_choice', choice: 'single_choice',
    multiselect: 'multi_choice', many_choices: 'multi_choice', multiple_choice: 'multi_choice', multi: 'multi_choice', checkboxes: 'multi_choice',
    file: 'document', paper: 'document', upload: 'document',
    tel: 'phone', mobile: 'phone', integer: 'number', decimal: 'number',
};

/** A stored type name (current or older) as a FieldType; null when it is not one. */
export function normalizeFieldType(raw: unknown): FieldType | null {
    if (typeof raw !== 'string') return null;
    const t = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if ((FIELD_TYPES as readonly string[]).includes(t)) return t as FieldType;
    return LEGACY_TYPE[t] ?? LEGACY_TYPE[t.replace(/_/g, '')] ?? null;
}

export const FIELD_LABEL_MIN = 3;
export const FIELD_LABEL_MAX = 120;
export const FIELD_OPTIONS_MIN = 2;
export const FIELD_OPTIONS_MAX = 8;
export const FIELD_OPTION_MAX = 60;
export const FIELD_HELP_MAX = 200;
export const FIELD_PLACEHOLDER_MAX = 80;
/** The longest text answer kept (a def's own `maxLength` may set it lower). */
export const TEXT_ANSWER_MAX = { short_text: 300, long_text: 2000 } as const;

/**
 * One question someone defined. `options` only for the choice types; `minLength` / `maxLength` only for text (short or
 * long); `min` / `max` only for a number.
 */
export interface FieldDef {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[];
    help?: string;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

/** A document answer: the stored file (an R2 key or URL - the caller's), its name, and the paper's number and expiry (AD). */
export interface DocumentValue { fileKey: string; fileName?: string; number?: string; expiresAt?: string }

/** A definition being written (the editor's state) - the id is made by whoever stores it. */
export type FieldDefDraft = Omit<FieldDef, 'id'> & { id?: string };

/** An answer read by its type. */
export type TypedValue = boolean | number | string | string[] | DocumentValue;

/** Exactly a current type name (no legacy names - use `normalizeFieldType` for stored data). */
export function isFieldType(t: unknown): t is FieldType {
    return typeof t === 'string' && (FIELD_TYPES as readonly string[]).includes(t);
}

export function isTextType(t: FieldType): t is 'short_text' | 'long_text' {
    return t === 'short_text' || t === 'long_text';
}

export function isDocumentValue(v: unknown): v is DocumentValue {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v) && typeof (v as { fileKey?: unknown }).fileKey === 'string';
}

export function isChoiceType(t: FieldType): t is 'single_choice' | 'multi_choice' {
    return t === 'single_choice' || t === 'multi_choice';
}

const tidy = (s: string) => s.trim().replace(/\s+/g, ' ');

/** The choices as stored: trimmed, empty ones dropped. Duplicates are refused by `fieldDefProblem`, never merged silently. */
export function tidyOptions(options: readonly string[] | undefined): string[] {
    return (options ?? []).map(tidy).filter((o) => o.length > 0);
}

/**
 * Limits a feature may widen. `maxOptions`: a feature whose choices are stored as their own rows and picked from a
 * list on screen (a school's bus routes) can hold more than the eight a question that is read out loud can.
 */
export interface FieldDefLimits { maxOptions?: number }

/**
 * Why a definition cannot be saved, in plain words, or null when it is fine. The same rules as `fieldDefSchema`, for a
 * form to show before it sends. Choices may not hold a comma: several choices are said and stored comma-separated.
 */
export function fieldDefProblem(
    def: Pick<FieldDefDraft, 'label' | 'type' | 'options' | 'min' | 'max' | 'minLength' | 'maxLength'>,
    n?: number,
    limits: FieldDefLimits = {},
): string | null {
    const which = n ? `Question ${n}` : 'This question';
    const maxOptions = limits.maxOptions ?? FIELD_OPTIONS_MAX;
    const label = tidy(def.label ?? '');
    if (label.length < FIELD_LABEL_MIN) return `${which}: write the question (at least ${FIELD_LABEL_MIN} letters).`;
    if (label.length > FIELD_LABEL_MAX) return `${which} is too long - keep it under ${FIELD_LABEL_MAX} characters.`;
    if (!isFieldType(def.type)) return `${which}: pick how it is answered.`;
    if (def.type === 'number' && def.min !== undefined && def.max !== undefined && def.min > def.max) return `${which}: the lowest number is above the highest.`;
    if (isTextType(def.type)) {
        if ((def.minLength ?? 0) < 0 || (def.maxLength !== undefined && def.maxLength < 1)) return `${which}: the length limits are not right.`;
        if (def.minLength !== undefined && def.maxLength !== undefined && def.minLength > def.maxLength) return `${which}: the shortest length is above the longest.`;
    }
    if (!isChoiceType(def.type)) return null;
    const opts = tidyOptions(def.options);
    if (opts.length < FIELD_OPTIONS_MIN) return `${which}: give at least ${FIELD_OPTIONS_MIN} choices.`;
    if (opts.length > maxOptions) return `${which}: at most ${maxOptions} choices.`;
    if (opts.some((o) => o.length > FIELD_OPTION_MAX)) return `${which}: keep each choice under ${FIELD_OPTION_MAX} characters.`;
    if (opts.some((o) => o.includes(','))) return `${which}: a choice cannot contain a comma.`;
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) return `${which} has the same choice twice.`;
    return null;
}

const fieldDefShape = {
    label: z.string().max(FIELD_LABEL_MAX * 2),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(true),
    options: z.array(z.string().max(FIELD_OPTION_MAX * 2)).max(FIELD_OPTIONS_MAX * 2).optional(),
    help: z.string().max(FIELD_HELP_MAX).optional(),
    placeholder: z.string().max(FIELD_PLACEHOLDER_MAX).optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(1).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
};

function refineDef(def: Pick<FieldDefDraft, 'label' | 'type' | 'options' | 'min' | 'max' | 'minLength' | 'maxLength'>, ctx: z.RefinementCtx) {
    const problem = fieldDefProblem(def);
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
}

/** A NEW definition (with its id). Label 3-120 characters; 2-8 unique comma-free choices for the choice types. */
export const fieldDefSchema = z.object({ id: z.string().min(1).max(80), ...fieldDefShape }).superRefine(refineDef);
/** A definition from a form, before it has an id. */
export const fieldDefDraftSchema = z.object({ id: z.string().max(80).optional(), ...fieldDefShape }).superRefine(refineDef);

/** A definition as stored: label and choices tidied, choices only on the choice types, min / max only on a number. */
export function tidyFieldDef<T extends FieldDefDraft>(def: T): T {
    const out: T = { ...def, label: tidy(def.label).slice(0, FIELD_LABEL_MAX), required: def.required !== false };
    if (isChoiceType(def.type)) out.options = tidyOptions(def.options); else delete out.options;
    if (def.type !== 'number') { delete out.min; delete out.max; }
    if (!isTextType(def.type)) { delete out.minLength; delete out.maxLength; }
    if (out.help !== undefined) { out.help = tidy(out.help).slice(0, FIELD_HELP_MAX); if (!out.help) delete out.help; }
    if (out.placeholder !== undefined) { out.placeholder = tidy(out.placeholder).slice(0, FIELD_PLACEHOLDER_MAX); if (!out.placeholder) delete out.placeholder; }
    return out;
}

/**
 * What one edit did to a definition's list of choices - the editor reports it with each change, so a caller that keeps
 * something beside every choice (a stored option's id, so renaming a choice keeps the answers that point at it) can
 * apply the same edit to that list with `applyOptionChange`. `resize` = the type changed: the first choices are kept, the
 * list cut or padded with empty ones to `length`.
 */
export type OptionChange =
    | { kind: 'edit'; index: number }
    | { kind: 'add' }
    | { kind: 'remove'; index: number }
    | { kind: 'move'; from: number; to: number }
    | { kind: 'resize'; length: number };

/** Apply an editor's choice edit to a list kept beside the choices; `blank` fills an added slot. */
export function applyOptionChange<T>(list: readonly T[], change: OptionChange, blank: T): T[] {
    switch (change.kind) {
        case 'edit': return [...list];
        case 'add': return [...list, blank];
        case 'remove': return list.filter((_, i) => i !== change.index);
        case 'move': {
            if (change.from < 0 || change.from >= list.length) return [...list];
            const next = [...list];
            const [moved] = next.splice(change.from, 1) as [T];
            next.splice(Math.max(0, Math.min(change.to, next.length)), 0, moved);
            return next;
        }
        case 'resize': return Array.from({ length: change.length }, (_, i) => (i < list.length ? list[i] as T : blank));
    }
}

/**
 * A stored definition read tolerantly - older type names (`normalizeFieldType`), `key` for `id`, `isRequired` for
 * `required`, choices as strings or { label } / { value } objects, and any number of them. Null when it has no id, no
 * label or no type that reads. Never use it to accept a NEW definition (that is `fieldDefSchema`).
 */
export function readFieldDef(raw: unknown): FieldDef | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : typeof r.key === 'string' ? r.key : '';
    const label = typeof r.label === 'string' ? tidy(r.label) : '';
    const type = normalizeFieldType(r.type);
    if (!id || !label || !type) return null;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const options = Array.isArray(r.options)
        ? tidyOptions(r.options.map((o) => (typeof o === 'string' ? o : o && typeof o === 'object'
            ? String((o as { label?: unknown; value?: unknown }).label ?? (o as { value?: unknown }).value ?? '') : '')))
        : [];
    const def: FieldDef = {
        id, label, type,
        required: r.required !== undefined ? r.required !== false : r.isRequired === true,
        ...(isChoiceType(type) ? { options } : {}),
        ...(str(r.help) ?? str(r.helpText) ? { help: str(r.help) ?? str(r.helpText) } : {}),
        ...(str(r.placeholder) ? { placeholder: str(r.placeholder) } : {}),
        ...(isTextType(type) && num(r.minLength) !== undefined ? { minLength: num(r.minLength) } : {}),
        ...(isTextType(type) && num(r.maxLength) !== undefined ? { maxLength: num(r.maxLength) } : {}),
        ...(type === 'number' && num(r.min) !== undefined ? { min: num(r.min) } : {}),
        ...(type === 'number' && num(r.max) !== undefined ? { max: num(r.max) } : {}),
    };
    return def;
}

// ─── Reading an answer ───────────────────────────────────────────────────────

const NEPALI_DIGITS = '०१२३४५६७८९';

/** Nepali digits (०-९) as ASCII, so "५" and "२०४५-०३-१२" read like "5" and "2045-03-12". */
export function asciiDigits(s: string): string {
    return s.replace(/[०-९]/g, (d) => String(NEPALI_DIGITS.indexOf(d)));
}

/** "Yes" and "no" as people say them - English, Romanised Nepali and Devanagari. */
const YES_WORDS = new Set(['yes', 'y', 'yeah', 'yep', 'yup', 'sure', 'true', '1', 'ho', 'cha', 'chha', 'huncha', 'hunchha', 'हो', 'छ', 'हुन्छ']);
const NO_WORDS = new Set(['no', 'n', 'nope', 'false', '0', 'haina', 'hoina', 'hoeina', 'chaina', 'chhaina', 'hudaina', 'hundaina', 'होइन', 'हैन', 'छैन', 'हुँदैन', 'हुदैन']);

/** Read a yes or a no from the whole answer or its first word; null when it is neither (never guessed). */
export function parseYesNo(raw: string): boolean | null {
    const v = raw.trim().toLowerCase().replace(/[.!?।,]+$/u, '').trim();
    if (!v) return null;
    if (YES_WORDS.has(v)) return true;
    if (NO_WORDS.has(v)) return false;
    const first = v.split(/[\s,.!।]+/u)[0] ?? '';
    if (NO_WORDS.has(first)) return false;
    if (YES_WORDS.has(first)) return true;
    return null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Read a date said or typed as BS or AD - "2083-01-15 BS", "2026/4/28 AD", "२०८३-०१-१५" - as an AD 'YYYY-MM-DD'.
 * With no BS/AD said: a year up to ten years ahead of this AD year is AD, thirty or more ahead is BS (BS runs about
 * 57 years ahead), anything between is refused as unclear - the person is asked to say which.
 */
export function parseAnyDate(raw: string, o: { bsToAd?: BsToAd; now?: Date } = {}): { ok: true; ad: string } | { ok: false; error: string } {
    const now = o.now ?? new Date();
    const text = asciiDigits(raw.trim()).toUpperCase().replace(/\s+/g, ' ');
    const said = /\bB\.?\s?S\.?$/.test(text) ? 'BS' : /\bA\.?\s?D\.?$/.test(text) ? 'AD' : null;
    const m = /^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})\b/.exec(text);
    if (!m) return { ok: false, error: 'not a date like 2083-01-15 BS' };
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mo < 1 || mo > 12 || d < 1 || d > 32) return { ok: false, error: 'not a real date' };
    const thisYear = now.getFullYear();
    const cal = said ?? (y <= thisYear + 10 ? 'AD' : y >= thisYear + 30 ? 'BS' : null);
    if (!cal) return { ok: false, error: 'unclear whether that is BS or AD - say which' };
    if (cal === 'BS') {
        if (!o.bsToAd) return { ok: false, error: 'a BS date cannot be read here - give it in AD' };
        const date = o.bsToAd(y, mo, d);
        if (!date) return { ok: false, error: 'not a real BS date' };
        // The converter builds a local-midnight Date, so its local parts are the AD calendar day.
        return { ok: true, ad: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` };
    }
    const check = new Date(Date.UTC(y, mo - 1, d));
    if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || y < 1900 || y > 2200) return { ok: false, error: 'not a real date' };
    return { ok: true, ad: `${y}-${pad2(mo)}-${pad2(d)}` };
}

/** Where `needle` sits in `hay` as whole words (not inside another word), or -1. */
function wordIndex(hay: string, needle: string): number {
    if (!needle) return -1;
    const edge = (c: string | undefined) => c === undefined || !/[\p{L}\p{N}]/u.test(c);
    for (let from = 0; ;) {
        const i = hay.indexOf(needle, from);
        if (i < 0) return -1;
        if (edge(hay[i - 1]) && edge(hay[i + needle.length])) return i;
        from = i + 1;
    }
}

/** The option as written, matched case-insensitively (trailing full stop ignored); null when it is not one of them. */
function matchOption(options: readonly string[], raw: string): string | null {
    const said = raw.trim().replace(/[.!?।]+$/u, '').trim().toLowerCase();
    return options.find((o) => o.toLowerCase() === said) ?? null;
}

/**
 * Several choices out of one answer ("Football and music", "football, music"): every choice named is matched to an
 * option (longest first, so "Arts and crafts" is not split), and anything left that is not a separator (comma, "and",
 * "or", "र") is refused - a choice that is not on the list is never dropped silently.
 */
function pickMany(options: readonly string[], raw: string): { ok: true; picked: string[] } | { ok: false; error: string } {
    const opts = [...options].sort((a, b) => b.length - a.length);
    let rest = raw.toLowerCase();
    const hits: { at: number; value: string }[] = [];
    for (const o of opts) {
        const i = wordIndex(rest, o.toLowerCase());
        if (i < 0) continue;
        hits.push({ at: i, value: o });
        rest = `${rest.slice(0, i)}${' '.repeat(o.length)}${rest.slice(i + o.length)}`;
    }
    const leftover = rest.replace(/[,;/&|+.]/g, ' ').replace(/(^|\s)(and|or|also|र|अनि|ra)(?=\s|$)/giu, ' ').replace(/\s+/g, ' ').trim();
    if (hits.length === 0) return { ok: false, error: 'none of the choices' };
    if (leftover) return { ok: false, error: `"${leftover.slice(0, 40)}" is not one of the choices` };
    return { ok: true, picked: [...new Set(hits.sort((a, b) => a.at - b.at).map((h) => h.value))] };
}

export type AnswerResult = { ok: true; value: TypedValue } | { ok: false; error: string };

/**
 * Read one answer by its question's type. `raw` is what was typed or said (text), or a value straight from a typed
 * control (a boolean, a number, an ISO date, a list of choices). Never invents a value: a choice that is not on the
 * list, "maybe" for yes / no, or "last year" for a date is refused with a short reason (`error`) to ask again by. An
 * empty answer is refused as 'empty' - whether it may be left empty is the caller's (`def.required`).
 */
export function validateAnswer(
    def: Pick<FieldDef, 'type' | 'options' | 'min' | 'max' | 'minLength' | 'maxLength'>,
    raw: TypedValue | null | undefined,
    opts: { bsToAd?: BsToAd; now?: Date } = {},
): AnswerResult {
    if (raw === null || raw === undefined) return { ok: false, error: 'empty' };
    if (def.type === 'document') {
        if (!isDocumentValue(raw)) return { ok: false, error: typeof raw === 'string' && !raw.trim() ? 'empty' : 'a document is uploaded, not typed' };
        if (!raw.fileKey.trim()) return { ok: false, error: 'empty' };
        const out: DocumentValue = { fileKey: raw.fileKey.trim() };
        if (raw.fileName?.trim()) out.fileName = raw.fileName.trim().slice(0, 200);
        if (raw.number?.trim()) out.number = tidy(raw.number).slice(0, 60);
        if (raw.expiresAt?.trim()) {
            const d = parseAnyDate(raw.expiresAt, opts);
            if (!d.ok) return { ok: false, error: `expiry date ${d.error}` };
            out.expiresAt = d.ad;
        }
        return { ok: true, value: out };
    }
    if (isDocumentValue(raw)) return { ok: false, error: 'not a document question' };
    switch (def.type) {
        case 'email': {
            const e = String(raw).trim().toLowerCase();
            if (!e) return { ok: false, error: 'empty' };
            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? { ok: true, value: e.slice(0, 200) } : { ok: false, error: 'not an email address' };
        }
        case 'phone': {
            const text = asciiDigits(String(raw)).trim();
            if (!text) return { ok: false, error: 'empty' };
            // Digits, spaces, dashes, dots and brackets, with an optional leading +; kept as + and digits.
            if (!/^\+?[\d\s().-]+$/.test(text)) return { ok: false, error: 'not a phone number' };
            const digits = text.replace(/\D/g, '');
            if (digits.length < 7 || digits.length > 15) return { ok: false, error: 'not a phone number' };
            return { ok: true, value: `${text.startsWith('+') ? '+' : ''}${digits}` };
        }
        case 'yes_no': {
            if (typeof raw === 'boolean') return { ok: true, value: raw };
            const yes = parseYesNo(String(raw));
            return yes === null ? { ok: false, error: String(raw).trim() ? 'not a yes or a no' : 'empty' } : { ok: true, value: yes };
        }
        case 'number': {
            let n: number;
            if (typeof raw === 'number') n = raw;
            else {
                const text = asciiDigits(String(raw)).trim().replace(/,/g, '');
                if (!text) return { ok: false, error: 'empty' };
                // "5", "1,200", "५", or a number with its unit after it ("5 years", "५ वर्ष").
                const m = /^(-?\d+(?:\.\d+)?)(?:\s+[^\d]*)?$/u.exec(text);
                n = m ? Number(m[1]) : NaN;
            }
            if (!Number.isFinite(n)) return { ok: false, error: 'not a number' };
            if (def.min !== undefined && n < def.min) return { ok: false, error: `below ${def.min}` };
            if (def.max !== undefined && n > def.max) return { ok: false, error: `above ${def.max}` };
            return { ok: true, value: n };
        }
        case 'date': {
            const text = String(raw).trim();
            if (!text) return { ok: false, error: 'empty' };
            const d = parseAnyDate(text, opts);
            return d.ok ? { ok: true, value: d.ad } : { ok: false, error: d.error };
        }
        case 'single_choice': {
            const text = Array.isArray(raw) ? raw[0] ?? '' : String(raw);
            if (!text.trim()) return { ok: false, error: 'empty' };
            const hit = matchOption(def.options ?? [], text);
            return hit ? { ok: true, value: hit } : { ok: false, error: 'not one of the choices' };
        }
        case 'multi_choice': {
            const options = def.options ?? [];
            if (Array.isArray(raw)) {
                if (raw.length === 0) return { ok: false, error: 'empty' };
                const picked: string[] = [];
                for (const r of raw) {
                    const hit = matchOption(options, r);
                    if (!hit) return { ok: false, error: `"${r.slice(0, 40)}" is not one of the choices` };
                    if (!picked.includes(hit)) picked.push(hit);
                }
                return { ok: true, value: picked };
            }
            const text = String(raw).trim();
            if (!text) return { ok: false, error: 'empty' };
            const r = pickMany(options, text);
            return r.ok ? { ok: true, value: r.picked } : r;
        }
        default: {
            const text = String(raw).trim().replace(def.type === 'short_text' ? /\s+/g : /[^\S\n]+/g, ' ');
            if (!text) return { ok: false, error: 'empty' };
            if (def.minLength !== undefined && text.length < def.minLength) return { ok: false, error: `shorter than ${def.minLength} characters` };
            return { ok: true, value: text.slice(0, Math.min(def.maxLength ?? Infinity, TEXT_ANSWER_MAX[def.type])) };
        }
    }
}

/** A typed value as one line of text, for a record that keeps text ("Yes", "5", "2026-04-28", "Football, Music"). */
export function answerText(def: Pick<FieldDef, 'type'>, value: TypedValue): string {
    if (isDocumentValue(value)) {
        return [value.fileName ?? 'Uploaded', value.number ? `no. ${value.number}` : null, value.expiresAt ? `expires ${value.expiresAt}` : null]
            .filter(Boolean).join(', ');
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (def.type === 'yes_no') {
        const yes = parseYesNo(String(value));
        if (yes !== null) return yes ? 'Yes' : 'No';
    }
    return String(value);
}

/**
 * A stored answer for people to read: Yes / No, a date in the school's calendar (`formatDate`; the AD date as stored
 * without it), the choices joined. Takes a typed value, or the text an older record kept (it is read again, and shown
 * as it was when it does not read).
 */
export function formatAnswer(def: Pick<FieldDef, 'type' | 'options'>, value: TypedValue | null | undefined, o: { formatDate?: FormatDate } = {}): string {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return '';
    if (isDocumentValue(value)) {
        const exp = value.expiresAt && o.formatDate ? o.formatDate(value.expiresAt) : value.expiresAt;
        return [value.fileName ?? 'Uploaded', value.number ? `no. ${value.number}` : null, exp ? `expires ${exp}` : null].filter(Boolean).join(', ');
    }
    if (def.type === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return o.formatDate ? o.formatDate(value) : value;
    }
    if (def.type === 'yes_no' && typeof value !== 'boolean') {
        const yes = parseYesNo(String(value));
        return yes === null ? String(value) : yes ? 'Yes' : 'No';
    }
    if (def.type === 'multi_choice' && typeof value === 'string') return value;
    if (typeof value === 'number') return value.toLocaleString('en-IN');
    return answerText(def, value);
}

/**
 * What an AI interviewer should expect, in one line it can follow ("Answer yes or no", "Pick one of: A / B"). The
 * value it hands back is then read by `validateAnswer`, so the wording matches what that accepts.
 */
export function describeForPrompt(def: Pick<FieldDef, 'type' | 'options' | 'min' | 'max'>): string {
    const opts = tidyOptions(def.options);
    switch (def.type) {
        case 'yes_no':
            return 'Answer yes or no - ask it so it can be answered yes or no; value is "yes" or "no" (हो / होइन / haina count too).';
        case 'number': {
            const range = def.min !== undefined && def.max !== undefined ? ` from ${def.min} to ${def.max}`
                : def.min !== undefined ? ` of at least ${def.min}` : def.max !== undefined ? ` of at most ${def.max}` : '';
            return `Answer with a number${range} - value is digits only, e.g. 5.`;
        }
        case 'date':
            return 'Answer with a date - value is YYYY-MM-DD, with BS or AD after it when they said which.';
        case 'single_choice':
            return `Pick ONE of: ${opts.join(' / ')} - read the choices out; value is that choice exactly as listed.`;
        case 'multi_choice':
            return `Pick one or more of: ${opts.join(' / ')} - read the choices out; value is the chosen ones exactly as listed, separated by commas.`;
        case 'email':
            return 'Answer with an email address - value is the address, e.g. sita@example.com.';
        case 'phone':
            return 'Answer with a phone number - value is the digits, with + and the country code if they gave one.';
        case 'document':
            return 'A document to upload with the button on the screen (a photo or a file) - it is not said; value is null.';
        case 'long_text':
            return 'Answer in their own words (a few sentences at most).';
        default:
            return 'A short answer.';
    }
}
