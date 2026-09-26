import { redirect } from "next/navigation"
import { WEB_URL } from "@repo/ui/components/auth/auth-form"

// University pricing lives on the website, read from UNI_PLANS in @repo/pricing, the
// same object this app's checkout uses (plan/web/revamp REV-30, REV-32). The three
// hardcoded price sets this page used to show are retired.
export default function PricingRedirect() {
    redirect(`${WEB_URL}/uni/pricing`)
}
