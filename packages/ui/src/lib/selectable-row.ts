import type { KeyboardEvent, MouseEvent } from 'react';

/**
 * Selectable rows - a click anywhere on a row (a table row or list item carrying a selection
 * checkbox) toggles it, not only a click on the checkbox. Niraj, 2026-10-21: "put this on the
 * whole row itself. Whenever and wherever I click, it should be clicked".
 *
 * Usage:
 *   <TableRow {...selectableRowProps({ selected, onToggle: () => toggle(id) })}>
 *     <TableCell><Checkbox checked={selected} onCheckedChange={() => toggle(id)} tabIndex={-1} /></TableCell>
 *
 * Inner controls (links, buttons, inputs, selects, labels, comboboxes, the checkbox itself, or
 * anything marked `data-row-ignore`) keep their own behaviour - the row ignores clicks that land on
 * them, so the checkbox never double-toggles. Clicks from portalled content (a Select's list, a
 * popover) bubble through the React tree but sit outside the row's DOM, and are ignored too.
 *
 * Keyboard: the row is one tab stop; Space or Enter toggles it. Give the inner Checkbox
 * `tabIndex={-1}` so each row is a single stop (it stays in the accessibility tree with its label).
 */

/** The bits of a DOM element the guard reads - narrow so the logic is testable without a DOM. */
export type NodeLike = {
    tagName: string;
    getAttribute(name: string): string | null;
    hasAttribute(name: string): boolean;
    parentElement: NodeLike | null;
};

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'OPTION', 'SUMMARY']);
const INTERACTIVE_ROLES = new Set([
    'button', 'checkbox', 'combobox', 'link', 'listbox', 'menuitem', 'menuitemcheckbox', 'option',
    'radio', 'slider', 'spinbutton', 'switch', 'tab', 'textbox',
]);

/** True when this one element handles its own clicks. */
export function isInteractiveNode(node: NodeLike): boolean {
    if (node.hasAttribute('data-row-ignore')) return true;
    if (INTERACTIVE_TAGS.has(node.tagName.toUpperCase())) return true;
    const role = node.getAttribute('role');
    if (role && INTERACTIVE_ROLES.has(role)) return true;
    const editable = node.getAttribute('contenteditable');
    return editable === '' || editable === 'true';
}

/**
 * True when a click on `target` must NOT toggle `row`: it landed on (or inside) an interactive
 * element below the row, or outside the row's DOM altogether (portalled content). The row itself
 * may carry an interactive role (e.g. role="checkbox") - that never counts.
 */
export function isInteractiveTarget(target: NodeLike | null, row: NodeLike): boolean {
    let node: NodeLike | null = target;
    while (node) {
        if (node === row) return false;
        if (isInteractiveNode(node)) return true;
        node = node.parentElement;
    }
    // Never reached the row: the event came through a React portal.
    return true;
}

export type SelectableRowOptions = {
    selected: boolean;
    onToggle: () => void;
    disabled?: boolean;
    /**
     * `row` (default) for a `<tr>` / TableRow: aria-selected on its implicit row role.
     * `checkbox` for a list item or div: role="checkbox" + aria-checked.
     */
    semantics?: 'row' | 'checkbox';
};

export type SelectableRowProps = {
    onClick?: (e: MouseEvent<HTMLElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
    tabIndex?: number;
    role?: 'checkbox';
    'aria-selected'?: boolean;
    'aria-checked'?: boolean;
    'aria-disabled'?: boolean;
    className: string;
};

export const SELECTABLE_ROW_CLASS =
    'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400';

export function selectableRowProps({ selected, onToggle, disabled = false, semantics = 'row' }: SelectableRowOptions): SelectableRowProps {
    const state = semantics === 'checkbox'
        ? { role: 'checkbox' as const, 'aria-checked': selected }
        : { 'aria-selected': selected };
    if (disabled) return { ...state, 'aria-disabled': true, className: '' };
    return {
        ...state,
        tabIndex: 0,
        onClick: (e) => {
            if (isInteractiveTarget(e.target as unknown as NodeLike, e.currentTarget as unknown as NodeLike)) return;
            onToggle();
        },
        onKeyDown: (e) => {
            // Only the row's own focus - keys typed into an inner input or on an inner button stay theirs.
            if (e.target !== e.currentTarget) return;
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onToggle();
            }
        },
        className: SELECTABLE_ROW_CLASS,
    };
}

/**
 * Openable rows - the whole row opens the thing its Details / View button opens (Niraj, 2026-10-23: "make this
 * whole row clickable and keep the details button as well"). Same guard as a selectable row: a click on an inner
 * link, button, input or anything `data-row-ignore` keeps its own behaviour, and portalled content is ignored.
 *
 * Usage (keep the button - it is the visible, labelled way in):
 *   <tr {...openableRowProps({ onOpen: () => setOpenId(l.id), label: `Open ${l.fullName}` })}>
 *
 * Keyboard: the row is one tab stop; Enter opens it. Pass `disabled` for a row with nothing to open.
 */
export type OpenableRowOptions = { onOpen: () => void; disabled?: boolean; label?: string };

export type OpenableRowProps = {
    onClick?: (e: MouseEvent<HTMLElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
    tabIndex?: number;
    'aria-label'?: string;
    className: string;
};

export function openableRowProps({ onOpen, disabled = false, label }: OpenableRowOptions): OpenableRowProps {
    if (disabled) return { className: '' };
    return {
        tabIndex: 0,
        'aria-label': label,
        onClick: (e) => {
            if (isInteractiveTarget(e.target as unknown as NodeLike, e.currentTarget as unknown as NodeLike)) return;
            onOpen();
        },
        onKeyDown: (e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter') { e.preventDefault(); onOpen(); }
        },
        className: SELECTABLE_ROW_CLASS,
    };
}
