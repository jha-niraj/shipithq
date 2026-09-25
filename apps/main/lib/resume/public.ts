import "server-only"

/**
 * A public resume at `/r/<slug>` (plan/resume RES-24).
 *
 * Server-only, not a server action: the old reader (`getResumeDraftBySlug`) was an
 * exported action that also bumped `view_count`, which made it a public endpoint
 * anyone could POST to in a loop, and the page called it twice (metadata and body),
 * so every real view counted double.
 */
import { cache } from "react"
import { db, resumeDraft } from "@repo/db"
import { and, eq, sql } from "drizzle-orm"

/** One query per request, shared by `generateMetadata` and the page. Private drafts are not found. */
export const loadPublicResume = cache(async (slug: string) => {
    return db.query.resumeDraft.findFirst({
        where: and(eq(resumeDraft.shareSlug, slug), eq(resumeDraft.isPublic, true)),
        columns: { id: true, userId: true, content: true, templateSlug: true, name: true },
        with: { user: { columns: { name: true, username: true, image: true } } },
    })
})

/** Counts a view once per page render, and never the owner's own. */
export async function countResumeView(draft: { id: string; userId: string }, viewerId: string | null) {
    if (viewerId === draft.userId) return
    try {
        await db.update(resumeDraft)
            .set({ viewCount: sql`${resumeDraft.viewCount} + 1` })
            .where(eq(resumeDraft.id, draft.id))
    } catch (error: unknown) {
        // A missed view count must never break the page someone was sent.
        console.error("[resume] view count failed:", error)
    }
}
