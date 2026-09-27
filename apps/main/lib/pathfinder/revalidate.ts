import "server-only"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db, pathfinderGoals } from "@repo/db"

/**
 * Refresh a goal's pages after a write (plan/pathfinder PF-2). Goal pages live at
 * `/pathfinder/<slug>`, never at the id, so every write that knows only the id
 * looks the slug up here instead of revalidating a path that does not exist.
 */
export async function revalidateGoal(goalId: string, opts: { verify?: boolean } = {}) {
    revalidatePath("/pathfinder")
    const goal = await db.query.pathfinderGoals.findFirst({ where: eq(pathfinderGoals.id, goalId), columns: { slug: true } })
    if (!goal) return
    revalidatePath(`/pathfinder/${goal.slug}`)
    if (opts.verify) revalidatePath(`/pathfinder/${goal.slug}/verify`)
}
