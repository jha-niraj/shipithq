"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { isSafeCallback } from "@/lib/urls"
import { INCIDENT_PERKS, SignInPromptDialog } from "@/components/auth/sign-in-prompt"

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

/** The Incidents wording of the shared sign-in dialog (components/auth/sign-in-prompt). */
function SignInDialog({ callback, onClose }: { callback: string | null; onClose: () => void }) {
    return (
        <SignInPromptDialog
            prompt={callback === null ? null : {
                callback,
                eyebrow: "Incidents",
                title: "Sign in to make the call",
                body: "Reading stays free. Answering needs an account so your progress is kept, and you come straight back to this step.",
                perks: INCIDENT_PERKS,
            }}
            onClose={onClose}
        />
    )
}
