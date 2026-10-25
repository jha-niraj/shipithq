"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * THE ROW YOU JUST CLICKED, WHILE THE THING IT OPENS IS STILL LOADING.
 *
 * ## The gap this fills
 *
 * Between clicking a student card and the sheet appearing there is a round trip - one to two
 * seconds on a cold Neon connection - and nothing on screen changed. Niraj, testing the Deck:
 * *"when we click on the cards on any panel which is opening the sheet which takes some time like
 * 1-2 sec so can we show the pulsating on that card which will say and look like something is
 * happening."*
 *
 * A spinner is the wrong answer here and the root `CLAUDE.md` says why: it collapses to a different
 * height than the content it replaces, and there is no content to replace - the row is still there
 * and still correct. What is missing is not information, it is ACKNOWLEDGEMENT. So the row stays
 * exactly where it is, at exactly its size, and breathes.
 *
 * ## Why the overlay breathes and not the row
 *
 * `animate-pulse` on the row itself fades the text, so the name you are waiting on becomes harder
 * to read at the moment you are staring at it. The pulse is therefore a separate tinted layer ON
 * TOP, at low alpha: the row's own contrast never changes.
 *
 * ## `muted` is the other half
 *
 * One row lighting up says "this is happening". The siblings dimming says "and nothing else is",
 * which is what stops a person clicking a second row while the first is still opening. It is a
 * separate prop rather than automatic because only the list knows which rows are siblings.
 *
 * ## Usage
 *
 * ```tsx
 * const [openingId, setOpeningId] = useState<string | null>(null);
 *
 * {rows.map((r) => (
 *     <PendingRow
 *         key={r.id}
 *         pending={openingId === r.id}
 *         muted={openingId !== null && openingId !== r.id}
 *         label={`Opening ${r.name}`}
 *     >
 *         <button onClick={() => { setOpeningId(r.id); void open(r); }}>...</button>
 *     </PendingRow>
 * ))}
 * ```
 *
 * Clear `openingId` when the sheet has opened OR the call failed - a row left pulsing after a
 * failure is worse than no feedback, because it says the app is still trying when it has stopped.
 */
export interface PendingRowProps extends React.ComponentProps<"div"> {
    /** This row is what the person clicked, and its work is still in flight. */
    pending?: boolean;
    /** Something ELSE is pending, so this row steps back. Ignored while `pending` is true. */
    muted?: boolean;
    /**
     * What is happening, for a screen reader. Announced politely while `pending`.
     * Write it as the action, not the state: "Opening Nirajan Parajuli", not "Loading".
     */
    label?: string;
    /**
     * The radius the overlay should match. The overlay is `absolute inset-0` and has to round the
     * same way the row does, or a square tint sits over a rounded card.
     */
    radiusClassName?: string;
}

export function PendingRow({
    pending = false,
    muted = false,
    label,
    radiusClassName = "rounded-xl",
    className,
    children,
    ...props
}: PendingRowProps) {
    const dim = muted && !pending;

    return (
        <div
            {...props}
            aria-busy={pending || undefined}
            className={cn(
                "relative transition-opacity duration-200",
                // `cursor-progress` on the wrapper beats the child's `cursor-pointer`, because the
                // wrapper is what the pointer is over.
                pending && "cursor-progress",
                dim && "opacity-45",
                className,
            )}
        >
            {children}

            {pending && (
                <>
                    {/*
                     * The breathing layer. `pointer-events-none` so the row underneath still
                     * receives hover and focus - it is not disabled, it is busy, and a second click
                     * on the same row should still be harmless rather than swallowed.
                     *
                     * `motion-reduce:animate-none` leaves the tint and the ring in place without the
                     * movement, so the acknowledgement survives for somebody who has asked for less
                     * motion - dropping the whole thing would leave them with the original problem.
                     */}
                    <span
                        aria-hidden
                        className={cn(
                            "pointer-events-none absolute inset-0 animate-pulse bg-neutral-900/[0.06] motion-reduce:animate-none dark:bg-white/[0.07]",
                            radiusClassName,
                        )}
                    />
                    <span
                        aria-hidden
                        className={cn(
                            "pointer-events-none absolute inset-0 ring-1 ring-neutral-400/70 dark:ring-neutral-500/60",
                            radiusClassName,
                        )}
                    />
                    {label && (
                        <span className="sr-only" aria-live="polite">
                            {label}
                        </span>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * The bookkeeping every list that uses `PendingRow` would otherwise write by hand.
 *
 * Holds which row is opening and clears it when the work settles - including when the work THROWS,
 * which is the case a hand-rolled version forgets and which leaves a row pulsing for ever.
 *
 * ```tsx
 * const { pendingId, run } = usePendingRow();
 * <PendingRow pending={pendingId === r.id} muted={pendingId !== null && pendingId !== r.id}>
 *     <button onClick={() => run(r.id, () => openSheet(r))}>...</button>
 * </PendingRow>
 * ```
 */
export function usePendingRow() {
    const [pendingId, setPendingId] = React.useState<string | null>(null);
    // A navigation can unmount this list while the promise is still settling; without the guard
    // React warns about a state update on an unmounted component.
    const alive = React.useRef(true);
    React.useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; };
    }, []);

    const run = React.useCallback(async (id: string, work: () => void | Promise<unknown>) => {
        setPendingId(id);
        try {
            await work();
        } finally {
            if (alive.current) setPendingId(null);
        }
    }, []);

    return { pendingId, run, clear: React.useCallback(() => setPendingId(null), []) };
}
