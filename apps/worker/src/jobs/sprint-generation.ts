import { eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { JobDurableObject, type ProgressFn, type StoredJob } from "./base"

const { projectsV2 } = schema

/**
 * Sprint generation, moved off `sprint-generation.action.ts:generateSprintWithAI`.
 *
 * A single completion, but a multi-thousand-token one: a whole sprint with three
 * to six fully specified tasks. Well past the inline budget on Workers.
 *
 * The prompt, model and temperature below are VERBATIM from the inline version.
 * A migration that also changes the prompt cannot be verified, because there is
 * no way to tell a migration bug from a prompt change.
 *
 * Nothing is written to the project here. The generated sprint is returned as
 * the job result and stays a preview until the user accepts it, at which point
 * the app calls `addSprintToProject` - exactly as before.
 */

interface SprintGenerationInput {
	projectId: string
	sprintDescription: string
}

interface GeneratedTask {
	title: string
	description: string[]
	successCriteria: string[]
	hints: string[]
	estimatedMinutes: number
	difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
	category: string | null
	estimatedTime: string | null
	checkpoints: string[]
	relatedPages: string[]
	dependencies: string[]
	badges: string[]
	tags: string[]
	terminalCommand: string | null
	orderIndex: number
}

interface GeneratedSprint {
	name: string
	goal: string
	duration: string
	tasks: GeneratedTask[]
}

export class SprintGeneration extends JobDurableObject<SprintGenerationInput> {
	protected readonly jobType: RunnableJobType = "sprint_generation"
	protected override get initialPhaseLabel() {
		return "Reading the project"
	}

	protected async run(job: StoredJob<SprintGenerationInput>, progress: ProgressFn): Promise<unknown> {
		const db = this.db()

		const project = await db.query.projectsV2.findFirst({
			where: eq(projectsV2.id, job.input.projectId),
			with: {
				sprints: {
					orderBy: (sprints, { asc }) => [asc(sprints.orderIndex)],
					with: { tasks: true },
				},
			},
		})
		if (!project) throw new Error("Project not found")

		const existingSprintsContext = project.sprints.map((s) => ({
			name: s.name,
			goal: s.goal,
			tasksCount: s.tasks.length,
		}))
		const nextSprintNumber = project.sprints.length + 1

		await progress(30, "Designing the sprint")

		const systemPrompt = `You are an expert software development coach helping create project sprints with detailed tasks.

Given a sprint description, generate a comprehensive sprint structure with 3-6 actionable tasks.

Project Context:
- Title: ${project.title}
- Description: ${project.shortDescription || "Not specified"}
- Technologies: ${project.technologies?.join(", ") || "Not specified"}
- Tech Stack: ${JSON.stringify(project.stacks || {})}
- Existing Sprints: ${existingSprintsContext.length > 0 ? JSON.stringify(existingSprintsContext) : "None yet"}

Generate a sprint that:
1. Has a clear, actionable name
2. Has a specific goal that describes what will be accomplished
3. Has a realistic duration (e.g., "1-2 days", "3-4 hours", "1 week")
4. Contains 3-6 well-structured tasks

Each task should have:
- Clear, descriptive title
- Step-by-step description (3-7 steps)
- Measurable success criteria (2-4 items)
- Helpful hints for learners (2-3 hints)
- Appropriate difficulty (BEGINNER, INTERMEDIATE, ADVANCED)
- Category (e.g., "setup", "frontend", "backend", "database", "api", "testing", "deployment")
- Estimated time (e.g., "30 mins", "1 hour", "2-3 hours")
- Checkpoints to verify progress (2-4 items)
- Related pages/routes if applicable
- Task dependencies (reference to other task titles if needed)
- Relevant badges/achievements
- Tags for categorization
- Terminal command if applicable (for setup/build tasks)

Respond with valid JSON only, no markdown or explanation.`

		const userPrompt = `Generate Sprint #${nextSprintNumber}: "${job.input.sprintDescription}"

Return a JSON object with this exact structure:
{
  "name": "Sprint Name",
  "goal": "What this sprint accomplishes",
  "duration": "Estimated time",
  "tasks": [
    {
      "title": "Task Title",
      "description": ["Step 1", "Step 2", "Step 3"],
      "successCriteria": ["Criterion 1", "Criterion 2"],
      "hints": ["Hint 1", "Hint 2"],
      "estimatedMinutes": 60,
      "difficulty": "BEGINNER",
      "category": "frontend",
      "estimatedTime": "1 hour",
      "checkpoints": ["Checkpoint 1", "Checkpoint 2"],
      "relatedPages": ["/dashboard", "/profile"],
      "dependencies": [],
      "badges": ["UI Master"],
      "tags": ["react", "components"],
      "terminalCommand": null,
      "orderIndex": 0
    }
  ]
}`

		const raw = await chatJSON({
			apiKey: this.env.OPENAI_API_KEY,
			model: modelFor("sprintGeneration"),
			system: systemPrompt,
			user: userPrompt,
			temperature: 0.7,
			maxTokens: 3000,
		})

		await progress(85, "Structuring the tasks")

		let sprint: GeneratedSprint
		try {
			sprint = JSON.parse(raw) as GeneratedSprint
		} catch {
			throw new Error("Sprint generation returned invalid JSON")
		}
		if (!sprint?.name || !Array.isArray(sprint.tasks)) {
			throw new Error("Sprint generation returned an unusable sprint")
		}

		sprint.tasks = sprint.tasks.map((task, idx) => ({ ...task, orderIndex: idx }))

		return { sprint }
	}
}
