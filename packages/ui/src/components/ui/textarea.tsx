"use client"

import * as React from "react"
import { cn } from "../../lib/utils"
import { ScrollArea } from "./scroll-area"

/**
 * A textarea that scrolls with the app's own scrollbar.
 *
 * ── Why it is built inside-out ──
 *
 * A `<textarea>` is a leaf element. A `ScrollArea` cannot be placed inside one, so the only
 * way to give it a styled scrollbar is to stop it scrolling at all: the textarea grows to
 * fit its content and never overflows, and a `ScrollArea` wrapped around it caps the height
 * and does the scrolling. That is what makes this different from putting a `ScrollArea`
 * beside a textarea - the two would fight over which one owns the overflow.
 *
 * ── Staying a drop-in ──
 *
 * There are ~69 call sites across the monorepo and they pass `className` expecting it to
 * describe the BOX: `h-24`, `min-h-[200px]`, `text-xs`, `resize-none`. So `className` lands
 * on the wrapper, which is the element that now carries the border, the background and the
 * height. Two details make that safe:
 *
 *   - Tailwind's preflight sets `font: inherit` on form controls, so `text-xs` on the
 *     wrapper still reaches the textarea.
 *   - `cn` is tailwind-merge, so a caller's `min-h-[200px]` replaces the default rather
 *     than colliding with it.
 *
 * `resize-none` becomes a no-op because a drag handle cannot coexist with auto-grow - the
 * height is derived from the content on every change. Passing it is harmless.
 *
 * ── The focus ring ──
 *
 * The ring has to move to the wrapper, because the textarea inside it is borderless and
 * transparent. `has-[textarea:focus-visible]` is what puts it there without a state hook.
 *
 * No ring OFFSET (taken from gurukulhq, 2026-09-22). `ring-offset-2` paints a band of
 * `--tw-ring-offset-color` between the box and the ring, nothing here sets that variable, and its
 * initial value is white: every focused textarea wore a white hairline, glaring in dark mode. The
 * border darkens and a 40% ring shows instead, matching `input.tsx`.
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** Classes for the scrolling viewport. Rarely needed - heights belong on `className`. */
    viewportClassName?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, viewportClassName, style, onChange, ...props }, ref) => {
        const inner = React.useRef<HTMLTextAreaElement>(null)
        // Callers that hold a ref do it to focus the field or read its value, so the ref
        // must still resolve to the textarea and not to the wrapper.
        React.useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement, [])

        const grow = React.useCallback(() => {
            const el = inner.current
            if (!el) return
            // Reset first: `scrollHeight` never reports a height smaller than the element
            // already is, so without this the box can only ever grow.
            el.style.height = "auto"
            el.style.height = `${el.scrollHeight}px`
        }, [])

        // Runs on `value` too, not just on input. A programmatic set - an AI rewrite, a
        // profile sync, a form reset - changes the content without ever firing `onChange`,
        // and the box would keep the height of whatever was there before.
        React.useLayoutEffect(grow, [grow, props.value, props.defaultValue, props.rows])

        return (
            <ScrollArea
                reflow
                // `auto`, not Radix's default `hover`. On a scroll container you are looking
                // at, a bar that only appears once the pointer is already inside it does not
                // tell you there is more text - the content just looks cut off. `auto` shows
                // it whenever the content actually overflows.
                type="auto"
                className={cn(
                    `
                        max-h-64 min-h-[96px] w-full
                        rounded-xl border
                        border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900
                        px-3 py-2 text-sm
                        text-neutral-900 dark:text-neutral-100
                        transition-colors
                        hover:bg-neutral-50 dark:hover:bg-neutral-800
                        has-[textarea:focus-visible]:border-neutral-400 dark:has-[textarea:focus-visible]:border-neutral-500
                        has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/40
                        has-[textarea:disabled]:cursor-not-allowed has-[textarea:disabled]:opacity-50
                    `,
                    className,
                )}
                viewportClassName={viewportClassName}
            >
                <textarea
                    ref={inner}
                    onChange={(e) => {
                        grow()
                        onChange?.(e)
                    }}
                    className={cn(`
                        block w-full resize-none border-0 bg-transparent p-0
                        text-inherit placeholder:text-neutral-500 dark:placeholder:text-neutral-400
                        focus:outline-none focus:ring-0
                        disabled:cursor-not-allowed
                    `)}
                    // `overflow: hidden` is what hands the scrolling to the wrapper. Inline
                    // rather than a class because `grow()` writes `height` inline on the same
                    // element and the two need to sit together.
                    style={{ overflow: "hidden", ...style }}
                    {...props}
                />
            </ScrollArea>
        )
    },
)
Textarea.displayName = "Textarea"

export { Textarea }
