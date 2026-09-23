import { cookies } from 'next/headers'
import { SIDEBAR_UNPINNED_COOKIE } from '@/components/navigation/sidebar-pin-cookie'
import { JobsShell } from './_components/jobs-shell'

// A server component only so the sidebar's pinned state is read from its cookie
// before the first paint (plan/practice-ui, UI-7). Everything else is the client
// shell in ./_components/jobs-shell.tsx.
export default async function Layout({ children }: { children: React.ReactNode }) {
    const unpinned = (await cookies()).get(SIDEBAR_UNPINNED_COOKIE)?.value === '1'
    return <JobsShell unpinned={unpinned}>{children}</JobsShell>
}
