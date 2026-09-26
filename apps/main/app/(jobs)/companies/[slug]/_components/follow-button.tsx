"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Plus } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { followCompany, unfollowCompany } from "@/actions/companies"

/** Follow a company: its new roles show in Following. */
export function FollowButton({ companyId, companySlug, initial, signedIn }: { companyId: string; companySlug: string; initial: boolean; signedIn: boolean }) {
    const [following, setFollowing] = useState(initial)
    const [busy, setBusy] = useState(false)
    if (!signedIn) {
        return <Button asChild size="sm" variant="outline" className="gap-1.5"><Link href={`/signin?callbackUrl=${encodeURIComponent(`/companies/${companySlug}`)}`}><Plus className="h-4 w-4" /> Follow</Link></Button>
    }
    const toggle = async () => {
        setBusy(true)
        const r = following ? await unfollowCompany(companyId) : await followCompany(companyId)
        setBusy(false)
        if (!r.success) { toast.error(r.error ?? "Try again"); return }
        setFollowing(!following)
    }
    return (
        <Button size="sm" variant={following ? "secondary" : "outline"} onClick={() => void toggle()} disabled={busy} className="gap-1.5" aria-pressed={following}>
            {busy ? <InlineLoader size="sm" /> : following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {following ? "Following" : "Follow"}
        </Button>
    )
}
