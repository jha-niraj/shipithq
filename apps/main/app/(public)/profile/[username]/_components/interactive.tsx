"use client"

/**
 * The only client pieces of the public one-pager (plan/profile PRF-12). Everything
 * else renders on the server, so a link-preview bot and a slow phone get the whole
 * page in the first response.
 */

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, Link2, UserPlus, UserCheck } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"
import { trackProfileView } from "@/actions/(main)/user/profile.action"
import { toggleFollow } from "@/actions/(main)/social/follow.action"

/** Counts one view per mount. The action reads the viewer from the session and skips the owner. */
export function ViewTracker({ profileId }: { profileId: string | null }) {
    useEffect(() => {
        if (profileId) void trackProfileView(profileId, "DIRECT")
    }, [profileId])
    return null
}

/**
 * Follow, for a signed-in visitor. A signed-out visitor gets a link to sign in that
 * brings them back here, rather than a button that fails.
 */
export function FollowButton({
    userId, username, signedIn, initialFollowing, revealOnFollow = false,
}: {
    userId: string
    username: string
    signedIn: boolean
    initialFollowing: boolean
    /** On the followers-only view: following unlocks the page, so reload to fetch it. */
    revealOnFollow?: boolean
}) {
    const [following, setFollowing] = useState(initialFollowing)
    const [busy, setBusy] = useState(false)

    if (!signedIn) {
        return (
            <Button asChild size="sm" variant="outline" >
                <Link href={`/signin?callbackUrl=${encodeURIComponent(`/profile/${username}`)}`}>
                    <UserPlus className="mr-1.5 size-3.5" /> Follow
                </Link>
            </Button>
        )
    }

    const toggle = async () => {
        if (busy) return
        setBusy(true)
        try {
            const res = await toggleFollow(userId)
            if (!res.success) {
                toast.error(res.error || "Could not update follow")
                return
            }
            if ("isPending" in res && res.isPending) {
                toast.success("Follow request sent")
                return
            }
            setFollowing(res.isFollowing ?? !following)
            if (res.isFollowing && revealOnFollow) window.location.reload()
        } catch (error: unknown) {
            console.error("Follow failed:", error)
            toast.error("Could not update follow")
        } finally {
            setBusy(false)
        }
    }

    return (
        <Button size="sm" variant={following ? "outline" : "default"} className="min-w-24 cursor-pointer" onClick={toggle} disabled={busy}>
            {busy ? <InlineLoader size="sm" /> : following
                ? <><UserCheck className="mr-1.5 size-3.5" /> Following</>
                : <><UserPlus className="mr-1.5 size-3.5" /> Follow</>}
        </Button>
    )
}

/** Copies the canonical URL (from `lib/urls.ts`, passed in), never `window.location`. */
export function CopyLinkButton({ url }: { url: string }) {
    const [copied, setCopied] = useState(false)
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
        } catch {
            toast.error("Could not copy the link")
        }
    }
    return (
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={copy}>
            {copied ? <Check className="mr-1.5 size-3.5" /> : <Link2 className="mr-1.5 size-3.5" />}
            {copied ? "Copied" : "Copy link"}
        </Button>
    )
}

/**
 * An image that removes itself when it fails to load, uncovering what is under it
 * (initials). Users' `image` column still holds old hotlinked defaults that 404, and
 * a server component cannot attach `onError`.
 */
export function FallbackImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    const ref = useRef<HTMLImageElement>(null)
    const [failed, setFailed] = useState(false)
    // The server-rendered <img> can fail before React hydrates and attaches onError,
    // so the event is missed. A loaded-but-empty image after mount is the same failure.
    useEffect(() => {
        const img = ref.current
        if (img && img.complete && img.naturalWidth === 0) setFailed(true)
    }, [])
    if (failed || !props.src) return null
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} ref={ref} onError={() => setFailed(true)} />
}
