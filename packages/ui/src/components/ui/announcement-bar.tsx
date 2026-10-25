'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * A full-bleed strip above the nav carrying one line and, usually, a link.
 *
 * ## It is IN FLOW, and that is the whole design
 *
 * It sits at the top of the document and scrolls away with the page - gone for good once you scroll
 * past it, rather than following you down. That is the behaviour chosen on 2026-09-22, and it is
 * why this is a plain block and not `fixed`: an announcement is worth one look, not a permanent
 * band taken out of every screen.
 *
 * A consumer whose navbar is `sticky` or absent needs nothing else - the bar scrolls away and the
 * navbar pins behind it with no JavaScript at all. A consumer whose navbar is `fixed` and floating
 * (the marketing site) has to be pushed down by whatever is left of the bar, which is what
 * `pushVar` is for. See the note on it.
 *
 * ## Dismissal has to survive SSR without a flash
 *
 * The bar renders on the server: it belongs in the HTML for crawlers, and rendering it client-side
 * would shift the page after hydration. But someone who already dismissed it must never SEE it.
 *
 * So an inline script runs during parse and removes the node before first paint. An effect cannot
 * do this - effects run after paint, so every load would flash the bar at someone who has already
 * said no. Same mechanism, and the same reasoning, as the playful theme pin in the student app.
 *
 * **The storage key carries a slug of the MESSAGE.** Changing the copy brings the bar back for
 * everyone who dismissed the old one. A dismissal that silently swallows the next announcement is
 * worse than having no dismissal at all.
 */
export type Announcement = {
    /** Master switch. `false` renders nothing, with no storage read and no script. */
    active: boolean
    /** The single line. Keep it a sentence - this is a strip, not a paragraph. */
    message: string
    /** Optional destination for the whole bar. */
    href?: string
    /** The call to action rendered after the message. Needs `href`. */
    linkLabel?: string
    /**
     * `YYYY-MM-DD`, exclusive. After this date the bar renders nothing.
     *
     * The point is that a bar about an event cannot outlive the event. Announcements are written
     * in a hurry and taken down by whoever remembers, which is how a site ends up inviting people
     * to a webinar that happened in Asar.
     */
    until?: string
}

/** `Gurukul is live for 2083` -> `gurukul-is-live-for-2083`, trimmed. The storage key's identity. */
function slug(message: string): string {
    return message.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

/** Has the window for this announcement closed? Compared as dates, so it expires at local midnight. */
function expired(until: string | undefined, now = new Date()): boolean {
    if (!until) return false
    const end = new Date(`${until}T23:59:59`)
    return Number.isFinite(end.getTime()) && now > end
}

export function AnnouncementBar({
    announcement,
    className,
    linkClassName,
    dismissClassName,
    pushVar,
}: {
    announcement: Announcement
    /** The strip itself. Consumers bring their own palette - this component picks no colours. */
    className?: string
    /** The call-to-action. */
    linkClassName?: string
    /** The dismiss control. */
    dismissClassName?: string
    /**
     * Publish `max(0, barHeight - scrollY)` as this CSS custom property on `<html>`.
     *
     * ONLY for a consumer whose navbar is `fixed` and floating, which would otherwise paint
     * straight over a bar that is in flow. The marketing site is the one such case: its navbar
     * floats because the hero pays for its own clearance, so making the navbar `sticky` instead
     * would push every hero down by the navbar's height on top of the padding it already carries.
     *
     * Everyone else omits this and costs nothing - no listener is attached at all.
     */
    pushVar?: string
}) {
    const { active, message, href, linkLabel, until } = announcement
    const key = `gk-announce:${slug(message)}`
    const ref = useRef<HTMLDivElement>(null)

    // Rendered on the server so it is in the HTML; the inline script below removes it before paint
    // for anyone who dismissed it, and this state handles a dismissal made in THIS session.
    const [gone, setGone] = useState(false)

    useEffect(() => {
        if (!pushVar || gone) return
        const root = document.documentElement
        const el = ref.current
        if (!el) return

        let frame = 0
        const measure = () => {
            frame = 0
            const h = el.offsetHeight
            root.style.setProperty(pushVar, `${Math.max(0, h - window.scrollY)}px`)
        }
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure) }

        measure()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll, { passive: true })
        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            if (frame) cancelAnimationFrame(frame)
            // Leave nothing behind - a stale push would hold the navbar down on a page with no bar.
            root.style.removeProperty(pushVar)
        }
    }, [pushVar, gone])

    if (!active || gone || expired(until)) return null

    const dismiss = () => {
        try { localStorage.setItem(key, '1') } catch { /* private mode, blocked storage */ }
        setGone(true)
    }

    /*
     * Runs during parse, before the bar has painted. `try/catch` because a private window or
     * blocked site data throws on the read, and a banner is never worth breaking a page over.
     */
    const hideIfDismissed = `(function(){try{if(localStorage.getItem('${key}')){var e=document.currentScript&&document.currentScript.previousElementSibling;if(e)e.remove();}}catch(e){}})();`

    const body = (
        <>
            <span>{message}</span>
            {href && linkLabel ? (
                <span className={cn('underline underline-offset-4', linkClassName)}>{linkLabel}</span>
            ) : null}
        </>
    )

    return (
        <>
            <div
                ref={ref}
                // `relative`, never `fixed` - see the note at the top. This is the whole reason the
                // bar scrolls away instead of following the reader down the page.
                className={cn('relative flex w-full items-center justify-center gap-2 px-10 py-2.5 text-center text-[13.5px]', className)}
            >
                {href ? (
                    <a href={href} className="inline-flex flex-wrap items-center justify-center gap-2 hover:opacity-80">
                        {body}
                    </a>
                ) : (
                    <span className="inline-flex flex-wrap items-center justify-center gap-2">{body}</span>
                )}

                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss announcement"
                    // Absolute so the message stays centred on the BAR rather than centred in the
                    // space left over beside the button, which reads as a half-pixel off at every
                    // width and is the kind of thing nobody can name but everybody sees.
                    className={cn(
                        'absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-current opacity-60 transition-opacity hover:opacity-100',
                        dismissClassName,
                    )}
                >
                    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                </button>
            </div>
            {/* Must come immediately AFTER the bar - it finds it via `previousElementSibling`. */}
            <script dangerouslySetInnerHTML={{ __html: hideIfDismissed }} />
        </>
    )
}
