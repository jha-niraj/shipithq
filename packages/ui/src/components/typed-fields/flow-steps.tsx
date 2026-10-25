/**
 * Typed questions (@repo/core/typed-fields) asked one at a time in TypeformFlow (plan/main/settings/
 * settings-manual-pass-2026-10-21.md D5). TypeformFlow keeps its own step types for the onboarding wizards; a kit
 * question becomes one of them here, with the kit's `validateAnswer` as the step's check:
 *
 *   short / long text, number, email, phone -> the same step type
 *   one choice -> single_choice; several choices -> multiple_choice; yes / no -> single_choice of Yes / No
 *   date -> a text step that takes "2083-01-15 BS" or "2026-04-28" (the flow is a full-screen layer, above every popover,
 *           so the house date picker cannot open inside it; `parseAnyDate` reads what is typed, BS or AD)
 *
 * A document has no step (public forms take no uploads) and is left out. Before sending, `typedFlowAnswers` reads the
 * flow's answers into the kit's typed values (a date as AD 'YYYY-MM-DD', yes / no as a boolean), so the server - which
 * reads them again with `validateAnswer` - never has to convert a BS date.
 */
import { getAdDateFromBs } from '@repo/calendar';
import { validateAnswer, type BsToAd, type FieldDef, type TypedValue } from '@repo/core/typed-fields';
import type { FlowStep } from '../typeform-flow';

const YES_NO = ['Yes', 'No'];

/** What the person is told when an answer does not read, from the kit's short reason. */
function problemText(error: string): string {
    if (error === 'empty') return 'This field is required.';
    return `Please check this answer - ${error}.`;
}

/** One kit question as a TypeformFlow step (null for a document, which a flow cannot take). */
export function fieldDefToFlowStep(def: FieldDef, o: { bsToAd?: BsToAd } = {}): FlowStep | null {
    if (def.type === 'document') return null;
    const bsToAd = o.bsToAd ?? getAdDateFromBs;
    const base = { id: def.id, question: def.label, description: def.help, placeholder: def.placeholder, required: def.required };
    const validate = (value: unknown): string | null => {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && !Array.isArray(value)) return 'Please check this answer.';
        const r = validateAnswer(def, value as TypedValue, { bsToAd });
        return r.ok ? null : problemText(r.error);
    };
    switch (def.type) {
        case 'yes_no':
            return { ...base, type: 'single_choice', options: YES_NO, validate };
        case 'single_choice':
            return { ...base, type: 'single_choice', options: def.options ?? [], validate };
        case 'multi_choice':
            return { ...base, type: 'multiple_choice', options: def.options ?? [], validate };
        case 'date':
            return {
                ...base, type: 'short_text', validate,
                description: def.help ?? 'Type the date as year-month-day, in BS or AD.',
                placeholder: def.placeholder ?? 'e.g. 2083-01-15 BS',
            };
        default:
            return { ...base, type: def.type, validate };
    }
}

/** The kit questions of a form as flow steps, in order (documents left out). */
export function fieldDefsToFlowSteps(defs: readonly FieldDef[], o: { bsToAd?: BsToAd } = {}): FlowStep[] {
    return defs.map((d) => fieldDefToFlowStep(d, o)).filter((s): s is FlowStep => s !== null);
}

/**
 * The flow's answers to these questions as the kit's typed values, ready to send. An answer that is empty, or that does
 * not read, is left out - the flow has already refused those on its own step, and the server checks again.
 */
export function typedFlowAnswers(defs: readonly FieldDef[], answers: Record<string, unknown>, o: { bsToAd?: BsToAd } = {}): Record<string, TypedValue> {
    const bsToAd = o.bsToAd ?? getAdDateFromBs;
    const out: Record<string, TypedValue> = {};
    for (const def of defs) {
        const v = answers[def.id];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
        if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean' && !Array.isArray(v)) continue;
        const r = validateAnswer(def, v as TypedValue, { bsToAd });
        if (r.ok) out[def.id] = r.value;
    }
    return out;
}
