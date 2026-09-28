import "server-only"
import { db } from "@repo/db"
import { recordActivity, activityKey } from "@repo/db/activity"

/**
 * One ledger entry for a new resume draft (plan/progress PRG-3), however it was
 * made: from scratch, from the profile, a copy, a base for tailoring, or a tailored
 * version. Keyed by the draft, so it can only ever be recorded once.
 */
export async function recordResumeCreated(
    userId: string,
    draft: { id: string; name: string },
    how: "new" | "profile" | "import" | "copy" | "base" | "tailored",
    meta: Record<string, unknown> = {},
): Promise<void> {
    const description = {
        new: "Resume - started from a template",
        profile: "Resume - built from your profile",
        import: "Resume - imported",
        copy: "Resume - a copy",
        base: "Resume - your base resume",
        tailored: "Resume - tailored to a job",
    }[how]
    await recordActivity(db, userId, {
        type: "RESUME_CREATED",
        title: `Created resume: ${draft.name}`,
        description,
        xp: 0,
        key: activityKey.resumeCreated(draft.id),
        meta: { draftId: draft.id, how, ...meta },
    })
}
