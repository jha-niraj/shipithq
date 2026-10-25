/**
 * One typed answer, read-only (plan/main/settings/settings-manual-pass-2026-10-21.md D2): Yes / No, a date in the
 * school's calendar, the choices joined, or the text as given. `empty` shows when there is no answer.
 */
import { formatSchoolDate } from '@repo/calendar';
import { formatAnswer, type FieldDef, type TypedValue } from '@repo/core/typed-fields';
import { cn } from '../../lib/utils';

export interface TypedAnswerViewProps {
    def: Pick<FieldDef, 'type' | 'options'>;
    value: TypedValue | null | undefined;
    calendar?: 'AD' | 'BS';
    empty?: React.ReactNode;
    className?: string;
}

/** The answer as text - for places that need a string (a toast, a table cell, a transcript line). */
export function typedAnswerText(def: Pick<FieldDef, 'type' | 'options'>, value: TypedValue | null | undefined, calendar: 'AD' | 'BS' = 'AD'): string {
    return formatAnswer(def, value, { formatDate: (d) => formatSchoolDate(`${d}T00:00:00`, calendar) });
}

export function TypedAnswerView({ def, value, calendar = 'AD', empty = null, className }: TypedAnswerViewProps) {
    const text = typedAnswerText(def, value, calendar);
    if (!text) return <>{empty}</>;
    return <span className={cn('whitespace-pre-line break-words', className)}>{text}</span>;
}
