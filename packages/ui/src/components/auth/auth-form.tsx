"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Checkbox } from "../ui/checkbox"
import { cn } from "../../lib/utils"
import { Shimmer, ShimmerStyles } from "../skeleton-kit"

/**
 * The form parts every auth screen is built from (plan/auth AUTH-1).
 *
 * The rule these exist to hold: an auth screen styles NOTHING locally. Inputs,
 * buttons, checkboxes and labels are the base components as they look everywhere
 * else in the app. The screens used to override each one (`h-12`, `bg-zinc-900`,
 * a `border-2` OTP box, a divider drawn as a line behind a white-backed span), and
 * every override drifted from the next, which is what made them look odd in dark
 * mode. Layout goes here, once; the screen only supplies copy and behaviour.
 */

/** Title and one line under it. `icon` is for the states that need one (sent, verified). */
export function AuthHeader({ title, description, icon }: {
    title: React.ReactNode
    description?: React.ReactNode
    icon?: React.ReactNode
}) {
    return (
        <div className="mb-7">
            {icon && (
                <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-neutral-200 text-neutral-900 dark:border-neutral-800 dark:text-white">
                    {icon}
                </div>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h1>
            {description && (
                <p className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>
            )}
        </div>
    )
}

/**
 * A hairline with a word in it. Two flex rules either side of the text, so it sits
 * on any background - the old version painted a white box behind "or" to hide a
 * full-width line, which showed as a grey patch on the dark card.
 */
export function AuthDivider({ children = "or" }: { children?: React.ReactNode }) {
    return (
        <div className="my-6 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400" role="separator">
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            {children}
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>
    )
}

/** Label, control, then an error or a hint. `action` sits right of the label ("Forgot password?"). */
export function AuthField({ label, htmlFor, action, hint, error, children }: {
    label: React.ReactNode
    htmlFor?: string
    action?: React.ReactNode
    hint?: React.ReactNode
    error?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <Label htmlFor={htmlFor} className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{label}</Label>
                {action && <div className="text-[13px]">{action}</div>}
            </div>
            {children}
            {error ? (
                <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">{error}</p>
            ) : hint ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
            ) : null}
        </div>
    )
}

/** The base Input with a show/hide toggle inside its right edge. */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(
    function PasswordInput({ className, disabled, ...props }, ref) {
        const [shown, setShown] = React.useState(false)
        return (
            <div className="relative">
                <Input ref={ref} type={shown ? "text" : "password"} disabled={disabled} className={cn("pr-11", className)} {...props} />
                <button
                    type="button"
                    onClick={() => setShown((s) => !s)}
                    disabled={disabled}
                    aria-label={shown ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-neutral-500 transition-colors hover:text-neutral-900 disabled:cursor-not-allowed dark:text-neutral-400 dark:hover:text-white"
                >
                    {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
        )
    },
)

/**
 * The public site, where the legal pages live. Each app inlines its own
 * NEXT_PUBLIC_WEB_URL at build time; unset, it falls back to production rather
 * than a localhost port (plan/auth AUTH-5 - the old links resolved to :3000,
 * which is nothing in this repo).
 */
export const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL || "https://www.shipithq.com").replace(/\/$/, "")

/** Where the legal pages live. Hiring and uni have their own; main's are on the public site. */
export type LegalHrefs = { terms: string; privacy: string }

const WEB_LEGAL: LegalHrefs = { terms: `${WEB_URL}/termsofservice`, privacy: `${WEB_URL}/privacypolicy` }

/** Terms and privacy links, opened in a new tab so a half-filled form survives. */
function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noreferrer"
            className="font-medium text-neutral-900 underline underline-offset-4 hover:no-underline dark:text-white">
            {children}
        </a>
    )
}

/** The consent checkbox on register. */
export function AuthLegal({ checked, onCheckedChange, disabled, id = "auth-legal", hrefs = WEB_LEGAL }: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    id?: string
    hrefs?: LegalHrefs
}) {
    return (
        <div className="flex items-start gap-2.5">
            <Checkbox id={id} className="mt-0.5" checked={checked} disabled={disabled} onCheckedChange={(c) => onCheckedChange(c === true)} />
            <label htmlFor={id} className="cursor-pointer text-[13px] leading-5 text-neutral-600 dark:text-neutral-400">
                I agree to the <LegalLink href={hrefs.terms}>Terms of Service</LegalLink> and{" "}
                <LegalLink href={hrefs.privacy}>Privacy Policy</LegalLink>.
            </label>
        </div>
    )
}

/** The small print for social sign-up, where there is no checkbox to tick. */
export function AuthLegalNote({ hrefs = WEB_LEGAL }: { hrefs?: LegalHrefs }) {
    return (
        <p className="mt-6 text-center text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            By continuing you agree to the <LegalLink href={hrefs.terms}>Terms</LegalLink> and{" "}
            <LegalLink href={hrefs.privacy}>Privacy Policy</LegalLink>.
        </p>
    )
}

