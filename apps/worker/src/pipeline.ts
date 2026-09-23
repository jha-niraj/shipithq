import { eq } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import type { DB } from "./db"
import { schema } from "./db"
import { chatJSON } from "./openai"

const { projectsV2, projectV2Sprints, projectV2Tasks, userProjectV2Progress } = schema

export interface GenerationInput {
	projectTitle: string
	projectDescription: string
	generationType: string
	difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
	visibility: "PUBLIC" | "PRIVATE"
	includeAssessment?: boolean
	technologies?: string[]
	stacks?: Record<string, string | undefined> | Array<{ name: string; category: string }>
}

type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

interface Blueprint {
	overview: string
	vision?: string
	targetAudience?: string
	problemSolution?: string
	estimatedDuration?: string
	estimatedHours?: number
	keyOutcomes?: string[]
	recruiterSignal?: string
	features?: unknown
	technicalRequirements?: unknown
	dataArchitecture?: unknown
	projectStructure?: unknown
	setupGuide?: unknown
	sprints?: Array<{
		name: string
		goal: string
		duration?: string
		tasks?: Array<{
			title: string
			description?: string[]
			criteria?: string[]
			hints?: string[]
			tags?: string[]
			category?: string
			estimatedTime?: string
			learningObjectives?: string[]
			checkpoints?: string[]
		}>
	}>
}

function slugify(input: string): string {
	const base = input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 60)
	return `${base || "project"}-${createId().slice(0, 6)}`
}

const SYSTEM = `You are ShipItHQ's senior engineering mentor. You design realistic, portfolio-grade software project blueprints that teach by building.
Return ONLY valid JSON (no markdown) matching exactly this shape:
{
  "overview": string,                    // 2-4 sentence blueprint overview
  "vision": string,
  "targetAudience": string,
  "problemSolution": string,
  "estimatedDuration": string,           // e.g. "3-4 weeks"
  "estimatedHours": number,              // integer total hours
  "keyOutcomes": string[],               // 3-6 outcomes
  "recruiterSignal": string,             // why this impresses recruiters
  "features": string[],                  // 5-10 core features
  "technicalRequirements": string[],
  "projectStructure": string[],          // key folders/modules
  "setupGuide": string[],                // ordered setup steps
  "sprints": [                           // 3-6 sprints, ordered
    {
      "name": string,
      "goal": string,
      "duration": string,                // e.g. "4-5 days"
      "tasks": [                         // 3-6 tasks per sprint
        {
          "title": string,
          "description": string[],       // 2-4 concrete steps
          "criteria": string[],          // acceptance criteria
          "hints": string[],
          "tags": string[],
          "category": string,
          "estimatedTime": string,       // e.g. "2-3 hours"
          "learningObjectives": string[],
          "checkpoints": string[]
        }
      ]
    }
  ]
}`

export interface GenerationResult {
	projectId: string
	slug: string
	title: string
}

