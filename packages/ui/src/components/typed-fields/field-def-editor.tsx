'use client';

/**
 * The "add a question" editor (plan/main/settings/settings-manual-pass-2026-10-21.md D2): the question, how it is
 * answered, its choices (for the choice types) and a Required switch. Controlled - the caller keeps the draft and
 * checks it with `fieldDefProblem` from @repo/core/typed-fields before saving (`error` shows that message here).
 *
 * Optional, for features that need them (D5): `details` adds the help line, the placeholder and the length / number
 * limits a FieldDef carries; `reorderable` lets choices be dragged into order; `maxOptions` widens the eight-choice cap (pass
 * the same to `fieldDefProblem`); `typeLocked` keeps a saved field's type; `children` holds the feature's own settings
 * (where a field sits, whether it is in use) inside the same card. Every change to the choices is reported as an
 * `OptionChange`, so a caller that keeps something beside each choice (a stored option id) can follow it with
 * `applyOptionChange`.
 */
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { SortableList } from '../sortable-list';
import {
    FIELD_HELP_MAX, FIELD_LABEL_MAX, FIELD_OPTION_MAX, FIELD_OPTIONS_MAX, FIELD_PLACEHOLDER_MAX, FIELD_TYPES, FIELD_TYPE_LABEL,
    isChoiceType, isTextType, type FieldDefDraft, type FieldType, type OptionChange,
} from '@repo/core/typed-fields';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

export interface FieldDefEditorProps {
    value: FieldDefDraft;
    /** `change` says what happened to the choices, when they changed. */
    onChange: (next: FieldDefDraft, change?: OptionChange) => void;
    /** Shows a remove button. */
    onRemove?: () => void;
    /** 1-based, for the labels screen readers hear ("Question 2"). */
    index?: number;
    /** Why it cannot be saved yet (from `fieldDefProblem`). */
    error?: string | null;
    placeholder?: string;
    /** The types this feature offers, in picker order (default: every type in FIELD_TYPES). */
    allowedTypes?: readonly FieldType[];
    /** The most choices offered (default FIELD_OPTIONS_MAX); give `fieldDefProblem` the same. */
    maxOptions?: number;
    /** The help line, the placeholder and the length / number limits. */
    details?: boolean;
    /** Up / down buttons on each choice. */
    reorderable?: boolean;
    /** The type cannot change (a saved field whose answers are stored by it). */
    typeLocked?: boolean;
    /** No Required switch - for a feature whose questions are always optional. */
    hideRequired?: boolean;
    /** A line under the type picker - what the chosen type does in this feature. */
    typeHint?: React.ReactNode;
    /** The feature's own settings, shown in the same card under the question's. */
    children?: React.ReactNode;
    className?: string;
}

const ICON_BTN = 'shrink-0 cursor-pointer rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-neutral-200';

/** A number box's text as a number; empty or not a number = no limit. */
const numOrUndef = (s: string): number | undefined => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s));

