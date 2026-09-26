"use server";

import Exa from "exa-js";
import { openai } from '@/lib/openai-client'
import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import { db, practiceProblem, users } from "@repo/db";
import { eq, and, desc } from "drizzle-orm";
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action";
import { modelFor } from '@repo/ai';

type PracticeModule = 'DSA' | 'SYSTEM_DESIGN' | 'WEB_FRONTEND' | 'WEB_BACKEND'
type PracticeDifficulty = 'EASY' | 'MEDIUM' | 'HARD'

let _exa: Exa | null = null
const exa = new Proxy({} as Exa, {
	get(_, prop) {
		if (!_exa) _exa = new Exa(process.env.EXA_API_KEY!)
		return Reflect.get(_exa, prop)
	}
})

// ─────────────────────────────────────────────
// VALID CATEGORIES PER MODULE
// ─────────────────────────────────────────────

const MODULE_CATEGORIES: Record<PracticeModule, string[]> = {
	DSA: [
		"arrays-and-hashing", "two-pointers", "sliding-window", "stack",
		"binary-search", "linked-list", "trees", "tries",
		"heap-priority-queue", "backtracking", "graphs",
		"dynamic-programming", "greedy", "intervals",
		"math-and-geometry", "bit-manipulation",
	],
	SYSTEM_DESIGN: [
		"fundamentals", "data-intensive", "real-time",
		"social-and-feed", "infrastructure", "e-commerce",
	],
	WEB_FRONTEND: [
		"react-components", "state-management", "api-integration",
		"performance", "css-and-layout",
	],
	WEB_BACKEND: [
		"rest-apis", "authentication", "database",
		"middleware", "error-handling",
	],
};

const DIFFICULTIES: PracticeDifficulty[] = ["EASY", "MEDIUM", "HARD"];

// ─────────────────────────────────────────────
// SHARED PROMPT & PARSING
// ─────────────────────────────────────────────

function buildSystemPrompt(module: PracticeModule): string {
	const validCategories = MODULE_CATEGORIES[module].join(", ");
	const validDifficulties = DIFFICULTIES.join(", ");

	return `You are an expert problem author for a coding practice platform.

Given the information provided, produce a single practice problem as a JSON object.

Rules:
- "title": concise problem title
- "description": detailed problem statement in markdown. Include examples with input/output, constraints, and edge cases.
- "category": MUST be one of [${validCategories}]
- "difficulty": MUST be one of [${validDifficulties}]
- "requirements": array of 3-6 specific, assessable requirements (e.g. "O(n) time complexity", "Handle empty input")
- "hints": array of 2-4 progressive hints (from subtle to more direct)
- "starterCode": a starter code template with function signature and comments
- "tags": array of 2-5 relevant topic tags (lowercase, hyphenated)

Module context: ${module}

Return ONLY a valid JSON object - no markdown fences, no explanation outside the JSON.`;
}

interface GeneratedProblemData {
	title: string;
	description: string;
	category: string;
	difficulty: PracticeDifficulty;
	requirements: string[];
	hints: string[];
	starterCode: string;
	tags: string[];
}

function parseProblemJSON(raw: string, module: PracticeModule): GeneratedProblemData {
	const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
	const data = JSON.parse(cleaned);

	if (!data.title || !data.description || !data.category || !data.difficulty) {
		throw new Error("Missing required fields in generated problem");
	}

	const validCategories = MODULE_CATEGORIES[module];
	if (!validCategories.includes(data.category)) {
		data.category = validCategories[0];
	}

	if (!DIFFICULTIES.includes(data.difficulty)) {
		data.difficulty = "MEDIUM";
	}

	return {
		title: String(data.title),
		description: String(data.description),
		category: String(data.category),
		difficulty: data.difficulty as PracticeDifficulty,
		requirements: Array.isArray(data.requirements) ? data.requirements.map(String) : [],
		hints: Array.isArray(data.hints) ? data.hints.map(String) : [],
		starterCode: data.starterCode ? String(data.starterCode) : "",
		tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
	};
}

// ─────────────────────────────────────────────
// GENERATE FROM URL (Exa + GPT-4o)
// ─────────────────────────────────────────────

/**
 * Admins only.
 *
 * "Add problem" was taken off the practice page (2026-09-22): the catalogue is
 * curated, and a generated problem carries generated tests. The actions behind it
 * stayed exported and callable, each one an uncharged Exa fetch plus a gpt-4o call,
 * and `createUserPracticeProblem` wrote into the catalogue every user reads. A
 * scripted loop was somebody else's bill and everybody's problem list.
 */
async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return { ok: false, error: "Not signed in." }
    const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1)
    if (me?.role !== "Admin") return { ok: false, error: "Adding problems is not available." }
    return { ok: true, userId: session.user.id }
}

export async function generateProblemFromURL(
	url: string,
	module: PracticeModule
): Promise<{
	success: boolean;
	problem?: GeneratedProblemData;
	error?: string;
}> {
	const admin = await requireAdmin()
	if (!admin.ok) return { success: false, error: admin.error }

	try {
		const session = await getSession(await headers());
		if (!session?.user?.id) {
			return { success: false, error: "Unauthorized" };
		}

		const exaResult = await exa.getContents([url], { text: true });

		const pageContent = exaResult.results?.[0]?.text;
		if (!pageContent) {
			return { success: false, error: "Could not extract content from the provided URL" };
		}

		const truncated = pageContent.substring(0, 8000);

		const completion = await openai.chat.completions.create({
			model: modelFor("practiceProblemFromUrl"),
			messages: [
				{ role: "system", content: buildSystemPrompt(module) },
				{
					role: "user",
					content: `Convert the following content from a URL into a structured practice problem.\n\nURL: ${url}\n\nExtracted content:\n${truncated}`,
				},
			],
			temperature: 0.5,
			max_tokens: 2500,
		});

		const content = completion.choices[0]?.message?.content;
		if (!content) {
			return { success: false, error: "Failed to generate problem from AI" };
		}

		const problem = parseProblemJSON(content, module);
		return { success: true, problem };
	} catch (error) {
		console.error("Error generating problem from URL:", error);
		const message = error instanceof Error ? error.message : "Failed to generate problem from URL";
		return { success: false, error: message };
	}
}

