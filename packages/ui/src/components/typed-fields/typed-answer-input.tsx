'use client';

/**
 * The control for answering one typed question (plan/main/settings/settings-manual-pass-2026-10-21.md D2): a text
 * box, a longer text box, a number, the house date picker in the school's calendar, Yes / No, an email or phone box,
 * choice chips (one, or several; or a numbered list or a dropdown - `variant`), or a document (a file plus its number
 * and expiry). Controlled; `value` is the typed
 * value (undefined = nothing yet). The caller still reads it with `validateAnswer` from @repo/core/typed-fields
 * before saving.
 *
 * A document needs `onUpload`: the kit never knows storage - the caller uploads the file and returns its key.
 */
import { useRef, useState } from 'react';
import { ArrowRight, Check, FileUp } from 'lucide-react';
import { Spinner } from '../ui/spinner';
import { isDocumentValue, type DocumentValue, type FieldDef, type TypedValue } from '@repo/core/typed-fields';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { DatePicker } from '../ui/date-picker';
import { Input } from '../ui/input';
import { PhoneInput } from '../ui/phone-input';
import { NepaliDatePicker } from '../ui/nepali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const CHIP = 'h-9 cursor-pointer rounded-full border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const CHIP_ON = 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900';
const CHIP_OFF = 'border-neutral-200 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800';

export interface TypedAnswerInputProps {
    def: Pick<FieldDef, 'type' | 'label' | 'options' | 'min' | 'max' | 'maxLength' | 'placeholder'>;
    value: TypedValue | undefined;
    onChange: (value: TypedValue | undefined) => void;
    /** The school's calendar - the date picker shows BS or AD; the value is an AD 'YYYY-MM-DD' either way. */
    calendar?: 'AD' | 'BS';
    /** ISO-2 country the phone box starts on; defaults to the app's SchoolCountryProvider, else NP. */
    phoneCountry?: string;
    id?: string;
    placeholder?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    /**
     * Enter in a one-line box (short text, number, email, phone). In `rows`, also Enter or a double click on a row of
     * one choice or yes / no - the row is picked first, then this runs (a chat card uses it to move to the next question).
     */
    onEnter?: () => void;
    /**
     * How one choice, several choices and yes / no look: `chips` (the default) - pills in a wrapping line; `rows` - a
     * numbered list, one choice per line with its hint under it (a short list of readings in a chat card); `dropdown` -
     * a compact menu, for one choice out of a longer list (several choices and yes / no stay chips).
     */
    variant?: 'chips' | 'rows' | 'dropdown';
    /** A short line per choice, keyed by the option as written: under it in `rows`, after it in `dropdown`. */
    optionHints?: Record<string, string>;
    /** Documents only: upload the chosen file and return where it is stored (null = it failed; say why yourself). */
    onUpload?: (file: File) => Promise<{ fileKey: string; fileName?: string } | null>;
    className?: string;
}

