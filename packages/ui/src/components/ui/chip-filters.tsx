'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    Filters,
    FiltersRow,
    createFilterQuery,
    createFilterRule,
    flattenFilterRules,
    useFilterFocusStore,
    type FilterChangeDetails,
    type FilterField,
    type FilterOperator,
    type FilterQuery,
    type FilterRule,
} from '../reui/filters/filters';
import { updateFilterRule } from '../reui/filters/filters-query';
import type { FilterFocusStore } from '../reui/filters/filters-context';

/**
 * Stepped filter chips ("Class is 8", "Status is Unpaid") in place of a row of separate selects
 * (plan/repo/ui/reui-components-2026-10-23.md task 3.4). A thin wrapper over the ReUI `Filters` chip row for the
 * common case on our lists: every field takes ONE value, chosen from a list, and the server action takes it as one
 * string. So the bar reads and writes a plain `Record<key, value>`, exactly what the selects held, and the caller's
 * state, query keys and server input do not change.
 *
 * - One operator ("is"), so the condition step is skipped: picking a field opens its value list straight away.
 * - A field already in the bar is greyed out in the picker (the server takes one value per field).
 * - `disabledReason` greys a field that cannot be picked yet ("Pick a class first").
 * - A chip with no value yet filters nothing; it stays in the bar until it gets one or is removed.
 * - The row wraps on a phone (the ReUI row is `flex-wrap`).
 */

export interface ChipFilterOption {
    value: string;
    label: string;
}

export interface ChipFilterField {
    /** The key in `values` - the same name the old select's state had. */
    key: string;
    label: string;
    icon?: ReactNode;
    options: ReadonlyArray<ChipFilterOption>;
    /** Set when the field cannot be picked yet; shown under it in the picker. */
    disabledReason?: string;
    /** Search prompt in the value list. */
    placeholder?: string;
}

/** A key with no value (missing, undefined or '') is not filtered. */
export type ChipFilterValues = Record<string, string | undefined>;

const IS: FilterOperator[] = [{ value: 'is', label: 'is', arity: 'one' }];

type Query = FilterQuery<string>;

function valuesOf(query: Query): ChipFilterValues {
    const out: ChipFilterValues = {};
    for (const rule of flattenFilterRules(query)) {
        const key = rule.path[0];
        if (key && rule.operator === 'is' && typeof rule.value === 'string' && rule.value) out[key] = rule.value;
    }
    return out;
}

/** The set values only, sorted by key, as one string - equal filters give equal keys. */
function keyOf(values: ChipFilterValues): string {
    return JSON.stringify(
        Object.keys(values).filter((k) => values[k]).sort().map((k) => [k, values[k]]),
    );
}

/**
 * The query for `values`, keeping the user's chip order: chips that still match stay where they are, chips the
 * caller cleared go, values the caller set elsewhere (a Clear button, a reset) are added at the end.
 */
function reconcile(prev: Query, values: ChipFilterValues): Query {
    const kept: FilterRule<string>[] = [];
    const seen = new Set<string>();
    for (const rule of flattenFilterRules(prev)) {
        const key = rule.path[0];
        if (!key || seen.has(key)) continue;
        if (rule.operator === 'is' && rule.value && values[key] === rule.value) {
            kept.push(rule);
            seen.add(key);
        }
    }
    for (const [key, value] of Object.entries(values)) {
        if (!value || seen.has(key)) continue;
        kept.push(createFilterRule<string>({ id: `chip-${key}`, path: [key], operator: 'is', value }));
        seen.add(key);
    }
    return createFilterQuery<string>(kept);
}

/** Hands the bar's focus store out, so a new chip can open its VALUE list rather than the one-item condition menu. */
function FocusStoreBridge({ storeRef }: { storeRef: { current: FilterFocusStore | null } }) {
    const store = useFilterFocusStore();
    useEffect(() => {
        storeRef.current = store;
        return () => { storeRef.current = null; };
    }, [store, storeRef]);
    return null;
}

export function ChipFilters({
    fields,
    values,
    onChange,
    className,
    size = 'sm',
    showClear = false,
}: {
    fields: ReadonlyArray<ChipFilterField>;
    values: ChipFilterValues;
    onChange: (next: ChipFilterValues) => void;
    className?: string;
    /** `sm` (the default) draws Add filter at the app's h-9 control height and the chips at h-8. */
    size?: 'sm' | 'default';
    /** The bar's own Clear (removes every chip). Off where the page already has a Clear that also empties search. */
    showClear?: boolean;
}) {
    const [query, setQuery] = useState<Query>(() => reconcile(createFilterQuery<string>(), values));
    const focusRef = useRef<FilterFocusStore | null>(null);
    const valuesKey = keyOf(values);
    const latestValues = useRef(values);
    useEffect(() => { latestValues.current = values; });

    // The caller changed the values itself (Clear, a class change dropping the section): redraw the chips from them.
    useEffect(() => {
        setQuery((prev) => (keyOf(valuesOf(prev)) === valuesKey ? prev : reconcile(prev, latestValues.current)));
    }, [valuesKey]);

    const handleChange = useCallback(
        (next: Query, details: FilterChangeDetails<string, unknown>) => {
            let q = next;
            const added = details.reason === 'add' ? details.rule : null;
            if (added && added.operator === '') {
                // Our fields have one operator, so fill it in and open the value list instead. The bar points its
                // focus at the condition menu right after this call returns; the microtask lands before the new
                // chip first renders, so the chip opens on its value.
                q = updateFilterRule(q, added.id, { operator: 'is' });
                const id = added.id;
                queueMicrotask(() => focusRef.current?.set({ id, segment: 'value', autoOpen: true }));
            }
            setQuery(q);
            const nextValues = valuesOf(q);
            if (keyOf(nextValues) !== keyOf(latestValues.current)) onChange(nextValues);
        },
        [onChange],
    );

    const usedKeys = useMemo(() => new Set(flattenFilterRules(query).map((r) => r.path[0])), [query]);

    const filterFields: FilterField<string>[] = fields.map((f) => {
        const used = usedKeys.has(f.key);
        return {
            id: f.key,
            label: f.label,
            icon: f.icon,
            type: 'select',
            operators: IS,
            defaultOperator: 'is',
            options: f.options.map((o) => ({ value: o.value, label: o.label })),
            disabled: used || Boolean(f.disabledReason),
            description: used ? 'Already in the filters' : f.disabledReason,
            placeholder: f.placeholder,
            searchable: f.options.length > 8,
        };
    });

    return (
        <Filters<string>
            fields={filterFields}
            query={query}
            onQueryChange={handleChange}
            size={size}
        >
            <FocusStoreBridge storeRef={focusRef} />
            <FiltersRow showClear={showClear} className={className} />
        </Filters>
    );
}
