import type { Metadata } from "next"
import { pageMeta } from "@/lib/seo"
import { UniLanding } from "./_components/uni-landing"

// shipithq.com/uni - ShipItHQ for universities (plan/web/revamp REV-31). The product
// is the university app (UNI_URL, lib/site.ts); every CTA here is a plain link to it.
export const metadata: Metadata = pageMeta({
    title: "Placement readiness for universities",
    description: "Assign projects, voice mock interviews and code assessments to every class, and see each department's placement readiness in one place. ShipItHQ for universities.",
    path: "/uni",
})

export const revalidate = 3600

export default function UniPage() {
    return <UniLanding />
}
