import Link from "next/link"
import { Logo } from "@repo/ui/components/logo"
import { ThemeToggle } from "@repo/ui/components/themetoggle"

// The header on the hiring app's few public pages (help, privacy, terms,
// contact). The marketing navbar moved to the website with the landing page
// (plan/hiring-app HA-3); these pages only need a way home and a way in.
export function PublicHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-page">
                <Link href="/signin" className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                        <Logo className="h-[18px] w-[18px]" />
                    </span>
                    <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">ShipItHQ Hiring</span>
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Link
                        href="/signin"
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </header>
    )
}
