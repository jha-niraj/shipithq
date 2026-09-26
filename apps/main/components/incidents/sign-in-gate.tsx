"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, BookOpen, Flame, Trophy } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/components/ui/dialog"
import { Button } from "@repo/ui/components/ui/button"
import { isSafeCallback } from "@/lib/urls"

/**
 * The sign-in gate for Incidents (plan/incidents INC-1).
 *
 * Reading is free; every ACTION (answering, the simulator's predictions, a round,
 * the checklist) is gated. Niraj, 2026-09-26: "for any action show a dialog box to
 * sign in and then take them to the sign-in page ... and come back with the
 * callbackUrl". So the dialog does not sign anyone in itself: it links to /signin or
 * /register carrying `callbackUrl=/incidents/<slug>#<step>`, and plan/ideas IDEA-1
 * carries that through OAuth, magic links and onboarding back to the same step.
 *
 * `signedIn` comes from the server (the layout reads the session), so a control
 * never flashes the dialog while a client session loads.
 */

type GateContext = {
    signedIn: boolean
    /** Run `action` when signed in; otherwise open the dialog, returning to `step`. */
    gate: (action: () => void, step?: string) => void
}

const Ctx = createContext<GateContext | null>(null)

/** Where sign-in should return to: this page, at this step. Same-origin only. */
export function incidentCallback(pathname: string, step?: string): string {
    const path = isSafeCallback(pathname) ? pathname : "/incidents"
    return step ? `${path}#${encodeURIComponent(step)}` : path
}

export function IncidentsGateProvider({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
    const pathname = usePathname()
    const [callback, setCallback] = useState<string | null>(null)

    const gate = useCallback<GateContext["gate"]>((action, step) => {
        if (signedIn) return action()
        setCallback(incidentCallback(pathname, step))
    }, [signedIn, pathname])

    const value = useMemo(() => ({ signedIn, gate }), [signedIn, gate])

    return (
        <Ctx.Provider value={value}>
            {children}
            <SignInDialog callback={callback} onClose={() => setCallback(null)} />
        </Ctx.Provider>
    )
}

export function useGate(): GateContext {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error("useGate must be used inside IncidentsGateProvider")
    return ctx
}

const PERKS = [
    { icon: Trophy, text: "XP for every call you get right, into your ShipItHQ level" },
    { icon: Flame, text: "A streak, badges and a readiness score per topic" },
    { icon: BookOpen, text: "Your place in every case, kept between visits" },
]

function SignInDialog({ callback, onClose }: { callback: string | null; onClose: () => void }) {
    const q = callback ? `?callbackUrl=${encodeURIComponent(callback)}` : ""
    return (
        <Dialog open={callback !== null} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0">
                <div className="border-b border-neutral-200 bg-neutral-50 px-6 pb-5 pt-6 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Incidents</p>
                    <DialogTitle className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                        Sign in to make the call
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                        Reading stays free. Answering needs an account so your progress is kept, and you come straight back to this step.
                    </DialogDescription>
                </div>
                <ul className="space-y-3 px-6 py-5">
                    {PERKS.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-start gap-3 text-sm leading-5 text-neutral-700 dark:text-neutral-300">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                <Icon className="size-3.5" aria-hidden />
                            </span>
                            <span className="pt-1">{text}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-col gap-2 border-t border-neutral-200 px-6 py-5 sm:flex-row-reverse dark:border-neutral-800">
                    <Button asChild className="h-10 flex-1 rounded-xl">
                        <Link href={`/signin${q}`}>Sign in <ArrowRight className="ml-1.5 size-4" aria-hidden /></Link>
                    </Button>
                    <Button asChild variant="outline" className="h-10 flex-1 rounded-xl">
                        <Link href={`/register${q}`}>Create a free account</Link>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
