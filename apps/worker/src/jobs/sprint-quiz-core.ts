/*
 * A sprint quiz's prompt and the check on what the model returns
 * (plan/project-workspace WS-12). Pure - no Worker runtime - so both run
 * against the real model outside the Durable Object.
 *
 * The quiz tests the sprint the learner just finished: the decisions its tasks
 * asked for, and the learner's own notes on what they built. It is not a
 * textbook quiz on the stack.
 */

export const SPRINT_QUIZ_QUESTIONS = 10

export interface QuizTaskInput {
	id: string
	/** "Sprint 2" - set when the quiz covers the whole project. */
	sprint?: string
	title: string
	brief: string
	criteria: string[]
	/** What the learner wrote when they marked it done (plan/project-repos RP-6). */
	note: string | null
}

export interface SprintQuizQuestionDraft {
	prompt: string
	options: string[]
	correctAnswer: number
	explanation: string
	taskId: string | null
}

export const SPRINT_QUIZ_SYSTEM = `You write the end-of-sprint quiz for a learner who just finished a sprint of a real project on ShipItHQ, building it on their own machine.

Return JSON only: {"questions": [Question, ...]} with exactly ${SPRINT_QUIZ_QUESTIONS} questions.
Question = {"prompt": string, "options": [string, string, string, string], "correctAnswer": 0-3, "explanation": string, "taskId": string | null}

What to ask:
- About THIS sprint: why a task asks for what it asks, what goes wrong without it, the edge cases its "done when" list names, and the trade-off behind a choice.
- Use the learner's notes: at least 3 questions build on what a learner wrote they did or decided (e.g. "You stored amounts as integer cents. Which bug does that prevent?"). Never quote a note that is not in the input.
- Mix: about 3 easy (what and why), 5 medium (applying it to a new case), 2 hard (an edge case or a failure mode).
- No trivia about library versions or syntax, no questions answerable without having thought about the project.
- When the scope is THE WHOLE PROJECT (the final quiz), spread the questions across the sprints and include at least 3 about how a decision in one sprint shaped a later one.

Rules:
- Exactly 4 options, exactly one correct, the other three plausible to someone who skimmed. Options of similar length; never "all of the above".
- Spread the correct answer's position across 0-3.
- "explanation" is 1-2 sentences saying why the right answer is right.
- "taskId" is the id of the task the question is about, from the input, or null.`

export function sprintQuizUserPrompt(p: {
	projectTitle: string
	stack: string
	/** "Sprint 1: <name>\nGoal: <goal>", or "THE WHOLE PROJECT (final quiz)". */
	scope: string
	tasks: QuizTaskInput[]
}): string {
	const tasks = p.tasks
		.map((t, i) =>
			`${t.sprint ? `${t.sprint}, task` : "Task"} ${i + 1} (id: ${t.id}): ${t.title}\n  Brief: ${t.brief.slice(0, 900)}\n  Done when: ${t.criteria.join("; ").slice(0, 600)}\n  Learner's note: ${t.note?.trim() ? t.note.trim().slice(0, 500) : "(none)"}`)
		.join("\n\n")
	return `Project: ${p.projectTitle}\nStack: ${p.stack}\n\nScope: ${p.scope}\n\n${tasks}`
}

function shuffle<T>(items: T[], random: () => number): T[] {
	const a = [...items]
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1))
		;[a[i], a[j]] = [a[j]!, a[i]!]
	}
	return a
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null)

/**
 * The questions, or null when the reply cannot be used as a quiz. A few bad
 * questions are dropped; fewer than 8 good ones fails the job (and the hold is
 * released) rather than selling a short quiz.
 */
export function validateSprintQuiz(raw: unknown, taskIds: string[], random: () => number = Math.random): SprintQuizQuestionDraft[] | null {
	const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? (raw as { questions?: unknown }).questions : null
	if (!Array.isArray(list)) return null
	const ids = new Set(taskIds)
	const out: SprintQuizQuestionDraft[] = []
	for (const q of list) {
		if (!q || typeof q !== "object") continue
		const r = q as Record<string, unknown>
		const prompt = str(r.prompt, 600)
		const options = Array.isArray(r.options) ? r.options.map((o) => str(o, 300)) : []
		const correct = Number(r.correctAnswer)
		const explanation = str(r.explanation, 600)
		if (!prompt || options.length !== 4 || options.some((o) => !o) || !Number.isInteger(correct) || correct < 0 || correct > 3 || !explanation) continue
		if (new Set(options.map((o) => o!.toLowerCase())).size !== 4) continue
		const taskId = typeof r.taskId === "string" && ids.has(r.taskId) ? r.taskId : null
		// Shuffled here: models park the right answer in the same slot far too often.
		const order = shuffle([0, 1, 2, 3], random)
		out.push({ prompt, options: order.map((i) => options[i] as string), correctAnswer: order.indexOf(correct), explanation, taskId })
	}
	return out.length >= 8 ? out.slice(0, SPRINT_QUIZ_QUESTIONS) : null
}
