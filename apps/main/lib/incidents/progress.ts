import "server-only"
import { and, eq } from "drizzle-orm"
import { db, incidentProgress } from "@repo/db"
import type { Progress } from "@/components/incidents/case-progress"

/**
 * A reader's saved progress in one case (plan/incidents INC-4), shaped as the
 * client's `Progress`. Rows are written by `recordIncidentProgress`.
 */
export async function loadIncidentProgress(userId: string, slug: string): Promise<Progress> {
    const rows = await db
        .select({ kind: incidentProgress.kind, itemId: incidentProgress.itemId, value: incidentProgress.value })
        .from(incidentProgress)
        .where(and(eq(incidentProgress.userId, userId), eq(incidentProgress.caseSlug, slug)))

    const p: Progress = { fork: null, modelSeen: false, simulatorPlayed: false, predictions: {}, treeLeaf: null, checklist: [], round: {} }
    for (const r of rows) {
        if (r.kind === "fork") p.fork = r.value
        else if (r.kind === "model") p.modelSeen = true
        else if (r.kind === "simulator") p.simulatorPlayed = true
        else if (r.kind === "prediction" && r.value) p.predictions[r.itemId] = r.value
        else if (r.kind === "round" && r.value) p.round[r.itemId] = r.value
        else if (r.kind === "tree") p.treeLeaf = r.value
        else if (r.kind === "checklist") p.checklist.push(r.itemId)
    }
    return p
}
