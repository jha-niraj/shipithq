import { and, eq, desc } from "drizzle-orm"
import {
    db, moduleOnboarding, practiceLearnerProfile, practiceUserSession,
    type LearnerConcept, type LearnerMistake, type OnboardingProfile, type PracticeStage,
} from "@repo/db"

// ─────────────────────────────────────────────────────────────────────────────
// Everything the mentor reads before a turn (PD-6): the session row with its
// problem, the slice of the learner profile that matters for this problem, and
// the user's DSA onboarding profile. Scoped to the user in every query.
// ─────────────────────────────────────────────────────────────────────────────

export async function loadMentorContext(userId: string, sessionId: string) {
    const session = await db.query.practiceUserSession.findFirst({
        where: and(eq(practiceUserSession.id, sessionId), eq(practiceUserSession.userId, userId)),
        columns: { id: true, stage: true, status: true, mode: true, module: true, mentorState: true, language: true },
        with: {
            problem: {
                columns: {
                    slug: true, title: true, difficulty: true, description: true, requirements: true,
                    functionSignature: true, judgeTests: true, tags: true, category: true, module: true,
                },
            },
        },
    })
    if (!session) return null

    const [profile, onboarding] = await Promise.all([
        db.query.practiceLearnerProfile.findFirst({
            where: and(eq(practiceLearnerProfile.userId, userId), eq(practiceLearnerProfile.module, session.module)),
        }),
        db.query.moduleOnboarding.findFirst({
            where: and(
                eq(moduleOnboarding.userId, userId),
                eq(moduleOnboarding.moduleKey, "practice:dsa"),
                eq(moduleOnboarding.status, "completed"),
            ),
            orderBy: [desc(moduleOnboarding.version)],
            columns: { profile: true },
        }),
    ])

    // Concepts that match this problem's tags or category, plus anything shaky
    // wherever it came from: a shaky concept is worth revisiting on any problem.
    const keys = new Set([...session.problem.tags, session.problem.category].map((k) => k.toLowerCase()))
    const concepts: LearnerConcept[] = (profile?.concepts ?? []).filter(
        (c) => c.status === "shaky" || keys.has(c.slug) || [...keys].some((k) => c.slug.includes(k) || k.includes(c.slug)),
    )
    const mistakes: LearnerMistake[] = [...(profile?.mistakes ?? [])].sort((a, b) => b.count - a.count).slice(0, 5)

    const stage: PracticeStage = session.status === "COMPLETED" ? "done" : session.stage
    return {
        session,
        stage,
        concepts,
        mistakes,
        onboarding: (onboarding?.profile ?? null) as OnboardingProfile | null,
    }
}
