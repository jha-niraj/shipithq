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
    /** What it was like before, from the commit that shipped it (plan/web/story ST-13). */
    before: string
    /** What changed: the "now" frame. */
    body: string
    /** Where to find it, in the words a user sees in the app or on this site. */
    where: string
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
        month: "2026-10",
        headline: "Incidents, and a site that shows the product working",
        items: [
            {
                title: "Incidents: four real production failures to play",
                before: "Three cases, with each chapter's story behind a transcript toggle beside the visuals.",
                body: "Four cases, including the bot that searched the whole library, credited to Gaurav Sen. Each chapter reads as an article with its diagrams, and each check sits under its chapter.",
                where: "Incidents, in the app sidebar, or the Incidents page on this site.",
                date: "2026-10-06",
                art: "changelog",
                cta: "See Incidents",
                href: "/incidents",
            },
            {
                title: "Your email code is part of registering",
                before: "Verifying your email was a separate page, and you signed in again after it.",
                body: "The code arrives while you register, and entering it signs you in.",
                where: "Create an account.",
                date: "2026-10-01",
                art: "about",
            },
            {
                title: "The site shows one real thing at a time",
                before: "The landing cycled through four views on a timer, and tours hid the rest behind tabs.",
                body: "One pasted job carried through its rounds on the landing, and each feature page follows one real problem, project, interview, resume or listing, with the app's own labels.",
                where: "The home page, and How it works on each feature page.",
                date: "2026-10-07",
                art: "changelog",
                cta: "See how it works",
                href: "/#how-it-works",
            },
            {
                title: "Prices in both currencies, worked out",
                before: "A switch showed prices in INR or in USD, never both.",
                body: "Every credit pack shows INR and USD with its own checkout for each, and a worked sum shows what the free 100 credits buy.",
                where: "Pricing, on this site.",
                date: "2026-10-07",
                art: "pricing",
                cta: "See pricing",
                href: "/pricing",
            },
        ],
    },
    {
        month: "2026-09",
        headline: "Projects you can actually finish, and a profile worth sharing",
        items: [
            {
                title: "Browse every job with a real search",
                before: "A search you could not share: the filters, the sort and the page were not in the link.",
                body: "A dropdown per filter that applies at once, a sort, numbered pages, all kept in the link, and each job's details in a sheet with the whole role, its rounds and the company.",
                where: "Jobs, then Browse all.",
                date: "2026-09-29",
                art: "jobs",
                cta: "See jobs",
                href: "/features/jobs",
            },
            {
                title: "Check a pasted job before it becomes practice",
                before: "A pasted job went straight to being built, with no step to check what was read from it.",
                body: "Every import is read into a private draft first. You check the title, company, location and posting, then build it public or private.",
                where: "Jobs, then Practise any job.",
                date: "2026-09-28",
                art: "jobs",
            },
            {
                title: "Home, progress reports and badges",
                before: "No badges, and no progress report you could share.",
                body: "Home shows every module's progress with charts, a report page has a share link, and 22 badges are awarded from what you actually complete.",
                where: "Home, Badges, and Settings then Reports.",
                date: "2026-09-28",
                art: "about",
            },
            {
                title: "A project catalogue with blueprints and setup guides",
                before: "No catalogue to browse, and enrolling did not take you to the board.",
                where: "Projects, in the app: the catalogue, then a project's board.",
                date: "2026-09-23",
                art: "projects",
                cta: "Explore projects",
                body: "Pick a project, enrol, and land straight on its sprint board. Each one comes with a blueprint and a numbered setup guide with checks you can tick.",
                href: "/features/projects",
            },
            {
                title: "A calmer sprint board",
                before: "A header and a Blueprint flowchart above the board, and a reload forgot your sprint, task and tab.",
                where: "Any project you are enrolled in.",
                date: "2026-09-23",
                art: "projects",
                body: "The board remembers the sprint, task and tab you were on, and milestones are drawn from the sprints themselves.",
            },
            {
                title: "Make a project yours",
                before: "Everyone enrolled in a public project worked on the same project.",
                where: "Enrol in any public project.",
                date: "2026-09-23",
                art: "projects",
                body: "Public projects are frozen at the moment they are published. Enrolling gives you your own copy to extend.",
            },
            {
                title: "A guided DSA path",
                before: "A flat list of recommended problems that said which ones, but nothing about the order.",
                where: "Practice, then DSA: the Path tab.",
                date: "2026-09-23",
                art: "practice",
                cta: "See practice",
                body: "Practice now walks you through a sequenced path, with a short onboarding at the start of each sub-module.",
                href: "/features/practice",
            },
            {
                title: "A public profile page",
                before: "Your profile could not be read by anyone signed out.",
                where: "Your link at /profile/your-username, and Share on your profile.",
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
                before: "A separate job interview assistant, apart from your Pathfinder goals.",
                where: "Pathfinder, in the app sidebar.",
                date: "2026-08-28",
                art: "changelog",
                body: "The separate job interview assistant is now part of Pathfinder, so goals and preparation live in one place.",
            },
            {
                title: "Resume tools and LinkedIn import",
                before: "The LinkedIn import did not read profiles reliably.",
                where: "AI tools, then Resume: Import.",
                date: "2026-08-25",
                art: "ai",
                cta: "See the AI tools",
                body: "Build a resume with AI and import your details from LinkedIn and GitHub.",
                href: "/features/ai",
            },
            {
                title: "A bottom navigation bar on phones",
                before: "A floating hamburger menu on phones.",
                where: "The bottom of the app on any phone.",
                date: "2026-08-22",
                art: "changelog",
                body: "The app is easier to use on a phone, with a proper bottom navigation instead of a floating menu.",
            },
            {
                title: "Clearer credits and purchases",
                before: "Cancelled and pending payments were not recorded, and purchases sat in one list with spending.",
                where: "Credits, in the app: Usage and Purchases.",
                date: "2026-08-28",
                art: "pricing",
                cta: "See pricing",
                href: "/pricing",
                body: "The credits page separates what you bought from what you spent, and records cancelled and pending payments correctly.",
            },
            {
                title: "Ten honest comparisons",
                before: "No comparison pages on the site.",
                where: "Compare, in this site's navigation.",
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
