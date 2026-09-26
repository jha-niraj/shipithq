import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@repo/auth"
import { SIDEBAR_UNPINNED_COOKIE } from "@repo/ui/lib/sidebar-pin-cookie"
import { getCompanyContext } from "@/lib/permissions"
import { enforcePlan } from "@/lib/plan"
import { HiringShell } from "./_components/hiring-shell"

// A server component: it reads the sidebar's pin cookie before the first paint,
// as in apps/main, and it decides who belongs here.
//
// "Onboarded" in the hiring app means "belongs to a company" (plan/hiring-app
// HA-5), read from `company_member`, NOT `user.onboardingCompleted`. That flag
// is shared with apps/main and set by the STUDENT onboarding, so a student
// signing in here used to skip company creation and land on an empty Home.
//
// The member's permissions (HA-6) go to the shell, which hides links and pages
// they can't use. Courtesy only: every action checks again on the server.
export default async function Layout({ children }: { children: React.ReactNode }) {
    const session = await getSession(headers())
    if (!session?.user?.id) redirect("/signin")
    const ctx = await getCompanyContext()
    if (!ctx) redirect("/onboarding")

    // Over the plan's live-job limit after a downgrade: the newest are paused (plan/hiring-app HA-20).
    await enforcePlan(ctx.companyId).catch((e: unknown) => console.error("enforcePlan:", e))
    const unpinned = (await cookies()).get(SIDEBAR_UNPINNED_COOKIE)?.value === "1"
    return (
        <HiringShell unpinned={unpinned} permissions={[...ctx.permissions]} roleName={ctx.roleName}>
            {/* A suspended company can sign in and read, and is told why nothing else works (HR-24). */}
            {ctx.member.company.suspendedAt && (
                <p role="status" className="border-b border-neutral-300 bg-neutral-100 px-5 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
                    <span className="font-semibold">Your company is suspended.</span> ShipItHQ is reviewing a report. Your roles are hidden from students, and publishing, messaging and decisions are paused. You can still read your candidates. Questions: <a href="mailto:support@shipithq.com" className="underline underline-offset-2">support@shipithq.com</a>
                </p>
            )}
            {children}
        </HiringShell>
    )
}
