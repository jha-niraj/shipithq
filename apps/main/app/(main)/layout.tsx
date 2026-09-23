import { cookies } from 'next/headers'
import { SIDEBAR_UNPINNED_COOKIE } from '@/components/navigation/sidebar-pin-cookie'
import { MainShell } from './_components/main-shell'

// A server component only so the sidebar's pinned state is read from its cookie
// before the first paint (plan/practice-ui, UI-7). Everything else is the client
// shell in ./_components/main-shell.tsx.
export default async function Layout({ children }: { children: React.ReactNode }) {
    const unpinned = (await cookies()).get(SIDEBAR_UNPINNED_COOKIE)?.value === '1'
    return <MainShell unpinned={unpinned}>{children}</MainShell>
}
