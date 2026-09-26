import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { IncidentsGateProvider } from "@/components/incidents/sign-in-gate"

/**
 * Incidents (plan/incidents INC-7): inside the app shell, so the sidebar is always
 * there, and still public (middleware lists `/incidents`). Signed out, the shell
 * shows the same page with a Sign in footer. The session is read here once, so every
 * gated control knows on first paint whether to act or to ask.
 */
export default async function IncidentsLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession(await headers())
    return <IncidentsGateProvider signedIn={!!session?.user?.id}>{children}</IncidentsGateProvider>
}
