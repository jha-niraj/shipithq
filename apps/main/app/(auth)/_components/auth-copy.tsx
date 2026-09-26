import { Muted, type AuthPanelCopy } from "@repo/ui/components/auth/auth-shell"

/**
 * What the brand panel says on each auth route, and which animated motif sits on
 * its frosted plate (plan/auth AUTH-2). Keyed by pathname because the shell is
 * rendered by the layout, which persists across navigation; only this copy and
 * the art cross-fade between routes.
 */
export const AUTH_COPY: Record<string, AuthPanelCopy> = {
    "/signin": {
        art: "contributions",
        headline: <>Build projects. Crack interviews. <Muted>Land the job.</Muted></>,
        sub: "Sign in to pick up where you left off.",
    },
    "/register": {
        art: "commit-graph",
        headline: <>Join the <Muted>community</Muted>.</>,
        sub: "Build projects, learn from peers, and grow your skills with thousands of developers.",
    },
    "/forgotpassword": {
        art: "otp-mail",
        headline: <>Locked out? <Muted>Happens.</Muted></>,
        sub: "Enter the address you signed up with and we'll send a six-digit code.",
    },
    "/resetpassword": {
        art: "shield",
        headline: <>Set a new <Muted>password</Muted>.</>,
        sub: "Enter the code we emailed you, then choose something you have not used before.",
    },
    "/error": {
        art: "shield",
        headline: <>That didn&apos;t work. <Muted>Let&apos;s try again.</Muted></>,
        sub: "Your account is safe. Nothing was changed.",
    },
}

/** Sign-in's copy is the fallback: it is the route people arrive on. */
export const AUTH_COPY_FALLBACK = AUTH_COPY["/signin"]!
