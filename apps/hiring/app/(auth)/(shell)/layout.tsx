import type { ReactNode } from "react"
import { AuthShell, Muted, type AuthPanelCopy } from "@repo/ui/components/auth/auth-shell"

/**
 * The shared auth shell for hiring (plan/auth AUTH-3). A route group so
 * /onboarding, which owns its full-page flow, stays outside it; the group adds no
 * path segment, so every URL is unchanged.
 */
const COPY: Record<string, AuthPanelCopy> = {
    "/signin": {
        art: "funnel",
        headline: <>Hire from people who <Muted>already passed.</Muted></>,
        sub: "Candidates who have already built, practised and passed, in one pipeline.",
    },
    "/register": {
        art: "roster",
        headline: <>Set up your <Muted>hiring workspace.</Muted></>,
        sub: "You'll be its Owner, and can invite your team once it's set up.",
    },
    "/invite": {
        art: "roster",
        headline: <>Your team is <Muted>waiting.</Muted></>,
        sub: "Accept the invite to join your company's workspace.",
    },
    "/forgotpassword": {
        art: "otp-mail",
        headline: <>Locked out? <Muted>Happens.</Muted></>,
        sub: "Enter your work email and we'll send a six-digit code.",
    },
    "/resetpassword": {
        art: "shield",
        headline: <>Set a new <Muted>password</Muted>.</>,
        sub: "Enter the code we emailed you, then choose something new.",
    },
}

export default function HiringAuthShellLayout({ children }: { children: ReactNode }) {
    return <AuthShell copy={COPY} fallback={COPY["/signin"]!} brand="ShipItHQ Hiring">{children}</AuthShell>
}