export function FieldDefEditor({
    value, onChange, onRemove, index, error, placeholder, allowedTypes, maxOptions = FIELD_OPTIONS_MAX, details, reorderable,
    typeLocked, hideRequired, typeHint, children, className,
}: FieldDefEditorProps) {
    const types = allowedTypes?.length ? allowedTypes : FIELD_TYPES;
    const name = index ? `Question ${index}` : 'Question';
    const options = value.options ?? [];
    const choice = isChoiceType(value.type);

    // Enter on the last choice adds the next one; focus moves into it once it exists.
    const choicesRef = useRef<HTMLDivElement>(null);
    const focusLast = useRef(false);
    useEffect(() => {
        if (!focusLast.current) return;
        focusLast.current = false;
        const inputs = choicesRef.current?.querySelectorAll('input');
        inputs?.[inputs.length - 1]?.focus();
    }, [options.length]);

    const setType = (type: FieldType) => {
        // A choice type starts with two empty choices to fill; other types carry none.
        const next: FieldDefDraft = { ...value, type };
        if (isChoiceType(type)) next.options = options.length >= 2 ? options : [...options, '', ''].slice(0, Math.max(2, options.length));
        else delete next.options;
        onChange(next, { kind: 'resize', length: next.options?.length ?? 0 });
    };
    const setOption = (i: number, text: string) => onChange({ ...value, options: options.map((o, j) => (j === i ? text : o)) }, { kind: 'edit', index: i });
    const addOption = () => { focusLast.current = true; onChange({ ...value, options: [...options, ''] }, { kind: 'add' }); };

    const renderChoice = (o: string, i: number, handle?: ReactNode) => (
        <div className="flex items-center gap-2">
            {handle}
            <span className="w-5 shrink-0 text-right text-xs text-neutral-400">{i + 1}.</span>
            <Input aria-label={`Choice ${i + 1}`} className="h-8 min-w-0 flex-1 rounded-xl text-xs" maxLength={FIELD_OPTION_MAX}
                placeholder={`Choice ${i + 1}`} value={o} onChange={(e) => setOption(i, e.target.value)}
                onKeyDown={(e) => {
                    // Enter on the last choice adds the next one, so a list can be typed straight through.
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    if (i === options.length - 1 && o.trim() && options.length < maxOptions) addOption();
                }} />
            <button type="button" aria-label={`Remove choice ${i + 1}`}
                onClick={() => onChange({ ...value, options: options.filter((_, j) => j !== i) }, { kind: 'remove', index: i })}
                className={ICON_BTN}>
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );

    return (
        <div className={cn('space-y-2 rounded-xl p-3 ring-1 ring-neutral-200 dark:ring-neutral-800', error && 'ring-rose-300 dark:ring-rose-900', className)}>
            <div className="flex items-center gap-2">
                <Input aria-label={name} className="h-9 min-w-0 flex-1 rounded-xl text-sm" maxLength={FIELD_LABEL_MAX}
                    placeholder={placeholder ?? 'e.g. Can you coach a sport?'} value={value.label}
                    onChange={(e) => onChange({ ...value, label: e.target.value })} />
                {onRemove && (
                    <button type="button" aria-label={`Remove ${name.toLowerCase()}`} onClick={onRemove} className={ICON_BTN}>
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Select value={value.type} onValueChange={(v) => setType(v as FieldType)} disabled={typeLocked}>
                    <SelectTrigger aria-label={`How ${name.toLowerCase()} is answered`} className="h-8 w-44 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {types.map((t) => <SelectItem key={t} value={t}>{FIELD_TYPE_LABEL[t]}</SelectItem>)}
                    </SelectContent>
                </Select>
                {!hideRequired && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                        <Switch checked={value.required !== false} onCheckedChange={(v) => onChange({ ...value, required: v })} /> Required
                    </label>
                )}
                <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-500">{value.label.length}/{FIELD_LABEL_MAX}</span>
            </div>
            {typeHint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{typeHint}</p>}
            {choice && (
                <div ref={choicesRef} className="space-y-1.5">
                    {reorderable ? (
                        <SortableList
                            items={options}
                            getId={(_, i) => String(i)}
                            onReorder={(next, { from, to }) => onChange({ ...value, options: next }, { kind: 'move', from, to })}
                            handleLabel={(o) => `Drag ${o.trim() || 'this choice'} to reorder`}
                            className="space-y-1.5"
                            renderItem={(o, { handle, index }) => renderChoice(o, index, handle)}
                        />
                    ) : (
                        options.map((o, i) => <Fragment key={i}>{renderChoice(o, i)}</Fragment>)
                    )}
                    {options.length < maxOptions && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-xl text-xs" onClick={addOption}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add a choice
                        </Button>
                    )}
                </div>
            )}
            {details && <DefDetails value={value} onChange={onChange} />}
            {children}
            {error && <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
        </div>
    );
}

/** The help line, the placeholder, and the limits that apply to the chosen type. */
function DefDetails({ value, onChange }: { value: FieldDefDraft; onChange: (next: FieldDefDraft) => void }) {
    const typed = !isChoiceType(value.type) && value.type !== 'yes_no' && value.type !== 'document' && value.type !== 'date';
    const small = 'h-8 rounded-xl text-xs';
    const caption = 'text-xs text-neutral-500 dark:text-neutral-400';
    return (
        <div className="space-y-2 pt-1">
            <label className="block space-y-1">
                <span className={caption}>Help line (optional)</span>
                <Input className={small} maxLength={FIELD_HELP_MAX} placeholder="Shown under it, if it needs explaining"
                    value={value.help ?? ''} onChange={(e) => onChange({ ...value, help: e.target.value || undefined })} />
            </label>
            {typed && (
                <label className="block space-y-1">
                    <span className={caption}>Placeholder (optional)</span>
                    <Input className={small} maxLength={FIELD_PLACEHOLDER_MAX} placeholder="A hint inside the empty box"
                        value={value.placeholder ?? ''} onChange={(e) => onChange({ ...value, placeholder: e.target.value || undefined })} />
                </label>
            )}
            {isTextType(value.type) && (
                <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                        <span className={caption}>Shortest (characters)</span>
                        <Input className={small} type="number" min={0} value={value.minLength ?? ''}
                            onChange={(e) => onChange({ ...value, minLength: numOrUndef(e.target.value) })} />
                    </label>
                    <label className="block space-y-1">
                        <span className={caption}>Longest (characters)</span>
                        <Input className={small} type="number" min={1} value={value.maxLength ?? ''}
                            onChange={(e) => onChange({ ...value, maxLength: numOrUndef(e.target.value) })} />
                    </label>
                </div>
            )}
            {value.type === 'number' && (
                <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                        <span className={caption}>Smallest allowed</span>
                        <Input className={small} type="number" value={value.min ?? ''}
                            onChange={(e) => onChange({ ...value, min: numOrUndef(e.target.value) })} />
                    </label>
                    <label className="block space-y-1">
                        <span className={caption}>Largest allowed</span>
                        <Input className={small} type="number" value={value.max ?? ''}
                            onChange={(e) => onChange({ ...value, max: numOrUndef(e.target.value) })} />
                    </label>
                </div>
            )}
        </div>
    );
}
