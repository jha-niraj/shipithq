"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "./button";
import { cn } from "../../lib/utils";

/**
 * The house pagination bar.
 *
 * Every app's rule (see CLAUDE.md) is:
 *
 * > Pagination renders OUTSIDE the ScrollArea as a sibling, and its buttons stay visible - disabled
 * > on a single page, NEVER hidden.
 *
 * Twelve places in `apps/main` had hand-rolled bars wrapped in `{totalPages > 1 && ...}`, which
 * breaks the second half of that rule. It looks harmless until you type in the search box: the list
 * narrows to one page, the whole bar unmounts, and the content below jumps up by the bar's height.
 * Clear the search and it jumps back. That flicker on every keystroke is the reason the rule says
 * "disabled, never hidden" rather than "hide it when it is not needed".
 *
 * Those twelve also disagreed on wording ("Showing 1-20 of 50", "Page 2 of 9 - 50 total",
 * "50 students - page 2 of 9"), on control style (icon-only ghost buttons vs outline Prev/Next),
 * and three offered no position at all. This component is the single answer to all of that.
 *
 * `numbered` adds first/last jumps and a windowed run of page buttons, for lists long enough that
 * stepping one page at a time is not viable. Everything else gets plain Previous/Next.
 *
 * NOTE: render this as a SIBLING of the ScrollArea, never inside it - a bar inside the scroll
 * viewport scrolls away with the content, which is the exact problem paginating was meant to solve.
 */

export type ListPaginationProps = {
    /** 1-based current page. */
    page: number;
    /** Total number of pages. Values below 1 are treated as 1 so an empty list still renders a bar. */
    totalPages: number;
    /** Total row count across all pages. Omit to hide the count from the label. */
    totalItems?: number;
    /** Plural noun for the count, e.g. "students". Defaults to no noun ("42 total"). */
    itemNoun?: string;
    /** Required unless `hrefTemplate` is given. */
    onPageChange?: (page: number) => void;
    /**
     * Render the controls as links instead of buttons. A URL containing the literal `{page}`, which
     * is substituted with the target page number - e.g. `"/attendance/monthly?class=5&page={page}"`.
     *
     * Server-paginated pages (the ones that read `?page=` and query only that slice) have no client
     * state to update, and wrapping one in a client component purely to own a `useState` would turn
     * a server-rendered table into a client one for no benefit.
     *
     * A template STRING rather than the more natural `(page: number) => string`: this component is
     * `"use client"`, and a function prop cannot cross the server/client boundary - React can only
     * serialize plain data, so passing a callback from a server component throws at render.
     */
    hrefTemplate?: string;
    /** Disables every control - use while a page transition is pending. */
    disabled?: boolean;
    /** Adds first/last jumps and windowed page numbers. */
    numbered?: boolean;
    /**
     * `"card"` (default) is a standalone rounded bar, for a page that stacks it under a table as its
     * own element. `"footer"` is flush - square corners, a top border only, no background - for a
     * bar pinned inside a bordered card or panel, where a second rounded outline inside the card's
     * own would read as a box in a box.
     */
    variant?: "card" | "footer";
    className?: string;
};

