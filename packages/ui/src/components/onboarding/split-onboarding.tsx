"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Check, LogOut } from "lucide-react"
import { AuthBrandPanel, AUTH_PHOTO } from "../auth/auth-shell"
import type { AuthVisualVariant } from "../auth-visual"
import { Logo } from "../logo"
import { ThemeToggle } from "../themetoggle"
import { Button } from "../ui/button"
import { InlineLoader } from "../ui/inline-loader"
import { cn } from "../../lib/utils"

/*
 * The onboarding layout every app shares (plan/auth AUTH-11; Niraj, 2026-10-01): the auth
 * pages' photo panel on the left, one question at a time on the right, dash progress at the
 * top. Each app keeps its own steps and save calls and renders them with these parts:
 *
 *   <OnboardingFrame> ... <OnboardingStep title hint footer={<StepFooter .../>}> body </OnboardingStep>
 *
 * Enter continues (not inside a textarea), Escape goes back, done dashes jump back.
 * Below lg the panel goes and a short banner of the same photo sits above the question.
 */

export type OnboardingPanel = { headline: ReactNode; sub: string; art: AuthVisualVariant }

/** A muted run in a panel headline. White ink: the panel is a constant dark surface. */
export function PanelMuted({ children }: { children: ReactNode }) {
    return <span className="text-white/70">{children}</span>
}

export function OnboardingFrame({
    brand = "ShipItHQ", homeHref = "/", panel, panelKey, steps, current, onJump, onLogout, loggingOut, onEnter, onEscape, children,
}: {
    brand?: string
    homeHref?: string
    panel: OnboardingPanel
    /** Keys the panel copy and art, so they re-enter when it changes. */
    panelKey: string
    /** Number of steps for the dashes; omit on single screens (a blocked or invited state). */
    steps?: number
    /** Zero-based current step. */
    current?: number
    /** Jump to an earlier step from its dash. */
    onJump?: (index: number) => void
    onLogout?: () => void
    loggingOut?: boolean
    /** Enter anywhere but a textarea, a button or a link. */
    onEnter?: () => void
    /** Escape. */
    onEscape?: () => void
    children: ReactNode
}) {
    // Latest handlers in a ref, so one listener serves every step.
    const keys = useRef({ onEnter, onEscape })
    keys.current = { onEnter, onEscape }
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.isComposing) return
            const el = e.target as HTMLElement | null
            const tag = el?.tagName
            if (e.key === "Enter" && !e.shiftKey && tag !== "TEXTAREA" && tag !== "BUTTON" && tag !== "A" && !el?.closest("[role=listbox],[role=dialog],[role=combobox]")) {
                if (keys.current.onEnter) { e.preventDefault(); keys.current.onEnter() }
            }
            if (e.key === "Escape" && !el?.closest("[role=dialog],[role=listbox]") && keys.current.onEscape) keys.current.onEscape()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    return (
        <div className="relative flex h-dvh w-full overflow-hidden bg-white dark:bg-neutral-950">
            <AuthBrandPanel brand={brand} homeHref={homeHref} copyKey={panelKey} headline={panel.headline} sub={panel.sub} art={panel.art} />
            <div aria-hidden className="hidden w-px shrink-0 bg-neutral-200 lg:block dark:bg-neutral-800" />

            <div className="relative flex h-full w-full flex-col overflow-y-auto bg-neutral-50 lg:w-1/2 dark:bg-neutral-950">
                {/* Phone: the same photo as a short banner, with the brand on it. Constant white ink. */}
                <div className="relative h-24 w-full shrink-0 bg-black bg-cover bg-center lg:hidden" style={{ backgroundImage: `url(${AUTH_PHOTO.banner})` }}>
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/85" />
                    <Link href={homeHref} className="absolute bottom-4 left-6 flex items-center gap-2">
                        <Logo className="size-5 text-white" />
                        <span className="text-[15px] font-semibold tracking-tight text-white">{brand}</span>
                    </Link>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5 sm:px-10">
                    <span className="hidden w-28 sm:block" />
                    {steps && steps > 1 ? (
                        <nav className="flex items-center gap-2" aria-label={`Step ${(current ?? 0) + 1} of ${steps}`}>
                            {Array.from({ length: steps }, (_, n) => {
                                const done = n < (current ?? 0)
                                const cls = cn("block h-[3px] w-7 rounded-full transition-colors sm:w-9", n <= (current ?? 0) ? "bg-neutral-900 dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700")
                                return done && onJump
                                    ? <button key={n} type="button" onClick={() => onJump(n)} aria-label={`Back to step ${n + 1}`} className="-my-2 py-2"><span className={cls} /></button>
                                    : <span key={n} className={cls} aria-current={n === current ? "step" : undefined} />
                            })}
                        </nav>
                    ) : <span />}
                    <div className="flex w-28 items-center justify-end gap-2">
                        <ThemeToggle />
                        {onLogout && (
                            <button type="button" onClick={onLogout} disabled={loggingOut} aria-label="Log out" title="Log out"
                                className="flex size-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200/70 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                                {loggingOut ? <InlineLoader size="sm" /> : <LogOut className="size-4" />}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">{children}</div>
            </div>
        </div>
    )
}

/** One question: the big title, a hint, the body, an error, then the footer. Keyed by the caller per step. */
export function OnboardingStep({ title, hint, error, footer, wide = false, children }: {
    title: ReactNode
    hint?: ReactNode
    error?: string | null
    footer?: ReactNode
    /** For a step with a form of several fields. */
    wide?: boolean
    children?: ReactNode
}) {
    return (
        <div className={cn("auth-enter auth-form w-full", wide ? "max-w-[36rem]" : "max-w-[32rem]")}>
            <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-neutral-900 text-balance sm:text-[2.25rem] dark:text-white">{title}</h1>
            {hint && <p className="mt-3 text-[15px] leading-6 text-neutral-600 dark:text-neutral-400">{hint}</p>}
            {children && <div className="mt-8">{children}</div>}
            {error && <p role="alert" className="mt-4 text-[14px] text-rose-700 dark:text-rose-400">{error}</p>}
            {footer}
        </div>
    )
}

/** Back on the left; Skip and the primary action on the right. */
export function StepFooter({ onBack, onSkip, onNext, nextLabel = "Continue", busy, disabled }: {
    onBack?: () => void
    onSkip?: () => void
    onNext?: () => void
    nextLabel?: ReactNode
    busy?: boolean
    disabled?: boolean
}) {
    return (
        <div className="mt-10 flex items-center justify-between gap-3">
            {onBack
                ? <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[14px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"><ArrowLeft className="size-4" /> Back</button>
                : <span />}
            <div className="flex items-center gap-2">
                {onSkip && (
                    <button type="button" onClick={onSkip} disabled={busy}
                        className="rounded-md px-4 py-2.5 text-[15px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200/70 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800">Skip</button>
                )}
                {onNext && (
                    <Button type="button" onClick={onNext} disabled={busy || disabled} className="min-w-32 px-6">
                        {busy ? <InlineLoader size="sm" /> : nextLabel}
                    </Button>
                )}
            </div>
        </div>
    )
}

/** A pill that toggles; selected reads as ink. */
export function Chip({ on, children, onClick, icon }: { on: boolean; children: ReactNode; onClick: () => void; icon?: ReactNode }) {
    return (
        <button type="button" onClick={onClick} aria-pressed={on}
            className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] transition-colors",
                on
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 text-neutral-800 hover:border-neutral-500 hover:bg-white dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-900",
            )}>
            {on ? <Check className="size-3.5" aria-hidden /> : icon}{children}
        </button>
    )
}

