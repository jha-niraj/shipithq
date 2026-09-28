import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SettingsLayoutClient } from './_components/settings-layout-client'

export const metadata = {
    title: 'Settings | ShipItHQ',
    description: 'Manage your account, integrations, and preferences',
}

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession(headers())

    if (!session?.user) {
        redirect('/signin')
    }

    return (
        // Desktop: the frame is the page's height; the title and the left nav stay put and
        // only the right side scrolls (Niraj, 2026-09-28). Phones scroll as one page.
        // `h-screen` is the page height inside the app shell (globals.css, `[data-app-page]`).
        <div className="min-h-screen lg:h-screen lg:min-h-0">
            <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-6 lg:pb-0 lg:h-full lg:flex lg:flex-col">
                <div className="mb-8 shrink-0">
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your account and preferences
                    </p>
                </div>
                <SettingsLayoutClient>{children}</SettingsLayoutClient>
            </div>
        </div>
    )
}
