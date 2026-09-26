import type { ReactNode } from "react"
import { AuthShell, Muted, type AuthPanelCopy } from "@repo/ui/components/auth/auth-shell"

/**
 * The shared auth shell for uni (plan/auth AUTH-4). A route group so /onboarding
 * keeps its own layout; the group adds no path segment.
 */
const COPY: Record<string, AuthPanelCopy> = {
    "/signin": {
        art: "contributions",
        headline: <>See how your students <Muted>actually build.</Muted></>,
        sub: "Sign in to your institution's workspace.",
    },
    "/register": {
        art: "commit-graph",
        headline: <>Bring your campus <Muted>on board.</Muted></>,
        sub: "Create your institution's workspace and invite your faculty.",
    },
    "/verify": {
        art: "otp-cells",
        headline: <>One code and <Muted>you're in.</Muted></>,
        sub: "We emailed a six-digit code to confirm your address.",
    },
    "/forgotpassword": {
        art: "otp-mail",
        headline: <>Locked out? <Muted>Happens.</Muted></>,
        sub: "Enter the address you signed up with and we'll send a six-digit code.",
    },
    "/resetpassword": {
        art: "shield",
        headline: <>Set a new <Muted>password</Muted>.</>,
        sub: "Enter the code we emailed you, then choose something new.",
    },
}

export default function UniAuthShellLayout({ children }: { children: ReactNode }) {
    return <AuthShell copy={COPY} fallback={COPY["/signin"]!} brand="ShipItHQ University">{children}</AuthShell>
}