export async function runGeneration(
	db: DB,
	openaiKey: string,
	input: GenerationInput,
	userId: string,
	onProgress: (progress: number, phase: string) => Promise<void>,
): Promise<GenerationResult> {
	const difficulty: Difficulty = input.difficulty ?? "INTERMEDIATE"

	// Normalise stacks to a keyed object stored on the project.
	const stacks = Array.isArray(input.stacks)
		? input.stacks.reduce<Record<string, string>>((acc, s) => { acc[s.category.toLowerCase()] = s.name; return acc }, {})
		: (input.stacks ?? {})
	const stackSummary = Object.entries(stacks).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ") || "your choice"

	await onProgress(15, "Designing the project blueprint")

	const userPrompt = `Design a ${difficulty.toLowerCase()} ${input.generationType} project.
Title: ${input.projectTitle}
Description: ${input.projectDescription}
Tech stack: ${stackSummary}
Extra technologies: ${(input.technologies ?? []).join(", ") || "none"}
Make it buildable, sprint-based, and portfolio-worthy. Return the JSON blueprint only.`

	const raw = await chatJSON({ apiKey: openaiKey, system: SYSTEM, user: userPrompt, maxTokens: 8000 })

	let blueprint: Blueprint
	try {
		blueprint = JSON.parse(raw) as Blueprint
	} catch {
		throw new Error("Blueprint generation returned invalid JSON")
	}
	if (!blueprint.overview || !Array.isArray(blueprint.sprints) || blueprint.sprints.length === 0) {
		throw new Error("Blueprint is missing an overview or sprints")
	}

	await onProgress(55, "Saving your project")

	const projectId = createId()
	const slug = slugify(input.projectTitle)
	const estimatedHours = Math.max(1, Math.round(blueprint.estimatedHours ?? 20))

	await db.insert(projectsV2).values({
		id: projectId,
		slug,
		title: input.projectTitle,
		description: input.projectDescription,
		technologies: input.technologies ?? [],
		generationType: input.generationType,
		difficulty,
		visibility: input.visibility,
		estimatedHours,
		includeAssessment: input.includeAssessment ?? false,
		projectSource: "AI_GENERATED",
		blueprintOverview: blueprint.overview,
		vision: blueprint.vision ?? null,
		targetAudience: blueprint.targetAudience ?? null,
		problemSolution: blueprint.problemSolution ?? null,
		estimatedDuration: blueprint.estimatedDuration ?? null,
		keyOutcomes: blueprint.keyOutcomes ?? [],
		recruiterSignal: blueprint.recruiterSignal ?? null,
		features: (blueprint.features ?? null) as unknown,
		technicalRequirements: (blueprint.technicalRequirements ?? null) as unknown,
		dataArchitecture: (blueprint.dataArchitecture ?? null) as unknown,
		projectStructure: (blueprint.projectStructure ?? null) as unknown,
		setupGuide: (blueprint.setupGuide ?? null) as unknown,
		stacks: stacks as unknown,
		assistantEcho: blueprint as unknown,
		assistantRaw: { raw } as unknown,
		createdBy: userId,
	})

	await onProgress(80, "Creating sprints & tasks")

	let totalTasks = 0
	for (let i = 0; i < blueprint.sprints.length; i++) {
		const s = blueprint.sprints[i]!
		const sprintId = createId()
		await db.insert(projectV2Sprints).values({
			id: sprintId,
			projectId,
			sprintNumber: i + 1,
			name: s.name,
			goal: s.goal,
			duration: s.duration ?? "3-5 days",
			orderIndex: i,
			createdBy: userId,
			isApproved: true,
		})

		const tasks = s.tasks ?? []
		if (tasks.length) {
			await db.insert(projectV2Tasks).values(
				tasks.map((t, j) => ({
					id: createId(),
					sprintId,
					title: t.title,
					description: t.description ?? [],
					criteria: t.criteria ?? [],
					hints: t.hints ?? [],
					tags: t.tags ?? [],
					difficulty,
					orderIndex: j,
					category: t.category ?? null,
					estimatedTime: t.estimatedTime ?? null,
					checkpoints: t.checkpoints ?? [],
					learningObjectives: t.learningObjectives ?? [],
				})),
			)
			totalTasks += tasks.length
		}
	}

	// Generated public = published at birth (plan/projects PJ-18). Written
	// AFTER the sprints and tasks: non-owners see rows created at or before
	// `published_at`, so stamping it on the project insert above would hide
	// everything inserted a few milliseconds later.
	if (input.visibility === "PUBLIC") {
		await db.update(projectsV2).set({ publishedAt: new Date() }).where(eq(projectsV2.id, projectId))
	}

	// Seed the creator's progress row.
	await db.insert(userProjectV2Progress).values({
		id: createId(),
		userId,
		projectId,
		status: "NOT_STARTED",
		totalTasks,
	})

	// No credit work here, deliberately.
	//
	// This used to debit the balance directly: `credits = credits - cost`, with
	// no guard, minutes after the app checked the balance at dispatch. Anything
	// the user spent in between - a mock interview, a quiz - and the subtraction
	// drove them negative, with a ledger row to match. The dispatch in
	// `projectsworker.action.ts` now holds the credits through
	// `startBackgroundJob({ cost })`, which reserves them under a SQL guard and
	// settles or refunds when the app sees a terminal status. Every credit
	// decision in the product lives in `lib/credits/hold.ts`.

	await onProgress(95, "Finalizing")
	return { projectId, slug, title: input.projectTitle }
}
