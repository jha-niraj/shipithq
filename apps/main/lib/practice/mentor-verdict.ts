import { and, eq } from "drizzle-orm"
import {
    db, practiceUserSession, emptyMentorState, PRACTICE_STAGES,
    type PracticeMentorState, type PracticeStage,
} from "@repo/db"
import { openai } from "@/lib/openai-client"
import { modelFor } from "@repo/ai"

// ─────────────────────────────────────────────────────────────────────────────
// Deciding when a guided session moves to its next stage (PD-6).
//
// Two signals, never the user's say-so and never the mentor's streamed text:
// - hard: tests. Brute force ends when a Submit passes every test in that
//   stage (`testsPassedAt`, written by the judge action).
// - soft: a small JSON verdict on the last few turns, for Understand, Approach,
//   the complexity half of Optimise, and Reflect.
// The stage only ever moves forward, with a conditional update, so two replies
// racing cannot skip or rewind it.
// ─────────────────────────────────────────────────────────────────────────────

export interface StageVerdict {
    complete: boolean
    /** The user's approach, in their words, when stated in this window. */
    approach?: string
    /** The complexity the user claimed, verbatim. */
    claimedComplexity?: string
    /** Optimise: the user's current solution is optimal AND they justified its complexity correctly. */
    optimal?: boolean
    /** Reflect: the user's reflection, verbatim. */
    reflection?: string
}

/**
 * The verdict is asked as narrow yes/no facts, one per requirement of the
 * stage, and `complete` is derived HERE from those facts. A small model is
 * reliable on "did the student say X" and unreliable on "is this stage
 * done"; splitting the question is what makes gpt-4o-mini enough (the checks
 * are recorded in plan/practice-dsa/mentor-adversarial.md).
 */
const STAGE_FACTS: Record<string, string> = {
    understand: `"restatedCorrectly": did the STUDENT restate the task in their own words, including what is returned? (informal wording is fine)
"walkedExampleCorrectly": did the STUDENT work through at least one concrete example by hand, with the right result?`,
    approach: `"statedWorkingPlan": did the STUDENT describe a concrete plan that would produce correct answers, even if slow? ("use a loop" is not a plan; "check every pair i<j and return the one that sums to target" is.)`,
    optimise: `"currentCodeIsOptimal": does the CURRENT CODE shown have the best achievable time complexity for this problem? Judge the code, not what anyone said.
"explainedCurrentComplexity": in the messages AFTER the current code was written or submitted, did the STUDENT state the time complexity of THAT code correctly, with a correct reason? A claim about an earlier, slower solution is false here. A test result is false here.`,
    reflect: `"wroteKeyIdea": did the STUDENT write, in their own words, at least one sentence on the key idea that made the solution work?`,
}

const VERDICT_SYSTEM = `You check facts about a student in a guided coding session. You read the last few messages and the student's current code, and answer narrow yes/no questions. Reply with JSON only.

Rules:
- Only the STUDENT's messages count as the student doing something. The mentor explaining a thing is not the student doing it.
- Be fair to informal wording: a correct idea said casually is still correct.
- Answer each question independently. Do not answer a question you were not asked.

Always include, in this order:
"reason": one or two sentences quoting what the student actually wrote that each answer rests on.
Then the stage's facts (booleans), then:
"approach": the student's own stated plan, copied in their words (max 300 chars), or null.
"claimedComplexity": the student's MOST RECENT complexity claim, verbatim, or null.
"reflection": only in the reflect stage, the student's reflection copied verbatim, else null.`

