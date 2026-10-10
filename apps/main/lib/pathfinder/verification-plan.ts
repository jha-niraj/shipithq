// ─────────────────────────────────────────────────────────────────────────────
// The verification plan as the browser may see it, and quiz grading.
//
// `generatedPlan` holds every quiz answer. Anything a
// page or a server action returns goes through `withoutAnswers` first: a server
// action is callable from any page, so stripping at the page is not enough
// (plan/pathfinder PF-16).
// ─────────────────────────────────────────────────────────────────────────────

/** A quiz question as the worker stores it. Older plans may have no `id`. */
export interface PlanQuizQuestion {
    id?: string
    question: string
    options: string[]
    correctAnswer: number
    explanation?: string
    difficulty?: string
    category?: string
    codeSnippet?: string | null
}

/** What the page gets: no answer, no explanation, and always an id. */
export type ClientQuizQuestion = Omit<PlanQuizQuestion, 'id' | 'correctAnswer' | 'explanation'> & { id: string }

/** One graded question. The answer and explanation are only filled in on a pass. */
export interface QuizReviewItem {
    questionId: string
    correct: boolean
    selectedAnswer: number | null
    correctAnswer?: number
    explanation?: string
}

/** The id the page and the grader agree on: the stored id, or the position. */
export const quizQuestionId = (q: { id?: string }, index: number) => q.id || `q${index}`

function planQuestions(plan: unknown): PlanQuizQuestion[] {
    const qs = (plan as { quizQuestions?: unknown } | null)?.quizQuestions
    return Array.isArray(qs) ? (qs as PlanQuizQuestion[]) : []
}

/**
 * The plan with quiz answers and explanations removed, and without the old
 * AI-written coding questions (they carried their solutions). Coding is the
 * judged Practice problems in `codingProblemIds` (PF-17).
 */
export function stripPlan(plan: unknown): unknown {
    if (!plan || typeof plan !== 'object') return plan
    const { codingQuestions: _c, ...p } = plan as Record<string, unknown>
    return {
        ...p,
        quizQuestions: planQuestions(plan).map((q, i): ClientQuizQuestion => {
            const { correctAnswer: _a, explanation: _e, ...rest } = q
            return { ...rest, id: quizQuestionId(q, i) }
        }),
    }
}

/**
 * The Practice problems that verify this goal's coding. `null` for a plan made
 * before PF-17, which still has AI-written questions and needs the backfill
 * (`pnpm script pathfinder-coding-problems`); `[]` when no problem fits the goal.
 */
export function codingProblemIdsOf(plan: unknown): string[] | null {
    const ids = (plan as { codingProblemIds?: unknown } | null)?.codingProblemIds
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : null
}

/** Whether the goal has a coding section at all. Older plans keep theirs. */
export function codingRequired(plan: unknown): boolean {
    const ids = codingProblemIdsOf(plan)
    return ids === null || ids.length > 0
}

/** A verification row (or null) with its plan stripped. */
export function withoutAnswers<V extends { generatedPlan: unknown } | null | undefined>(v: V): V {
    if (!v) return v
    return { ...v, generatedPlan: stripPlan(v.generatedPlan) }
}

/**
 * Grade submitted choices against the stored plan. The denominator is the
 * plan's question count, so an unanswered question counts as wrong. Unknown or
 * repeated question ids are ignored (the first one counts).
 */
export function gradeQuiz(
    plan: unknown,
    answers: { questionId: string; selectedAnswer: number }[],
    opts: { reveal: boolean },
): { correctCount: number; total: number; score: number; review: QuizReviewItem[] } {
    const questions = planQuestions(plan)
    const chosen = new Map<string, number>()
    for (const a of answers) {
        if (!chosen.has(a.questionId) && Number.isInteger(a.selectedAnswer)) chosen.set(a.questionId, a.selectedAnswer)
    }
    const review = questions.map((q, i): QuizReviewItem => {
        const questionId = quizQuestionId(q, i)
        const selected = chosen.get(questionId) ?? null
        return {
            questionId,
            correct: selected !== null && selected === q.correctAnswer,
            selectedAnswer: selected,
            ...(opts.reveal ? { correctAnswer: q.correctAnswer, explanation: q.explanation } : {}),
        }
    })
    const correctCount = review.filter((r) => r.correct).length
    const total = questions.length
    return { correctCount, total, score: total ? Math.round((correctCount / total) * 100) : 0, review }
}
