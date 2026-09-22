import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ImportClient } from "./_components/import-client"
import { getMyProfileLinks } from "@/actions/(main)/user/profile-links.action"

export const metadata = {
    title: "AI Profile Import | Resume Builder",
    description: "Let AI build your resume from LinkedIn, GitHub, and more in seconds.",
}

export default async function ImportPage() {
    const session = await getSession(headers())
    if (!session?.user?.id) redirect("/signin")

    // Read on the server so the fields are filled on first paint.
    const links = await getMyProfileLinks()

    return (
        <div className="w-full px-page py-6">
            <ImportClient links={links} />
        </div>
    )
}