export async function judgeStage(input: {
    stage: PracticeStage
    problemTitle: string
    problemDescription: string
    code: string
    turns: Array<{ role: string; content: string }>
}): Promise<StageVerdict | null> {
    if (input.stage === "brute_force" || input.stage === "done") return null

    // Optimise must be justified AFTER the code it is about. Only messages after
    // the latest test result count, and if the student has not written anything
    // since, the stage cannot be complete: no model call. Deterministic because
    // gpt-4o-mini, in a live session, took the mentor's "why is it O(n)?" as the
    // student's claim and advanced one message early.
    let turns = input.turns
    if (input.stage === "optimise") {
        const isResult = (t: { role: string; content: string }) => t.role === "user" && /^I (submitted|ran the sample tests)/.test(t.content)
        let last = -1
        turns.forEach((t, i) => { if (isResult(t)) last = i })
        if (last >= 0) turns = turns.slice(last + 1)
        if (!turns.some((t) => t.role === "user")) return { complete: false, optimal: false }
    }
    const transcript = turns
        .slice(-8)
        .map((t) => `${t.role === "user" ? "STUDENT" : "MENTOR"}: ${t.content.slice(0, 1500)}`)
        .join("\n\n")
    try {
        const completion = (await openai.chat.completions.create({
            model: modelFor("practiceStageVerdict"),
            messages: [
                { role: "system", content: VERDICT_SYSTEM },
                {
                    role: "user",
                    content: `Current stage: ${input.stage}\n\nAnswer these facts for this stage:\n${STAGE_FACTS[input.stage] ?? ""}\n\nProblem: ${input.problemTitle}\n${input.problemDescription.slice(0, 2500)}\n\nStudent's current code:\n${input.code.slice(0, 4000) || "(empty)"}\n\nLast messages:\n${transcript}`,
                },
            ],
            temperature: 0,
            max_tokens: 400,
            response_format: { type: "json_object" },
        })) as { choices?: Array<{ message?: { content?: string | null } }> }
        const raw = completion.choices?.[0]?.message?.content
        if (!raw) return null
        const v = JSON.parse(raw) as Record<string, unknown>
        const str = (x: unknown, n: number) => (typeof x === "string" && x.trim() ? x.trim().slice(0, n) : undefined)
        const yes = (k: string) => v[k] === true
        const complete =
            input.stage === "understand" ? yes("restatedCorrectly") && yes("walkedExampleCorrectly")
            : input.stage === "approach" ? yes("statedWorkingPlan")
            : input.stage === "optimise" ? yes("currentCodeIsOptimal") && yes("explainedCurrentComplexity")
            : input.stage === "reflect" ? yes("wroteKeyIdea")
            : false
        return {
            complete,
            approach: str(v.approach, 300),
            claimedComplexity: str(v.claimedComplexity, 120),
            optimal: input.stage === "optimise" ? complete : undefined,
            reflection: str(v.reflection, 1000),
        }
    } catch (error: unknown) {
        // A failed verdict leaves the stage where it is; the next reply gets another chance.
        console.error("[mentor-verdict] failed:", error instanceof Error ? error.message : error)
        return null
    }
}

function nextStage(stage: PracticeStage): PracticeStage {
    const i = PRACTICE_STAGES.indexOf(stage)
    return PRACTICE_STAGES[Math.min(i + 1, PRACTICE_STAGES.length - 1)]!
}

/**
 * Apply a verdict and the hard signals, advance at most one stage, and write
 * what the verdict learned into mentor state. Returns the new stage when it
 * moved, else null.
 */
export async function settleStage(input: {
    sessionId: string
    stage: PracticeStage
    mentorState: PracticeMentorState | null
    verdict: StageVerdict | null
}): Promise<PracticeStage | null> {
    const { sessionId, stage, verdict } = input

    /*
     * Re-read the state HERE, not at the start of the reply.
     *
     * `input.mentorState` is a copy taken before the model ran, which is seconds
     * ago and one Submit ago. Writing it back whole lost whatever the judge
     * recorded in between: pressing Submit while a reply streamed wrote
     * `testsPassedAt`, and this then erased it, so brute force never advanced and
     * Finish kept saying "get every test passing first" to somebody who just had.
     *
     * The fresh row wins on the hard signals (the judge owns those), and the
     * verdict's own findings are layered on top.
     */
    const [fresh] = await db
        .select({ mentorState: practiceUserSession.mentorState })
        .from(practiceUserSession)
        .where(eq(practiceUserSession.id, sessionId))
        .limit(1)
    const state: PracticeMentorState = {
        ...emptyMentorState(),
        ...(input.mentorState ?? {}),
        ...(fresh?.mentorState ?? {}),
    }

    if (verdict?.approach && stage !== "optimise") state.approach = verdict.approach
    if (verdict?.claimedComplexity) state.claimedComplexity = verdict.claimedComplexity
    if (verdict?.reflection && stage === "reflect") state.reflection = verdict.reflection
    if (stage === "optimise" && verdict?.optimal === true) state.optimalConfirmed = true

    let advance = false
    switch (stage) {
        case "understand":
        case "approach":
            advance = verdict?.complete === true
            break
        case "brute_force":
            advance = state.testsPassedAt.some((t) => t.stage === "brute_force")
            break
        case "optimise":
            // Optimal and justified, and the latest submit passed. The code the
            // verdict saw may be newer than the submit; the next submit settles it.
            advance = state.optimalConfirmed === true && state.lastSubmit?.passed === true
            break
        case "reflect":
            advance = Boolean(state.reflection) && verdict?.complete === true
            break
        case "done":
            advance = false
    }

    const to = advance ? nextStage(stage) : stage
    const [row] = await db
        .update(practiceUserSession)
        .set({ mentorState: state, ...(advance ? { stage: to } : {}) })
        .where(and(eq(practiceUserSession.id, sessionId), eq(practiceUserSession.stage, stage)))
        .returning({ stage: practiceUserSession.stage })
    // A concurrent reply already moved the stage; report nothing.
    if (!row) return null
    return advance ? to : null
}