// ─────────────────────────────────────────────
// GENERATE FROM NAME (GPT-4o only)
// ─────────────────────────────────────────────

export async function generateProblemFromName(
	name: string,
	module: PracticeModule,
	difficulty?: PracticeDifficulty
): Promise<{
	success: boolean;
	problem?: GeneratedProblemData;
	error?: string;
}> {
	const admin = await requireAdmin()
	if (!admin.ok) return { success: false, error: admin.error }

	try {
		const session = await getSession(await headers());
		if (!session?.user?.id) {
			return { success: false, error: "Unauthorized" };
		}

		const difficultyHint = difficulty ? `\nTarget difficulty: ${difficulty}` : "";

		const completion = await openai.chat.completions.create({
			model: modelFor("practiceProblemFromName"),
			messages: [
				{ role: "system", content: buildSystemPrompt(module) },
				{
					role: "user",
					content: `Create a practice problem based on this name/topic: "${name}"${difficultyHint}`,
				},
			],
			temperature: 0.7,
			max_tokens: 2500,
		});

		const content = completion.choices[0]?.message?.content;
		if (!content) {
			return { success: false, error: "Failed to generate problem from AI" };
		}

		const problem = parseProblemJSON(content, module);
		return { success: true, problem };
	} catch (error) {
		console.error("Error generating problem from name:", error);
		const message = error instanceof Error ? error.message : "Failed to generate problem";
		return { success: false, error: message };
	}
}

// ─────────────────────────────────────────────
// CREATE IN DATABASE
// ─────────────────────────────────────────────

async function generateUniqueProblemSlug(title: string): Promise<string> {
	const baseSlug = title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.substring(0, 80);

	let slug = baseSlug;
	let counter = 0;

	while (true) {
		const [existing] = await db
			.select({ id: practiceProblem.id })
			.from(practiceProblem)
			.where(eq(practiceProblem.slug, slug))
			.limit(1);

		if (!existing) break;

		counter++;
		slug = `${baseSlug}-${counter}`;
	}

	return slug;
}

export async function createUserPracticeProblem(data: {
	title: string;
	description: string;
	module: PracticeModule;
	category: string;
	difficulty: PracticeDifficulty;
	requirements: string[];
	hints: string[];
	starterCode?: string;
	tags: string[];
}): Promise<{
	success: boolean;
	problem?: { id: string; slug: string; title: string };
	/** DSA only: the test-generation job, for the sheet to follow (PD-12). Null if dispatch failed. */
	judgeJobId?: string | null;
	error?: string;
}> {
	const admin = await requireAdmin()
	if (!admin.ok) return { success: false, error: admin.error }

	try {
		const session = await getSession(await headers());
		if (!session?.user?.id) {
			return { success: false, error: "Unauthorized" };
		}

		const validCategories = MODULE_CATEGORIES[data.module];
		if (!validCategories.includes(data.category)) {
			return {
				success: false,
				error: `Invalid category "${data.category}" for module ${data.module}`,
			};
		}

		if (!DIFFICULTIES.includes(data.difficulty)) {
			return {
				success: false,
				error: `Invalid difficulty "${data.difficulty}"`,
			};
		}

		const slug = await generateUniqueProblemSlug(data.title);

		const [maxSortRow] = await db
			.select({ sortOrder: practiceProblem.sortOrder })
			.from(practiceProblem)
			.where(
				and(
					eq(practiceProblem.module, data.module),
					eq(practiceProblem.category, data.category)
				)
			)
			.orderBy(desc(practiceProblem.sortOrder))
			.limit(1);

		const [problem] = await db
			.insert(practiceProblem)
			.values({
				slug,
				title: data.title,
				description: data.description,
				module: data.module,
				category: data.category,
				difficulty: data.difficulty,
				requirements: data.requirements,
				hints: data.hints,
				starterCode: data.starterCode ?? null,
				tags: data.tags,
				sortOrder: (maxSortRow?.sortOrder ?? 0) + 1,
				isActive: true,
			})
			.returning({
				id: practiceProblem.id,
				slug: practiceProblem.slug,
				title: practiceProblem.title,
			});

		// DSA problems get judge assets (signature, harness, tests) from a worker
		// job. A failed dispatch does not fail the save: the problem exists and
		// the sheet offers a retry (plan/practice-dsa PD-12).
		let judgeJobId: string | null = null;
		if (data.module === "DSA" && problem) {
			const job = await startBackgroundJob("practice_tests_generate", { problemId: problem.id }, { cost: 0 });
			judgeJobId = job.success && job.jobId ? job.jobId : null;
		}

		return { success: true, problem, judgeJobId };
	} catch (error) {
		console.error("Error creating practice problem:", error);
		const message = error instanceof Error ? error.message : "Failed to create practice problem";
		return { success: false, error: message };
	}
}