export function TypedAnswerInput(props: TypedAnswerInputProps) {
    const { def, value, onChange, calendar = 'AD', id, autoFocus, disabled, onEnter, className, variant = 'chips', optionHints } = props;
    const placeholder = props.placeholder ?? def.placeholder;
    const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } };
    switch (def.type) {
        case 'long_text':
            return <Textarea id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || undefined)}
                rows={3} maxLength={def.maxLength} disabled={disabled} placeholder={placeholder} autoFocus={autoFocus} className={cn('rounded-xl text-sm', className)} />;
        case 'phone':
            // The house country-code phone box (E.164 out), defaulting to the school's country when the caller knows it.
            return <PhoneInput id={id} value={typeof value === 'string' ? value : ''} onChange={(v) => onChange(v || undefined)}
                defaultCountry={props.phoneCountry} disabled={disabled} placeholder={placeholder ?? undefined}
                autoFocus={autoFocus} className={className} />;
        case 'email':
            return <Input id={id} type={def.type === 'email' ? 'email' : 'tel'} inputMode={def.type === 'email' ? 'email' : 'tel'}
                autoComplete={def.type === 'email' ? 'email' : 'tel'} value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(e.target.value || undefined)} onKeyDown={enter} disabled={disabled}
                placeholder={placeholder ?? (def.type === 'email' ? 'name@example.com' : '98XXXXXXXX')} autoFocus={autoFocus}
                className={cn('h-9 rounded-xl text-sm', className)} />;
        case 'document':
            return <DocumentInput {...props} value={isDocumentValue(value) ? value : undefined} />;
        case 'number':
            return <Input id={id} type="number" inputMode="decimal" min={def.min} max={def.max} disabled={disabled} placeholder={placeholder} autoFocus={autoFocus}
                value={typeof value === 'number' ? String(value) : ''} onKeyDown={enter}
                onChange={(e) => { const n = e.target.valueAsNumber; onChange(e.target.value === '' || Number.isNaN(n) ? undefined : n); }}
                className={cn('h-9 w-40 rounded-xl text-sm', className)} />;
        case 'date': {
            const Picker = calendar === 'BS' ? NepaliDatePicker : DatePicker;
            return <Picker id={id} value={typeof value === 'string' ? value : undefined} onChange={(v) => onChange(v || undefined)}
                disabled={disabled} placeholder={placeholder ?? 'Pick a date'} className={cn('h-9 w-full max-w-xs', className)} />;
        }
        case 'yes_no':
            if (variant === 'rows') return <ChoiceRows label={def.label} options={['Yes', 'No']} picked={value === true ? ['Yes'] : value === false ? ['No'] : []}
                onPick={(o) => onChange(o === 'Yes')} disabled={disabled} onEnter={onEnter} className={className} />;
            return (
                <div role="radiogroup" aria-label={def.label} className={cn('flex gap-2', className)}>
                    {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map((o) => (
                        <button key={o.l} type="button" role="radio" aria-checked={value === o.v} disabled={disabled}
                            onClick={() => onChange(o.v)} className={cn(CHIP, 'px-5', value === o.v ? CHIP_ON : CHIP_OFF)}>
                            {o.l}
                        </button>
                    ))}
                </div>
            );
        case 'single_choice':
            if (variant === 'rows') return <ChoiceRows label={def.label} options={def.options ?? []} hints={optionHints} picked={typeof value === 'string' ? [value] : []}
                onPick={onChange} disabled={disabled} onEnter={onEnter} className={className} />;
            if (variant === 'dropdown') {
                return (
                    <Select value={typeof value === 'string' ? value : ''} disabled={disabled} onValueChange={(v) => onChange(v || undefined)}>
                        <SelectTrigger id={id} aria-label={def.label} className={cn('h-9 w-full rounded-xl text-sm', className)}>
                            <SelectValue placeholder={placeholder ?? 'Choose one'} />
                        </SelectTrigger>
                        <SelectContent>
                            {(def.options ?? []).map((o) => (
                                <SelectItem key={o} value={o}>{optionHints?.[o] ? `${o} - ${optionHints[o]}` : o}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            }
            return (
                <div role="radiogroup" aria-label={def.label} className={cn('flex flex-wrap gap-2', className)}>
                    {(def.options ?? []).map((o) => (
                        <button key={o} type="button" role="radio" aria-checked={value === o} disabled={disabled}
                            onClick={() => onChange(o)} className={cn(CHIP, value === o ? CHIP_ON : CHIP_OFF)}>
                            {o}
                        </button>
                    ))}
                </div>
            );
        case 'multi_choice': {
            const picked = Array.isArray(value) ? value : [];
            const toggle = (o: string) => { const next = picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]; onChange(next.length ? next : undefined); };
            if (variant === 'rows') return <ChoiceRows label={def.label} options={def.options ?? []} hints={optionHints} picked={picked} multi
                onPick={toggle} disabled={disabled} className={className} />;
            return (
                <div role="group" aria-label={def.label} className={cn('flex flex-wrap gap-2', className)}>
                    {(def.options ?? []).map((o) => {
                        const on = picked.includes(o);
                        return (
                            <button key={o} type="button" role="checkbox" aria-checked={on} disabled={disabled}
                                onClick={() => toggle(o)}
                                className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}>
                                {o}
                            </button>
                        );
                    })}
                </div>
            );
        }
        default:
            return <Input id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || undefined)} onKeyDown={enter}
                maxLength={def.maxLength} disabled={disabled} placeholder={placeholder} autoFocus={autoFocus} className={cn('h-9 rounded-xl text-sm', className)} />;
    }
}

