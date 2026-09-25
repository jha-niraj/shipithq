import { PublicHeader } from "@/components/public-header"

// Help, public. The marketing navbar and footer moved to the website with the
// landing page (plan/hiring-app HA-3).
export default function HomeLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col">
            <PublicHeader />
            <main className="flex-1 pt-6">{children}</main>
        </div>
    )
}
