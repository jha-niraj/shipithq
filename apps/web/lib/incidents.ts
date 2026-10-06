// Server-only: imported by server components; it reads the database (apps/web/CLAUDE.md).
import { unstable_cache } from "next/cache"
import type { Dashboard, IncidentTimeline, Sequence, SystemMap } from "@repo/ui/lib/incidents/types"

/**
 * The Incidents story page's data (plan/web/story ST-6): the live cases, and the parts of the
 * 30-second demo case that the page draws, read from `incident_case` and `incident_step`
 * (which `pnpm script incidents-seed` writes from the app's case files). Read-only, cached for
 * an hour. Null when the database is unreachable: the page then shows no case data rather
 * than invented data.
 */

export const STORY_CASE = "the-demo-that-died-at-30-seconds"

export type CaseCard = {
    slug: string
    title: string
    summary: string
    minutes: number
    steps: number
    checks: number
    xp: number
    system?: SystemMap
    credit?: { name: string }
}

type Question = { id: string; kind: string; prompt: string; options?: { id: string; label: string }[]; answer?: string | boolean | string[]; explanation: string }

export type StoryCase = {
    title: string
    summary: string
    minutes: number
    system: SystemMap
    clock?: IncidentTimeline
    board?: Dashboard
    lifecycle?: Sequence
    /** The first chapter's first single-choice check. */
    check?: Question
    /** The midway talks' openings, in order. */
    talks: string[]
    /** The closing talk: how it opens and what it probes. */
    mock?: { opening: string; probe: string[] }
}

type Block = { kind: string; id?: string; timeline?: IncidentTimeline; dashboard?: Dashboard; sequence?: Sequence }

type StoryData = { cases: CaseCard[]; story: StoryCase | null }

/**
 * Failures are NOT cached: the cached function throws, and `getIncidentStory` turns that into
 * null for this request only. Caching a null once blanked the page's case sections for an hour
 * after one render without a database (found in dev, 2026-10-06).
 */
export async function getIncidentStory(): Promise<StoryData | null> {
    // Same guard as lib/landing-numbers.ts: no DATABASE_URL, no crash.
    if (!process.env.DATABASE_URL) return null
    try {
        return await loadIncidentStory()
    } catch (error: unknown) {
        console.error("Incident story data failed:", error)
        return null
    }
}

const loadIncidentStory = unstable_cache(
    async (): Promise<StoryData> => {
        {
            const { db, incidentCases, incidentSteps } = await import("@repo/db")
            const { asc, eq } = await import("drizzle-orm")
            const rows = await db.select().from(incidentCases).where(eq(incidentCases.status, "LIVE")).orderBy(asc(incidentCases.publishedAt))
            const steps = await db.select({ caseId: incidentSteps.caseId, kind: incidentSteps.kind, key: incidentSteps.key, xp: incidentSteps.xp, content: incidentSteps.content, ordinal: incidentSteps.ordinal })
                .from(incidentSteps).orderBy(asc(incidentSteps.ordinal))

            const cases: CaseCard[] = rows.map((c) => {
                const mine = steps.filter((s) => s.caseId === c.id)
                const meta = c.meta as { system?: SystemMap; credit?: { name: string } }
                return {
                    slug: c.slug, title: c.title, summary: c.summary, minutes: c.minutes,
                    steps: mine.length,
                    checks: mine.filter((s) => s.kind === "check" || s.kind === "final-quiz").length,
                    xp: mine.reduce((n, s) => n + (s.xp ?? 0), 0),
                    system: meta.system, credit: meta.credit,
                }
            })

            const row = rows.find((c) => c.slug === STORY_CASE)
            const system = (row?.meta as { system?: SystemMap } | undefined)?.system
            if (!row || !system) return { cases, story: null }
            const mine = steps.filter((s) => s.caseId === row.id)
            const chapter = (id: string) => mine.find((s) => s.kind === "chapter" && (s.content as { id?: string }).id === id)?.content as { blocks?: Block[] } | undefined
            const block = (ch: string, id: string) => chapter(ch)?.blocks?.find((b) => b.id === id)
            const firstCheck = mine.find((s) => s.kind === "check")?.content as { questions?: Question[] } | undefined
            const closing = mine.find((s) => s.kind === "closing-talk")?.content as { opening?: string; probe?: string[] } | undefined

            return {
                cases,
                story: {
                    title: row.title, summary: row.summary, minutes: row.minutes, system,
                    clock: block("incident", "clock")?.timeline,
                    board: block("incident", "board")?.dashboard,
                    lifecycle: block("request-life", "lifecycle")?.sequence,
                    check: firstCheck?.questions?.find((q) => q.kind === "single"),
                    talks: mine.filter((s) => s.kind === "talk").map((s) => String((s.content as { opening?: string }).opening ?? "")).filter(Boolean),
                    mock: closing?.opening ? { opening: closing.opening, probe: closing.probe ?? [] } : undefined,
                },
            }
        }
    },
    ["incident-story-v2"],
    { revalidate: 3600 },
)
