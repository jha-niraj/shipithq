import SiteHeader from "@/components/site/header"
import SiteFooter from "@/components/site/footer"

/** The site chrome around /incidents, as every public page has (apps/web/CLAUDE.md). */
export default function IncidentsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col bg-neutral-50">
            <SiteHeader />
            {children}
            <SiteFooter />
        </div>
    )
}
