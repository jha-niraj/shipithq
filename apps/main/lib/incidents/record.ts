import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import { db, incidentBadges, incidentProgress } from "@repo/db"
import { INCIDENT_BADGES } from "@/content/incidents/badges"
import { factsFrom, progressRows } from "./stats"
import { getIncidentCase } from "@/content/incidents/cases"
import { INCIDENT_XP } from "@/content/incidents"
import { addXpToUser } from "@/actions/(main)/user/level.action"

/**
 * Saving a reader's progress in an Incidents case, and the XP that comes with it
 * (plan/incidents INC-4; amounts in overview.md, "XP").
 *
 * Correctness is judged HERE, from the case file, never taken from the client. XP
 * follows only an insert that created its row: the unique key (user, case, kind,
 * item) makes a replay, a second tab or a retried request earn nothing.
 */

export type ProgressInput =
    | { slug: string; kind: "fork"; value: string }
    | { slug: string; kind: "prediction"; itemId: string; value: string }
    | { slug: string; kind: "round"; itemId: string; value: string }
    | { slug: string; kind: "tree"; value: string }
    | { slug: string; kind: "checklist"; itemId: string; checked: boolean }
    | { slug: string; kind: "model" | "simulator" }

export type ProgressResult =
    | { success: true; xpEarned: number; levelUps: { level: number; title: string }[]; badges: { key: string; title: string }[] }
    | { success: false; error: string }

type Row = { kind: string; itemId: string; value?: string | null; correct?: boolean | null }

/** Record one change for `userId`. The session is resolved by the action that calls this. */
export async function recordProgressFor(userId: string, input: ProgressInput): Promise<ProgressResult> {
    const c = getIncidentCase(input.slug)
    if (!c) return { success: false, error: "Unknown case." }

    try {
        // Validate against the case and build the row.
        let row: Row
        switch (input.kind) {
            case "fork": {
                const fork = c.story.find((b) => b.kind === "fork")
                if (!fork || fork.kind !== "fork" || !fork.options.some((o) => o.id === input.value)) return { success: false, error: "Unknown option." }
                row = { kind: "fork", itemId: fork.id, value: input.value }
                break
            }
            case "prediction": {
                const q = c.predict.find((x) => x.id === input.itemId)
                if (!q || !q.options.some((o) => o.id === input.value)) return { success: false, error: "Unknown answer." }
                row = { kind: "prediction", itemId: q.id, value: input.value, correct: input.value === q.answer }
                break
            }
            case "round": {
                const r = c.round.find((x) => x.id === input.itemId)
                if (!r || !r.options.some((o) => o.id === input.value)) return { success: false, error: "Unknown answer." }
                row = { kind: "round", itemId: r.id, value: input.value, correct: input.value === r.answer }
                break
            }
            case "tree": {
                if (!c.fix.tree.leaves.some((l) => l.id === input.value)) return { success: false, error: "Unknown leaf." }
                // The latest leaf reached is what the rail shows; it earns nothing.
                await db.insert(incidentProgress)
                    .values({ userId, caseSlug: c.slug, kind: "tree", itemId: "tree", value: input.value })
                    .onConflictDoUpdate({ target: [incidentProgress.userId, incidentProgress.caseSlug, incidentProgress.kind, incidentProgress.itemId], set: { value: input.value } })
                return { success: true, xpEarned: 0, levelUps: [], badges: [] }
            }
            case "checklist": {
                if (!c.checklist.some((i) => i.id === input.itemId)) return { success: false, error: "Unknown item." }
                if (!input.checked) {
                    await db.delete(incidentProgress).where(and(
                        eq(incidentProgress.userId, userId), eq(incidentProgress.caseSlug, c.slug),
                        eq(incidentProgress.kind, "checklist"), eq(incidentProgress.itemId, input.itemId),
                    ))
                    return { success: true, xpEarned: 0, levelUps: [], badges: [] }
                }
                row = { kind: "checklist", itemId: input.itemId }
                break
            }
            case "model":
            case "simulator":
                row = { kind: input.kind, itemId: input.kind }
                break
        }

        const inserted = await insertOnce(userId, c.slug, row)
        let xpEarned = 0
        const levelUps: { level: number; title: string }[] = []
        const award = async (id: string, amount: number, why: string) => {
            const r = await addXpToUser(userId, amount, `Incidents: ${why}`, "EARN")
            if (!r.success) {
                console.error("[incidents] XP award failed:", "error" in r ? r.error : "unknown")
                return
            }
            await db.update(incidentProgress).set({ xpAwarded: amount }).where(eq(incidentProgress.id, id))
            xpEarned += amount
            if ("levelUps" in r && r.levelUps) levelUps.push(...r.levelUps.map((l) => ({ level: l.level, title: l.title })))
        }

        if (inserted && row.kind === "prediction" && row.correct) {
            await award(inserted, INCIDENT_XP.prediction, `${c.title}, a first-try prediction`)
        }

        // A new prediction or round answer may finish the round or the case.
        if (inserted && (row.kind === "prediction" || row.kind === "round")) {
            const answers = await db
                .select({ kind: incidentProgress.kind, itemId: incidentProgress.itemId, correct: incidentProgress.correct })
                .from(incidentProgress)
                .where(and(eq(incidentProgress.userId, userId), eq(incidentProgress.caseSlug, c.slug), inArray(incidentProgress.kind, ["prediction", "round"])))
            const rounds = answers.filter((a) => a.kind === "round")
            const roundDone = c.round.every((r) => rounds.some((a) => a.itemId === r.id))
            const predictionsDone = c.predict.every((q) => answers.some((a) => a.kind === "prediction" && a.itemId === q.id))

            if (row.kind === "round" && roundDone && rounds.every((a) => a.correct)) {
                const id = await insertOnce(userId, c.slug, { kind: "perfect_round", itemId: "round" })
                if (id) await award(id, INCIDENT_XP.perfectRound, `${c.title}, a perfect round`)
            }
            if (roundDone && predictionsDone) {
                const id = await insertOnce(userId, c.slug, { kind: "completion", itemId: "case" })
                if (id) await award(id, INCIDENT_XP.completion, `${c.title}, case complete`)
            }
        }

        const badges = inserted ? await awardBadges(userId) : []
        return { success: true, xpEarned, levelUps, badges }
    } catch (error: unknown) {
        console.error("[incidents] recordIncidentProgress failed:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save that. Try again." }
    }
}

/** Insert the row unless it exists; the new row's id, or null when it already did. */
async function insertOnce(userId: string, caseSlug: string, row: Row): Promise<string | null> {
    const [r] = await db.insert(incidentProgress)
        .values({ userId, caseSlug, kind: row.kind, itemId: row.itemId, value: row.value ?? null, correct: row.correct ?? null })
        .onConflictDoNothing()
        .returning({ id: incidentProgress.id })
    return r?.id ?? null
}

/** Insert every badge the reader has now earned and did not have; the new ones. */
async function awardBadges(userId: string): Promise<{ key: string; title: string }[]> {
    const facts = factsFrom(await progressRows(userId))
    const due = INCIDENT_BADGES.filter((b) => b.earned(facts))
    if (!due.length) return []
    const created = await db.insert(incidentBadges)
        .values(due.map((b) => ({ userId, badgeKey: b.key })))
        .onConflictDoNothing()
        .returning({ key: incidentBadges.badgeKey })
    return created.map((c) => ({ key: c.key, title: INCIDENT_BADGES.find((b) => b.key === c.key)!.title }))
}