/** A label above a control, for a step with several fields. */
export function StepField({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
    return (
        <label className="block space-y-2">
            <span className="text-[14px] font-medium text-neutral-800 dark:text-neutral-200">{label}{optional && <span className="font-normal text-neutral-500"> (optional)</span>}</span>
            {children}
        </label>
    )
}

/**
 * Choose one file. Checks type and size before anything uploads; an image shows as a round
 * preview. `accept` is the input's accept string; `types` the MIME types or extensions allowed.
 */
export function FilePick({ accept, file, onPick, icon, label, maxMb = 5, image = false, onError }: {
    accept: string
    file: File | null
    onPick: (f: File | null) => void
    icon: ReactNode
    label: string
    maxMb?: number
    image?: boolean
    onError?: (message: string | null) => void
}) {
    const ref = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<string | null>(null)
    useEffect(() => {
        if (!file || !image) { setPreview(null); return }
        const url = URL.createObjectURL(file)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [file, image])

    const allowed = accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    const choose = (f: File | null) => {
        if (!f) return onPick(null)
        const ext = `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`
        const ok = allowed.some((a) => (a.startsWith(".") ? a === ext : a === f.type.toLowerCase() || (a.endsWith("/*") && f.type.startsWith(a.slice(0, -1)))))
        if (!ok) { onError?.(`That file type isn't accepted. Use ${allowed.map((a) => a.replace(/^image\//, "").replace(/^\./, "").toUpperCase()).join(", ")}.`); return }
        if (f.size > maxMb * 1024 * 1024) { onError?.(`That file is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is ${maxMb} MB.`); return }
        onError?.(null)
        onPick(f)
    }

    return (
        <div>
            <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { choose(e.target.files?.[0] ?? null); e.target.value = "" }} />
            <button type="button" onClick={() => ref.current?.click()}
                className="flex w-full items-center gap-4 rounded-md border border-dashed border-neutral-300 px-4 py-5 text-left transition-colors hover:border-neutral-500 hover:bg-white dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-900">
                {preview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={preview} alt="" className="size-16 shrink-0 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-800" />
                    : <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-neutral-200/70 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">{icon}</span>}
                <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-neutral-900 dark:text-white">{file ? file.name : label}</span>
                    <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{file ? "Click to choose another" : `Up to ${maxMb} MB`}</span>
                </span>
            </button>
            {file && <button type="button" onClick={() => choose(null)} className="mt-2 rounded-md px-2 py-1 text-[13px] text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:bg-neutral-800">Remove</button>}
        </div>
    )
}
