'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';

/**
 * The header for a docked right-hand panel.
 *
 * A panel header is always the same three things: something on the left that names what you are
 * looking at and opens a picker for it, and a row of icon actions on the right. Sharing those
 * pieces is what stops two panels drifting apart on spacing, hit area and colour - which is what
 * had happened before this existed.
 *
 * Deliberately composable parts rather than one configurable component: a panel may anchor a
 * dropdown to its trigger, swap its whole body to a switcher, or put a back button where the
 * trigger goes, and a single prop-driven header would have to model all of it. Composition is
 * cheaper than that abstraction.
 */
export function PanelHeader({
    children,
    actions,
    className,
    innerClassName,
}: {
    /** Left side. Usually a PanelHeaderTrigger, or a back control. */
    children: React.ReactNode;
    /** Right side. Usually a row of PanelHeaderAction. */
    actions?: React.ReactNode;
    className?: string;
    /**
     * Constrains the header's CONTENT while the rule underneath still spans the full width.
     *
     * The full-page chat needs this: its transcript is capped at a reading measure, and a header
     * whose title sat at the window's left edge while the conversation started 200px further in
     * read as two unrelated screens stacked on top of each other. The BORDER has to keep spanning,
     * though - a rule that stops short is a rule that looks broken - which is why this is an inner
     * wrapper and not a max-width on the row itself.
     */
    innerClassName?: string;
}) {
    return (
        <div
            className={cn(
                'relative shrink-0 border-b border-neutral-200 dark:border-neutral-800',
                className,
            )}
        >
            <div className={cn('flex items-center gap-1 p-2', innerClassName)}>
                {children}
                {actions && <div className="ml-auto flex shrink-0 items-center gap-0.5">{actions}</div>}
            </div>
        </div>
    );
}

/**
 * The "what am I looking at" button. Names the current conversation, record or view, and opens
 * the picker for it.
 */
export function PanelHeaderTrigger({
    leading,
    title,
    open,
    onClick,
    showChevron = true,
    className,
    buttonRef,
}: {
    /** Icon or logo. Sized by the caller. */
    leading?: React.ReactNode;
    title: string;
    /** Rotates the chevron while the picker is open. */
    open?: boolean;
    onClick?: () => void;
    showChevron?: boolean;
    className?: string;
    /** For anchoring a dropdown to this trigger. */
    buttonRef?: React.Ref<HTMLButtonElement>;
}) {
    return (
        <button
            ref={buttonRef}
            type="button"
            onClick={onClick}
            aria-expanded={showChevron ? Boolean(open) : undefined}
            className={cn(
                // Sized to its CONTENT, never `flex-1`.
                //
                // It used to fill the header row, so the hover state was a 1,200px slab behind the
                // word "Saathi" - a button whose hit area is the whole top of the screen reads as a
                // header that has somehow been clicked, not as a control. `min-w-0` with `truncate`
                // on the label still lets a long conversation title shrink rather than push the
                // actions off the end.
                'flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800',
                className,
            )}
        >
            {leading}
            <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
            </span>
            {showChevron && (
                <ChevronDown
                    className={cn(
                        'h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-150',
                        open && 'rotate-180',
                    )}
                />
            )}
        </button>
    );
}

/** An icon action. Same hit area and hover treatment in every panel that uses it. */
export function PanelHeaderAction({
    label,
    onClick,
    disabled,
    asChild,
    children,
    className,
}: {
    /** Used for both the tooltip and the accessible name. */
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    /** Render the child directly (for a Link) instead of a button. */
    asChild?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    const classes = cn(
        'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-300',
        className,
    );

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{
            className?: string;
            title?: string;
            'aria-label'?: string;
        }>;
        return React.cloneElement(child, {
            className: cn(classes, child.props.className),
            title: label,
            'aria-label': label,
        });
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className={classes}
        >
            {children}
        </button>
    );
}
