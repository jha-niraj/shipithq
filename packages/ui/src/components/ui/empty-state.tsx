import { Button } from "./button"
import { ReactNode } from "react"
import { cn } from "../../lib/utils"
import { IconStack, ICON_STACK_ICON_TONE, ICON_STACK_TONE, type IconStackTone } from "./icon-stack"

// Scoped keyframes for the default illustration. Prefixed (gkes-) to avoid collisions;
// duplicate identical <style> tags across instances are harmless.
const ILLUSTRATION_CSS = `
@keyframes gkes-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes gkes-float-b { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
@keyframes gkes-spin { to { transform: rotate(360deg) } }
@keyframes gkes-dot { 0%,80%,100%{opacity:.2; transform:scale(.7)} 40%{opacity:1; transform:scale(1)} }
`

/**
 * Animated, self-contained empty-state illustration (pure CSS - no JS/deps).
 * Neutral with a single amber accent so it fits the app's palette in light + dark.
 */
export function EmptyStateIllustration({ className }: { className?: string }) {
    return (
        <div className={cn("relative", className)} aria-hidden>
            <style>{ILLUSTRATION_CSS}</style>
            <svg viewBox="0 0 200 170" className="w-28 h-auto sm:w-40" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Ambient rotating dashed ring */}
                <circle
                    cx="100" cy="82" r="60"
                    className="stroke-neutral-200 dark:stroke-neutral-800"
                    strokeWidth="2" strokeDasharray="4 10" strokeLinecap="round"
                    style={{ transformBox: "fill-box", transformOrigin: "center", animation: "gkes-spin 24s linear infinite" }}
                />

                {/* Floating document card */}
                <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: "gkes-float 3.6s ease-in-out infinite" }}>
                    <rect x="62" y="44" width="76" height="92" rx="10"
                        className="fill-white dark:fill-neutral-900 stroke-neutral-200 dark:stroke-neutral-700" strokeWidth="2" />
                    <rect x="74" y="60" width="52" height="6" rx="3" className="fill-neutral-200 dark:fill-neutral-700" />
                    <rect x="74" y="74" width="40" height="6" rx="3" className="fill-neutral-200 dark:fill-neutral-800" />
                    <rect x="74" y="88" width="46" height="6" rx="3" className="fill-neutral-200 dark:fill-neutral-800" />
                    <rect x="74" y="102" width="30" height="6" rx="3" className="fill-neutral-200 dark:fill-neutral-800" />
                </g>

                {/* Magnifying glass, floating opposite the card */}
                <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: "gkes-float-b 3.6s ease-in-out infinite" }}>
                    <circle cx="126" cy="112" r="20"
                        className="fill-amber-50 dark:fill-amber-500/10 stroke-amber-400/80" strokeWidth="3" />
                    <line x1="141" y1="127" x2="152" y2="138"
                        className="stroke-amber-400/80" strokeWidth="4" strokeLinecap="round" />
                </g>

                {/* Searching dots */}
                {[0, 1, 2].map((i) => (
                    <circle key={i} cx={86 + i * 14} cy="150" r="4"
                        className="fill-neutral-300 dark:fill-neutral-600"
                        style={{ transformBox: "fill-box", transformOrigin: "center", animation: `gkes-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
            </svg>
        </div>
    )
}

interface EmptyStateProps {
    /**
     * Optional glyph - a lucide element such as `<Users />`. It is drawn inside an IconStack (the
     * layered tiles), at the stack's own glyph size whatever size the caller gave it. When omitted,
     * the animated illustration is shown.
     */
    icon?: ReactNode
    /** Tints the stack: `neutral` (default) or `amber` for a warning ("set this up first"). */
    tone?: IconStackTone
    /** A small check chip on the stack's corner - "all done" rather than "nothing yet". */
    badge?: "check"
    title: string
    description: string
    action?: ReactNode
    actionLabel?: string
    onAction?: () => void
    className?: string
    /** Set false to render without the card chrome (border/bg) - e.g. inside an existing card. */
    bordered?: boolean
}

export const EmptyState = ({
    icon,
    title,
    description,
    action,
    actionLabel,
    onAction,
    className,
    bordered = false,
    tone = "neutral",
    badge,
}: EmptyStateProps) => {
    return (
        <div
            className={cn(
                // `p-6` on a phone and a `w-28` illustration, stepping up from `sm`. Measured at
                // 360x640: at `p-8` with the 160px illustration this component is ~306px tall, and
                // a bounded page routinely gives its empty region less than that - the billing
                // subscriptions roster gives it 206px - so the illustration and part of the text
                // were clipped by the region's `overflow-hidden`. An empty state that does not fit
                // is worse than a plain sentence, and it is the one state where the page has the
                // least to say.
                "flex flex-col items-center justify-center text-center p-6 sm:p-8",
                bordered && "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
                className,
            )}
        >
            {icon ? (
                <div className="relative mb-3 sm:mb-4">
                    {/* Plain (inside a card, often a short region) gets the small stack; the bordered
                        card is the whole region, so it can take the default size from `sm`. The
                        glyph is forced to the stack's size - call sites still pass h-9 w-9 from
                        when the icon stood alone. */}
                    <IconStack
                        aria-hidden="true"
                        className={cn(
                            ICON_STACK_TONE[tone],
                            bordered ? "h-16 w-14 sm:h-20 sm:w-18" : "h-16 w-14",
                        )}
                    >
                        <span
                            className={cn(
                                "flex items-center justify-center",
                                ICON_STACK_ICON_TONE[tone],
                                bordered ? "[&_svg]:size-3.5! sm:[&_svg]:size-4!" : "[&_svg]:size-3.5!",
                            )}
                        >
                            {icon}
                        </span>
                    </IconStack>
                    {badge === "check" ? (
                        <span className="absolute -right-1 top-1 flex size-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-amber-600 shadow-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-amber-400">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                        </span>
                    ) : null}
                </div>
            ) : (
                <EmptyStateIllustration className="mb-3 sm:mb-4" />
            )}
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1.5">{title}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">{description}</p>
            {action ? (
                <div className="mt-6">{action}</div>
            ) : actionLabel && onAction ? (
                <Button onClick={onAction} variant="outline" className="mt-6">
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    )
}
