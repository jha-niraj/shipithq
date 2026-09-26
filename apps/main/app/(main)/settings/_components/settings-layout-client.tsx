'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Plug, ShieldOff, ChevronRight } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'

// "Auth & Security" was removed. It rendered one card saying "More security options coming
// soon. For now, manage your password and connected accounts from the Account settings" -
// a tab whose only content was a pointer at another tab. /settings/auth now redirects there.
const navItems = [
    { id: 'account', label: 'Account', href: '/settings/account', icon: User },
    { id: 'integrations', label: 'Integrations', href: '/settings/integrations', icon: Plug },
    { id: 'privacy', label: 'Privacy', href: '/settings/privacy', icon: ShieldOff },
]

export function SettingsLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Left navigation */}
            <aside className="w-full lg:w-64 flex-shrink-0">
                <nav
                    className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide"
                    aria-label="Settings navigation"
                >
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {item.label}
                                <ChevronRight className="w-4 h-4 ml-auto lg:hidden" />
                            </Link>
                        )
                    })}
                </nav>
            </aside>
            {/* Right content */}
            <main className="flex-1 min-w-0">{children}</main>
        </div>
    )
}
