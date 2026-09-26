import { eq } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import type { DB } from "./db"
import { schema } from "./db"
import { modelFor } from "@repo/ai"
import { chatJSON } from "./openai"
import { BLUEPRINT_SYSTEM } from "./pipeline-prompt"
import { validateSetup } from "./pipeline-setup"
import { setupForStack } from "@repo/db/project-setup"

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
	setup?: unknown
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

const SYSTEM = BLUEPRINT_SYSTEM

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

	// Normalise stacks to a keyed object stored on the project. Any stack again:
	// code is written on the learner's machine (plan/project-repos RP-1).
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

	const raw = await chatJSON({ apiKey: openaiKey, model: modelFor("projectBlueprint"), system: SYSTEM, user: userPrompt, maxTokens: 8000 })

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
		// Whether the V2 in-browser editor could run it: frontend with no backend.
		runtime: input.generationType === "FRONTEND" && !/\S/.test((stacks.backend ?? "").replace(/^none$/i, "")) ? "browser" : "server",
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

	// Setup, sprint 0 (plan/project-repos RP-5): first by order_index -1. With
	// neither a verified kit nor a valid model Setup, the project is saved
	// without one and the page falls back to the setupGuide list.
	// The verified steps for a stack they were run on (the same ones the curated
	// projects use); otherwise the model's own Setup, validated.
	const setup = setupForStack({
		slug,
		generationType: input.generationType,
		stacks,
		technologies: input.technologies ?? [],
		folders: Array.isArray(blueprint.projectStructure) ? blueprint.projectStructure.filter((f): f is string => typeof f === "string") : [],
	}) ?? validateSetup(blueprint.setup)
	if (setup) {
		const setupId = createId()
		await db.insert(projectV2Sprints).values({
			id: setupId,
			projectId,
			sprintNumber: 0,
			name: setup.name,
			goal: setup.goal,
			duration: "1 day",
			orderIndex: -1,
			createdBy: userId,
			isApproved: true,
		})
		await db.insert(projectV2Tasks).values(
			setup.tasks.map((t, j) => ({
				id: createId(),
				sprintId: setupId,
				title: t.title,
				description: t.description,
				criteria: t.criteria,
				hints: t.hints,
				tags: [],
				difficulty: "BEGINNER" as const,
				orderIndex: j,
				category: "setup",
				estimatedTime: t.estimatedTime,
				checkpoints: [],
				learningObjectives: [],
			})),
		)
		totalTasks += setup.tasks.length
	}

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
