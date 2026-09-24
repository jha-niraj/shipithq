/*
 * Setup (sprint 0) for AI-generated projects (plan/project-repos RP-5): the
 * rules the blueprint prompt carries and the check on what comes back. Pure -
 * no Worker runtime - so both run against the real model outside the worker.
 *
 * The rules mirror the hand-written Setups for the curated projects
 * (packages/db/src/seed/blueprints/setup.ts) and Niraj's decisions of
 * 2026-09-24: npm, Postgres on Neon, Prisma (pinned to 7) or Drizzle, Redis on
 * Upstash. Scaffold commands are named, because a model inventing a flag is the
 * failure that makes a beginner's first ten minutes miserable.
 */

export const SETUP_SHAPE = `"setup": {                             // sprint 0, BEFORE sprint 1
    "name": string,                      // e.g. "Get it running on your machine"
    "goal": string,                      // one sentence: what runs, and what it reaches
    "tasks": [                           // 4-7 steps, in order
      { "title": string, "description": string[], "criteria": string[], "hints": string[], "estimatedTime": string }
    ]
  },`

export const SETUP_RULES = `SETUP (the "setup" object) takes the learner from an empty folder to the app running on THEIR OWN machine, ready for sprint 1:
- Steps, in order: install the tools (with minimum versions: Node.js 22+, Go 1.23+, Python 3.12+ as the stack needs, plus Git); scaffold; accounts and databases; install libraries; ONE proof that everything connects (e.g. a /health route answering {"db":"ok"}); the folder layout the sprints fill in; the first git commit.
- In "description", a line that is a shell command starts with "$ " and holds exactly one command. Wrap file names, keys and code in \`backticks\`.
- Use npm, never pnpm, yarn or bun.
- Scaffold only with these, exactly as written, when the stack uses them:
  $ npx create-next-app@latest <folder> --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm --yes
  $ npm create vite@latest <folder> -- --template react-ts --no-interactive
  $ npx create-expo-app@latest <folder> --template default
  $ go mod init github.com/<you>/<folder>
  A plain Node service: $ npm init -y, then TypeScript with tsx.
- Postgres: a free Neon project (neon.tech), connection string in \`.env\` as DATABASE_URL, placeholder copy in \`.env.example\`. The learner picks Prisma or Drizzle; give both install lines. Prisma is pinned: $ npm install -D prisma@7 dotenv and $ npm install @prisma/client@7 @prisma/adapter-neon@7.
- Redis: a free Upstash database, its rediss:// URL in \`.env\` as REDIS_URL.
- No paid services, no API keys the learner must buy, no Docker unless the stack cannot run without it.
- Criteria are things the learner can see: a command's output, a URL's response. Setup steps are BEGINNER and 10-30 minutes each.
- Sprint 1 starts with the first real feature: nothing in the sprints repeats a Setup step (no "scaffold the app", no "connect the database").`

export interface SetupTaskDraft {
	title: string
	description: string[]
	criteria: string[]
	hints: string[]
	estimatedTime: string
}

export interface SetupDraft {
	name: string
	goal: string
	tasks: SetupTaskDraft[]
}

const MIN_TASKS = 3
const MAX_TASKS = 8

/*
 * Commands a Setup must never tell a beginner to run: a deprecated scaffold,
 * and package managers other than npm (decided 2026-09-24).
 */
const FORBIDDEN = /create-react-app|\bpnpm\b|\byarn\b|\bbun\b/i

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null)
const strs = (v: unknown, maxItems: number, maxLen: number) =>
	Array.isArray(v) ? v.map((x) => str(x, maxLen)).filter((x): x is string => !!x).slice(0, maxItems) : []

/** A usable Setup, or null (the project is then created without one). Checked here, not trusted from the model. */
export function validateSetup(v: unknown): SetupDraft | null {
	if (!v || typeof v !== "object") return null
	const s = v as Record<string, unknown>
	const tasks = (Array.isArray(s.tasks) ? s.tasks : [])
		.map((t): SetupTaskDraft | null => {
			if (!t || typeof t !== "object") return null
			const r = t as Record<string, unknown>
			const title = str(r.title, 140)
			const description = strs(r.description, 16, 600)
			const criteria = strs(r.criteria, 5, 300)
			if (!title || description.length === 0 || criteria.length === 0) return null
			return { title, description, criteria, hints: strs(r.hints, 3, 300), estimatedTime: str(r.estimatedTime, 40) ?? "15 minutes" }
		})
		.filter((t): t is SetupTaskDraft => !!t)
		.slice(0, MAX_TASKS)
	if (tasks.length < MIN_TASKS) return null
	// One bad command poisons the whole Setup: better none (the page falls back
	// to the plain setup list) than a first step that cannot work.
	if (tasks.some((t) => t.description.some((d) => d.startsWith("$ ") && FORBIDDEN.test(d)))) return null
	return { name: str(s.name, 80) ?? "Get it running on your machine", goal: str(s.goal, 300) ?? "The app runs on your machine, ready for sprint 1.", tasks }
}
