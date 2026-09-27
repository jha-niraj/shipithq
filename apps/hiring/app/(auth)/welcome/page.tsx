import { redirect } from "next/navigation"
import { OPTION_BUILTINS } from "@repo/db/option-builtins"
import { getMemberDetails } from "@/actions/team/member-details.action"
import { getOptions } from "@/actions/options"
import { WelcomeForm } from "./welcome-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Welcome" }

/** An invited member's first run (plan/hiring-ui HU-14): a few details about them, all skippable. */
export default async function WelcomePage() {
    const details = await getMemberDetails()
    if (!details.success) redirect("/onboarding")
    const options = await getOptions(["member_title"]).catch(() => ({ member_title: [...OPTION_BUILTINS.member_title] }))
    return <WelcomeForm initial={details.data} titles={options.member_title ?? [...OPTION_BUILTINS.member_title]} />
}