/** The line under the form: "Don't have an account? Create one". */
export function AuthFootnote({ children }: { children: React.ReactNode }) {
    return (
        <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400 [&_a]:font-medium [&_a]:text-neutral-900 [&_a]:underline-offset-4 hover:[&_a]:underline dark:[&_a]:text-white">
            {children}
        </p>
    )
}

/** A quiet inline link or text button for secondary actions inside a form. */
export const authLinkClass =
    "cursor-pointer font-medium text-neutral-900 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline dark:text-white dark:disabled:text-neutral-600"

/**
 * Six one-digit cells for an emailed code. Typing advances, Backspace on an empty
 * cell goes back, pasting six digits fills every cell. `onComplete` fires once the
 * sixth digit lands, so the screen can verify without a button press.
 */
export function OtpInput({ value, onChange, onComplete, disabled, length = 6, autoFocus }: {
    value: string
    onChange: (value: string) => void
    onComplete?: (value: string) => void
    disabled?: boolean
    length?: number
    autoFocus?: boolean
}) {
    const refs = React.useRef<Array<HTMLInputElement | null>>([])
    // A blank cell is held as a space so a digit typed into cell 4 stays in cell 4.
    // Screens test completeness with `/^\d{6}$/`, which a space fails.
    const cells = Array.from({ length }, (_, i) => (value[i] ?? "").trim())

    React.useEffect(() => {
        if (!autoFocus) return
        const t = setTimeout(() => refs.current[0]?.focus(), 60)
        return () => clearTimeout(t)
    }, [autoFocus])

    // Clearing the value from outside (a wrong code) sends focus back to the start.
    React.useEffect(() => {
        if (value === "" && autoFocus) refs.current[0]?.focus()
    }, [value, autoFocus])

    const commit = (next: string[]) => {
        onChange(next.map((c) => c || " ").join("").trimEnd())
        if (next.every(Boolean)) onComplete?.(next.join(""))
    }

    return (
        <div className="flex gap-2">
            {cells.map((digit, i) => (
                <Input
                    key={i}
                    ref={(el) => { refs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`Digit ${i + 1}`}
                    maxLength={1}
                    value={digit}
                    disabled={disabled}
                    className="h-12 min-w-0 flex-1 px-0 text-center text-lg font-semibold tabular-nums"
                    onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(-1)
                        if (e.target.value && !v) return
                        const next = [...cells]
                        next[i] = v
                        commit(next)
                        if (v && i < length - 1) refs.current[i + 1]?.focus()
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Backspace" && !cells[i] && i > 0) refs.current[i - 1]?.focus()
                    }}
                    onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "")
                        if (pasted.length !== length) return
                        e.preventDefault()
                        commit(pasted.split(""))
                        refs.current[length - 1]?.focus()
                    }}
                />
            ))}
        </div>
    )
}

/** A form-level error, above the fields. Rose is kept for errors only, as elsewhere. */
export function AuthAlert({ children }: { children: React.ReactNode }) {
    if (!children) return null
    return (
        <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {children}
        </div>
    )
}

/** A neutral notice ("Link sent. Open it on this device..."). */
export function AuthNotice({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] leading-5 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            {children}
        </div>
    )
}

const PASSWORD_RULES = [
    { label: "8+ characters", test: (p: string) => p.length >= 8 },
    { label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "A number", test: (p: string) => /[0-9]/.test(p) },
    { label: "A special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
] as const

/** The register rule set. 8 matches `minPasswordLength` in packages/auth/src/auth.ts. */
export function passwordIsStrong(password: string): boolean {
    return PASSWORD_RULES.every((r) => r.test(password))
}

/**
 * The checklist under a new password. Shown from the first keystroke until every
 * rule passes, then it collapses, so it does not keep pushing the submit button
 * down once it has nothing left to say.
 */
export function PasswordRules({ password }: { password: string }) {
    if (!password || passwordIsStrong(password)) return null
    return (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 animate-in fade-in-0 duration-150">
            {PASSWORD_RULES.map((r) => {
                const met = r.test(password)
                return (
                    <li key={r.label} className={cn("flex items-center gap-1.5 text-xs", met ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400")}>
                        <span className={cn("size-1.5 shrink-0 rounded-full", met ? "bg-neutral-900 dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700")} />
                        {r.label}
                    </li>
                )
            })}
        </ul>
    )
}

/**
 * The form column's shape while a screen's search params resolve: header, fields,
 * button. Used as the Suspense fallback so the column does not jump.
 */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
    return (
        <div aria-hidden className="space-y-5">
            <ShimmerStyles />
            <div className="space-y-2.5 pb-2">
                <Shimmer className="h-7 w-2/3" />
                <Shimmer className="h-4 w-full" delay={0.05} />
            </div>
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Shimmer className="h-3.5 w-24" delay={0.1 + i * 0.05} />
                    <Shimmer className="h-11 w-full rounded-lg" delay={0.1 + i * 0.05} />
                </div>
            ))}
            <Shimmer className="h-11 w-full" delay={0.2} />
        </div>
    )
}
