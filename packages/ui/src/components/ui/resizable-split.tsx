'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Two panes side by side with a drag handle between them (plan/main/reports/reports-overhaul-2026-10-22.md R14).
 *
 * Small on purpose - two panes, one horizontal split - so it carries no dependency. From `from` up the panes sit side
 * by side and the handle shows; below it the two panes simply stack in the flex column the caller already had (the
 * report editor and the design builder show one pane at a time there), and no width applies.
 *
 *  - The split is the START pane's share of the width minus the handle, clamped so neither pane goes under its minimum.
 *  - It is remembered per `storageKey` in localStorage (wrapped in try/catch: private windows and blocked storage just
 *    fall back to the default).
 *  - Double-click the handle, or press Home, to go back to the default. Arrow keys move it 2% at a time.
 *  - Until somebody drags, the default is either `defaultRatio`, or - for a layout whose default is a FIXED end pane
 *    (the builder's 30rem / 36rem preview) - the caller's `defaultStartClassName`, so the first paint, and the page's
 *    skeleton, keep exactly the proportions they had before the handle existed.
 * The handle is 1rem wide, the `gap-4` it replaces.
 */
export interface ResizableSplitProps {
    /** localStorage key, one per page (e.g. "gk.split.reports-editor"). */
    storageKey: string;
    /** The breakpoint from which the panes are side by side. */
    from: 'lg' | 'xl';
    start: ReactNode;
    end: ReactNode;
    /** The start pane's default share (0-1) of the width minus the handle. */
    defaultRatio?: number;
    /** Instead of `defaultRatio`: the start pane's width classes until a drag (e.g. "lg:w-[calc(100%-31rem)]"). */
    defaultStartClassName?: string;
    /** Minimum widths in px. */
    minStart?: number;
    minEnd?: number;
    className?: string;
    startClassName?: string;
    endClassName?: string;
    /** What the handle is called to a screen reader. */
    label?: string;
}

const HANDLE_PX = 16;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function read(key: string): number | null {
    try {
        const raw = window.localStorage.getItem(key);
        const n = raw == null ? NaN : Number(raw);
        return Number.isFinite(n) && n > 0 && n < 1 ? n : null;
    } catch {
        return null;
    }
}

function write(key: string, value: number | null) {
    try {
        if (value == null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value.toFixed(4));
    } catch {
        /* storage unavailable - the split just is not remembered */
    }
}

// Literal classes per breakpoint, so Tailwind sees every one of them.
const LAYOUT = {
    lg: { root: 'lg:flex-row', fixed: 'lg:flex-none', startWidth: 'lg:w-[var(--gk-split-start)]', handle: 'lg:flex' },
    xl: { root: 'xl:flex-row', fixed: 'xl:flex-none', startWidth: 'xl:w-[var(--gk-split-start)]', handle: 'xl:flex' },
} as const;

/** Each pane is a flex column filling its share; the caller's pane goes inside with `flex-1` (or hides the wrapper). */
const PANE = 'flex min-h-0 min-w-0 flex-1 flex-col';

export function ResizableSplit({
    storageKey, from, start, end, defaultRatio, defaultStartClassName, minStart = 320, minEnd = 320,
    className, startClassName, endClassName, label = 'Resize panes',
}: ResizableSplitProps) {
    const root = useRef<HTMLDivElement>(null);
    // Null until the stored value is read after mount (so the server and first client render agree) or a drag.
    const [ratio, setRatio] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);
    useEffect(() => { setRatio(read(storageKey)); }, [storageKey]);

    const bounds = useCallback(() => {
        const w = (root.current?.clientWidth ?? 0) - HANDLE_PX;
        if (w <= 0) return { lo: 0.1, hi: 0.9, w: 0 };
        const lo = Math.min(minStart / w, 0.5);
        const hi = Math.max(1 - minEnd / w, 0.5);
        return { lo, hi, w };
    }, [minStart, minEnd]);

    const fromPointer = (clientX: number) => {
        const el = root.current;
        if (!el) return;
        const { lo, hi, w } = bounds();
        if (w <= 0) return;
        const r = (clientX - el.getBoundingClientRect().left - HANDLE_PX / 2) / w;
        setRatio(clamp(r, lo, hi));
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
    };
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => { if (dragging) fromPointer(e.clientX); };
    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
        if (!dragging) return;
        setDragging(false);
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        setRatio((r) => { write(storageKey, r); return r; });
    };
    const reset = () => { setRatio(null); write(storageKey, null); };

    const current = () => {
        if (ratio != null) return ratio;
        if (defaultRatio != null) return defaultRatio;
        const el = root.current?.firstElementChild instanceof HTMLElement ? root.current.firstElementChild : null;
        const { w } = bounds();
        return el && w > 0 ? el.getBoundingClientRect().width / w : 0.5;
    };
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const { lo, hi } = bounds();
        let next: number | null = null;
        if (e.key === 'ArrowLeft') next = current() - 0.02;
        else if (e.key === 'ArrowRight') next = current() + 0.02;
        else if (e.key === 'Home') { e.preventDefault(); reset(); return; }
        if (next == null) return;
        e.preventDefault();
        const r = clamp(next, lo, hi);
        setRatio(r);
        write(storageKey, r);
    };

    const effective = ratio ?? defaultRatio ?? null;
    const style = effective != null
        ? ({ '--gk-split-start': `clamp(${minStart}px, calc((100% - ${HANDLE_PX}px) * ${effective.toFixed(4)}), calc(100% - ${HANDLE_PX + minEnd}px))` } as CSSProperties)
        : undefined;
    const l = LAYOUT[from];

    return (
        <div ref={root} style={style} className={cn('flex min-h-0 min-w-0 flex-col gap-4', l.root, from === 'lg' ? 'lg:gap-0' : 'xl:gap-0', dragging && 'cursor-col-resize select-none', className)}>
            <div className={cn(PANE, (effective != null || defaultStartClassName) && l.fixed, effective != null ? l.startWidth : defaultStartClassName, startClassName)}>
                {start}
            </div>
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label={label}
                aria-valuenow={Math.round((effective ?? 0.5) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                tabIndex={0}
                data-tip="Drag to resize - double-click to reset"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onDoubleClick={reset}
                onKeyDown={onKeyDown}
                className={cn(
                    'group hidden w-4 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none',
                    l.handle,
                )}
            >
                <span className={cn(
                    'h-10 w-1 rounded-full bg-neutral-300 transition-colors group-hover:bg-neutral-500 group-focus-visible:bg-neutral-900 dark:bg-neutral-700 dark:group-hover:bg-neutral-400 dark:group-focus-visible:bg-white',
                    dragging && 'bg-neutral-900 dark:bg-white',
                )} />
            </div>
            <div className={cn(PANE, endClassName)}>
                {end}
            </div>
        </div>
    );
}