/**
 * Choices as a numbered list, one per line - the chat card's look. One choice (and yes / no) picks on click and, with
 * `onEnter`, moves on with Enter or a double click; several choices toggle and never move on (moving on after the
 * first tick would end the question at one choice).
 */
function ChoiceRows({ label, options, hints, picked, multi, onPick, disabled, onEnter, className }: {
    label: string; options: readonly string[]; hints?: Record<string, string>; picked: readonly string[]; multi?: boolean;
    onPick: (option: string) => void; disabled?: boolean; onEnter?: () => void; className?: string;
}) {
    const advances = !multi && onEnter;
    return (
        <div role={multi ? 'group' : 'radiogroup'} aria-label={label} className={cn('flex flex-col', className)}>
            {options.map((o, i) => {
                const on = picked.includes(o);
                const hint = hints?.[o];
                return (
                    <button key={o} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={on} disabled={disabled}
                        onClick={() => onPick(o)}
                        onDoubleClick={advances || undefined}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onPick(o); if (advances) advances(); } }}
                        className={cn(
                            'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500',
                            on ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60',
                        )}>
                        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs tabular-nums',
                            on ? 'bg-white/20 text-white dark:bg-neutral-900/15 dark:text-neutral-900' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400')}>
                            {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className={cn('block truncate text-sm', on ? 'font-medium' : 'text-neutral-800 dark:text-neutral-200')}>{o}</span>
                            {hint && <span className={cn('block truncate text-xs', on ? 'text-white/70 dark:text-neutral-900/70' : 'text-neutral-500 dark:text-neutral-400')}>{hint}</span>}
                        </span>
                        {on && (multi ? <Check className="h-4 w-4 shrink-0" /> : <ArrowRight className="h-4 w-4 shrink-0" />)}
                    </button>
                );
            })}
        </div>
    );
}

/** A document: choose a file (uploaded through the caller's `onUpload`), then its number and expiry if it has them. */
function DocumentInput({ value, onChange, onUpload, calendar = 'AD', id, disabled, className }: Omit<TypedAnswerInputProps, 'value'> & { value: DocumentValue | undefined }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const Picker = calendar === 'BS' ? NepaliDatePicker : DatePicker;
    const patch = (p: Partial<DocumentValue>) => { if (value) onChange({ ...value, ...p }); };
    const choose = async (file: File | undefined) => {
        if (!file || !onUpload) return;
        setBusy(true);
        try {
            const r = await onUpload(file);
            if (r) onChange({ ...(value ?? {}), fileKey: r.fileKey, fileName: r.fileName ?? file.name });
        } finally {
            setBusy(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };
    return (
        <div className={cn('space-y-2', className)}>
            <input ref={fileRef} id={id} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => void choose(e.target.files?.[0])} />
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" disabled={disabled || busy || !onUpload} onClick={() => fileRef.current?.click()} className="h-9 rounded-xl px-3 text-sm">
                    {busy ? <Spinner className="size-4" /> : <FileUp className="h-4 w-4" />} {value ? 'Replace file' : 'Choose a file'}
                </Button>
                {value && <span className="min-w-0 truncate text-xs text-neutral-600 dark:text-neutral-400">{value.fileName ?? 'Uploaded'}</span>}
            </div>
            {value && (
                <div className="flex flex-wrap items-center gap-2">
                    <Input aria-label="Document number (optional)" placeholder="Number (optional)" value={value.number ?? ''} disabled={disabled}
                        onChange={(e) => patch({ number: e.target.value || undefined })} className="h-9 w-48 rounded-xl text-sm" />
                    <Picker value={value.expiresAt} onChange={(v) => patch({ expiresAt: v || undefined })} disabled={disabled}
                        placeholder="Expiry (optional)" className="h-9 w-48" />
                </div>
            )}
        </div>
    );
}
