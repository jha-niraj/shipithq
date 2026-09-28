"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "@repo/ui/components/ui/sonner"
import { takeUnseenBadges } from "@/actions/(main)/badges/badges.action"

/**
 * "Badge earned" toasts (plan/badges BDG-8). Badges are awarded wherever the work is
 * recorded (a server action, a worker job), so the shell asks on arrival and on each
 * navigation for any not yet shown, and toasts each once. The Inbox note is written when
 * the badge is awarded.
 */
export function BadgeToaster() {
    const pathname = usePathname()
    const router = useRouter()
    const busy = useRef(false)

    useEffect(() => {
        if (busy.current) return
        busy.current = true
        takeUnseenBadges()
            .then((list) => {
                for (const b of list) {
                    toast.success(`Badge earned: ${b.title}`, {
                        description: b.description,
                        action: { label: "See badges", onClick: () => router.push("/badges") },
                    })
                }
            })
            .catch(() => { /* a missed toast; the badge and its Inbox note are there */ })
            .finally(() => { busy.current = false })
    }, [pathname, router])

    return null
}