export function ListPagination({
    page,
    totalPages,
    totalItems,
    itemNoun,
    onPageChange,
    hrefTemplate,
    disabled = false,
    numbered = false,
    variant = "card",
    className,
}: ListPaginationProps) {
    // An empty list is 1 page of nothing, not 0 pages - otherwise the label reads "Page 1 of 0".
    const pageCount = Math.max(1, totalPages);
    const current = Math.min(Math.max(1, page), pageCount);

    const atStart = current <= 1;
    const atEnd = current >= pageCount;

    const go = (next: number) => {
        const clamped = Math.min(Math.max(1, next), pageCount);
        if (clamped !== current) onPageChange?.(clamped);
    };

    /**
     * `active` marks the numbered button for the page you are on - only those highlight. The
     * first/last/prev/next controls never do, even when their target happens to equal the current
     * page (on page 1, "First" points at page 1, and highlighting it would read as "you are on the
     * First button").
     *
     * In link mode a disabled control still has to occupy its slot - that is the whole point of
     * "disabled, never hidden" - but an `<a>` has no disabled state, so it falls back to a real
     * button element, which does. Only enabled controls become links.
     */
    const control = (
        targetPage: number,
        isDisabled: boolean,
        key: string,
        body: React.ReactNode,
        label?: string,
        active = false,
    ) => {
        const inert = disabled || isDisabled;
        // Named buttonVariant, not variant: the component now takes a `variant` prop for the bar's
        // own shape, and shadowing it here would silently make the outer one unreachable.
        const buttonVariant = active ? "default" : "outline";
        if (hrefTemplate && !inert) {
            return (
                <Button key={key} asChild variant={buttonVariant} size="sm" aria-label={label}>
                    <a
                        href={hrefTemplate.replace("{page}", String(targetPage))}
                        aria-current={active ? "page" : undefined}
                    >
                        {body}
                    </a>
                </Button>
            );
        }
        return (
            <Button
                key={key}
                variant={buttonVariant}
                size="sm"
                aria-label={label}
                aria-current={active ? "page" : undefined}
                disabled={inert}
                onClick={hrefTemplate ? undefined : () => go(targetPage)}
            >
                {body}
            </Button>
        );
    };

    return (
        <div
            className={cn(
                "flex shrink-0 items-center justify-between gap-3 px-4 py-3",
                variant === "card"
                    ? "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                    : "border-t border-neutral-200 dark:border-neutral-800",
                className,
            )}
        >
            <p className="min-w-0 truncate text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Page {current} of {pageCount}
                {typeof totalItems === "number" && (
                    <>
                        {" - "}
                        {totalItems} {itemNoun ? `${itemNoun} ` : ""}total
                    </>
                )}
            </p>

            <div className="flex shrink-0 items-center gap-2">
                {numbered &&
                    control(1, atStart, "first", <ChevronsLeft className="h-4 w-4" />, "First page")}

                {control(
                    current - 1,
                    atStart,
                    "prev",
                    <>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                    </>,
                    "Previous page",
                )}

                {numbered &&
                    windowedPages(current, pageCount).map((p, i) =>
                        p === "gap" ? (
                            <span
                                key={`gap-${i}`}
                                className="px-1 text-sm text-neutral-400 dark:text-neutral-500"
                            >
                                ...
                            </span>
                        ) : (
                            control(p, false, `p-${p}`, p, `Page ${p}`, p === current)
                        ),
                    )}

                {control(
                    current + 1,
                    atEnd,
                    "next",
                    <>
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                    </>,
                    "Next page",
                )}

                {numbered &&
                    control(pageCount, atEnd, "last", <ChevronsRight className="h-4 w-4" />, "Last page")}
            </div>
        </div>
    );
}

/**
 * First page, last page, and the two either side of the current one, with "gap" markers where the
 * run is broken. Keeps the control count constant so the bar does not change width as you page
 * through - a bar that reflows under the cursor makes you miss the button you were aiming at.
 */
function windowedPages(current: number, total: number): (number | "gap")[] {
    const shown = new Set<number>([1, total, current]);
    for (let d = 1; d <= 2; d++) {
        if (current - d >= 1) shown.add(current - d);
        if (current + d <= total) shown.add(current + d);
    }

    const sorted = [...shown].sort((a, b) => a - b);
    const out: (number | "gap")[] = [];
    let prev = 0;
    for (const p of sorted) {
        if (prev && p - prev > 1) out.push("gap");
        out.push(p);
        prev = p;
    }
    return out;
}

/**
 * Slice helper so a client-side paginated list does not re-derive the same arithmetic (and get the
 * off-by-one wrong) at every call site.
 *
 * Clamps the page, so a list that shrinks under an active filter - you are on page 7, you type a
 * search that leaves 12 results - shows the last real page instead of an empty one.
 */
export function paginate<T>(items: T[], page: number, pageSize: number) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const current = Math.min(Math.max(1, page), totalPages);
    const start = (current - 1) * pageSize;
    return {
        pageItems: items.slice(start, start + pageSize),
        page: current,
        totalPages,
        totalItems: items.length,
    };
}
