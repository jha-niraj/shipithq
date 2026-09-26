/**
 * What's new, one entry per month, newest first (plan/web/revamp REV-50). The navbar
 * pill ("New in September") and /changelog both read from here, so adding an entry
 * is the only edit a release needs.
 *
 * Only what has shipped: every item here is in a commit on main (git log is the
 * source). Say what changed for the user, not how it was built.
 */
import type { ArtKind } from "@/components/marketing/card-art"

export interface ChangelogItem {
    title: string
    body: string
    /** The day it shipped (its commit date), "2026-09-23". */
    date: string
    /** The scene on the card. */
    art: ArtKind
    /** Where the card's button goes, and what it says. Omit both for no button. */
    href?: string
    cta?: string
}

export interface ChangelogEntry {
    /** "2026-09" */
    month: string
    headline: string
    items: ChangelogItem[]
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        month: "2026-09",
        headline: "Projects you can actually finish, and a profile worth sharing",
        items: [
            {
                title: "A project catalogue with blueprints and setup guides",
                date: "2026-09-23",
                art: "projects",
                cta: "Explore projects",
                body: "Pick a project, enrol, and land straight on its sprint board. Each one comes with a blueprint and a numbered setup guide with checks you can tick.",
                href: "/features/projects",
            },
            {
                title: "A calmer sprint board",
                date: "2026-09-23",
                art: "projects",
                body: "The board remembers the sprint, task and tab you were on, and milestones are drawn from the sprints themselves.",
            },
            {
                title: "Make a project yours",
                date: "2026-09-23",
                art: "projects",
                body: "Public projects are frozen at the moment they are published. Enrolling gives you your own copy to extend.",
            },
            {
                title: "A guided DSA path",
                date: "2026-09-23",
                art: "practice",
                cta: "See practice",
                body: "Practice now walks you through a sequenced path, with a short onboarding at the start of each sub-module.",
                href: "/features/practice",
            },
            {
                title: "A public profile page",
                date: "2026-09-25",
                art: "about",
                body: "A one-page profile at your own link, readable by anyone you share it with, with privacy settings that are enforced and a QR code to share it.",
            },
        ],
    },
    {
        month: "2026-08",
        headline: "Pathfinder, resume tools, and a phone-friendly app",
        items: [
            {
                title: "Interview preparation folded into Pathfinder",
                date: "2026-08-28",
                art: "changelog",
                body: "The separate job interview assistant is now part of Pathfinder, so goals and preparation live in one place.",
            },
            {
                title: "Resume tools and LinkedIn import",
                date: "2026-08-25",
                art: "ai",
                cta: "See the AI tools",
                body: "Build a resume with AI and import your details from LinkedIn and GitHub.",
                href: "/features/ai",
            },
            {
                title: "A bottom navigation bar on phones",
                date: "2026-08-22",
                art: "changelog",
                body: "The app is easier to use on a phone, with a proper bottom navigation instead of a floating menu.",
            },
            {
                title: "Clearer credits and purchases",
                date: "2026-08-28",
                art: "pricing",
                cta: "See pricing",
                href: "/pricing",
                body: "The credits page separates what you bought from what you spent, and records cancelled and pending payments correctly.",
            },
            {
                title: "Ten honest comparisons",
                date: "2026-08-21",
                art: "compare",
                cta: "Read the comparisons",
                body: "How ShipItHQ compares with LeetCode, a bootcamp, ChatGPT, a CS degree and more, with what each alternative is good at first.",
                href: "/compare",
            },
        ],
    },
]

export const LATEST = CHANGELOG[0] ?? null

/** "2026-09" -> "September" (and the year, when asked). */
export function monthName(month: string, withYear = false): string {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, 1))
    return d.toLocaleDateString("en-GB", { month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" })
}
