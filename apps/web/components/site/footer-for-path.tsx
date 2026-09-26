"use client"

import { usePathname } from "next/navigation"
import { SiteFooter } from "./footer"
import { audienceFor } from "./audiences"

/**
 * The footer for layouts that serve more than one audience (the blog: hiring guides
 * are for companies, the rest for students). Picks the audience from the path, the
 * same way the navbar does (plan/web/revamp REV-84).
 */
export function FooterForPath() {
    return <SiteFooter audience={audienceFor(usePathname() ?? "/").id} />
}
