import { eq } from "drizzle-orm"
import type { RunnableJobType } from "../env"
import { schema, withTransaction } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"

const { projectsV2, projectV2Quizzes, projectV2QuizQuestions } = schema

/**
 * Project quiz generation, moved off
 * `projectv2-quiz.action.ts:generateProjectQuiz`.
 *
 * Twenty multiple-choice questions with options and explanations, on
 * `gpt-4-turbo-preview`. Routinely the better part of a minute - the single
 * longest completion in the projects module.
 *
 * The prompt, model, temperature and the 20-question validation are VERBATIM
 * from the inline version. What is NOT here is the credit debit: credits are
 * reserved by the app before dispatch and settled or released when it observes
 * the terminal job status, so every credit decision in the product stays in
 * `lib/credits/hold.ts`.
 */

interface QuizInput {
	projectId: string
}

interface QuizQuestion {
	difficulty: "EASY" | "MEDIUM" | "HARD"
	prompt: string
	options: string[]
	correctAnswer: number
	explanation: string
}

export class ProjectQuiz extends JobDurableObject<QuizInput> {
	protected readonly jobType: RunnableJobType = "project_quiz"
	protected override get initialPhaseLabel() {
		return "Reading the project"
	}

	protected async run(job: StoredJob<QuizInput>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()

		const project = await db.query.projectsV2.findFirst({
			where: eq(projectsV2.id, job.input.projectId),
			with: { quiz: true },
		})
		if (!project) throw new Error("Project not found")
		if (!project.includeAssessment) throw new Error("This project does not include assessments")
		// Re-checked here, not just at dispatch: two tabs can both pass the app's
		// check before either job runs, and a project may only have one quiz.
		//
		// THROWN, not returned. Returning a result completes the job, and a
		// completed job settles the 25-credit hold the app took at dispatch - so
		// the loser of that race paid 25 credits for a quiz that already existed
		// and that they had already paid for once. A failed job releases the hold.
		if (project.quiz) throw new Error("This project already has a quiz.")

		const stacks = project.stacks as Record<string, string | undefined> | null

		const prompt = `You are an expert technical interviewer. Generate 20 multiple-choice quiz questions for a coding project with the following details:

Project Title: ${project.title}
Description: ${project.description}
Technologies: ${project.technologies.join(", ")}
Tech Stack:
- Frontend: ${stacks?.frontend || "N/A"}
- Backend: ${stacks?.backend || "N/A"}
- Database: ${stacks?.database || "N/A"}

Create questions that test understanding of:
1. Core Learns and best practices
2. Technology-specific knowledge
3. Implementation patterns
4. Problem-solving approaches

Distribute the questions as follows:
- 7 EASY questions (fundamental Learns)
- 8 MEDIUM questions (practical application)
- 5 HARD questions (advanced topics and edge cases)

For each question, provide:
- difficulty: "EASY", "MEDIUM", or "HARD"
- prompt: The question text
- options: Exactly 4 answer options (array of strings)
- correctAnswer: Index of the correct option (0-3)
- explanation: Brief explanation of the correct answer (1-2 sentences)

Return ONLY a valid JSON array with 20 questions following this exact structure:
[
  {
    "difficulty": "EASY",
    "prompt": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation of why this is correct."
  }
]`

		await progress(25, "Writing the questions")

		const content = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: "gpt-4-turbo-preview",
			system:
				"You are an expert technical interviewer who creates high-quality quiz questions. Always return valid JSON arrays.",
			user: prompt,
			temperature: 0.7,
		})

		await progress(80, "Checking the questions")

		let questions: QuizQuestion[]
		try {
			const parsed = JSON.parse(content) as QuizQuestion[] | { questions?: QuizQuestion[] }
			questions = Array.isArray(parsed) ? parsed : (parsed.questions ?? [])
		} catch {
			throw new Error("Invalid response format from AI")
		}

		if (!Array.isArray(questions) || questions.length !== 20) {
			throw new Error(`Expected 20 questions, got ${questions?.length || 0}`)
		}
		for (const q of questions) {
			if (!q.difficulty || !["EASY", "MEDIUM", "HARD"].includes(q.difficulty)) {
				throw new Error("Invalid question difficulty")
			}
			if (!q.prompt || !Array.isArray(q.options) || q.options.length !== 4) {
				throw new Error("Invalid question structure")
			}
			if (typeof q.correctAnswer !== "number" || q.correctAnswer < 0 || q.correctAnswer > 3) {
				throw new Error("Invalid correct answer index")
			}
		}

		await progress(90, "Saving the quiz")

		// One transaction: a quiz row without its questions is a quiz page that
		// renders zero questions and can never be regenerated, because the
		// existence check above would find it.
		const quizId = await withTransaction(this.env.DATABASE_URL, async (tx) => {
			const [quiz] = await tx
				.insert(projectV2Quizzes)
				.values({ projectId: project.id, totalQuestions: questions.length })
				.returning()

			await tx.insert(projectV2QuizQuestions).values(
				questions.map((q, index) => ({
					quizId: quiz!.id,
					orderIndex: index,
					difficulty: q.difficulty,
					prompt: q.prompt,
					options: q.options,
					correctAnswer: q.correctAnswer,
					explanation: q.explanation,
				})),
			)

			return quiz!.id
		})

		return { quizId, alreadyExisted: false }
	}
}
