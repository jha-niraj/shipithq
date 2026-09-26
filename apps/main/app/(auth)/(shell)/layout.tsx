import type { ReactNode } from "react"
import { AuthShell } from "@repo/ui/components/auth/auth-shell"
import { AUTH_COPY, AUTH_COPY_FALLBACK } from "../_components/auth-copy"

/**
 * The two-column shell, rendered HERE rather than by each page, so moving between
 * auth routes swaps only the form column (see the kit's auth-shell.tsx).
 *
 * `/onboarding` and `/error` sit outside this `(shell)` group because they own
 * their full-page layouts; the group adds no path segment.
 */
export default function AuthShellLayout({ children }: { children: ReactNode }) {
    return <AuthShell copy={AUTH_COPY} fallback={AUTH_COPY_FALLBACK}>{children}</AuthShell>
}
