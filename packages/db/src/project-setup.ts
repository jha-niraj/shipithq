/** One Setup step; the same shape as a seed task (packages/db/src/seed/blueprints/types.ts). */
export interface SetupTask {
    title: string
    description: string[]
    criteria: string[]
    hints: string[]
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    estimatedTime: string
    category: string
}

export interface SetupSprint {
    name: string
    goal: string
    duration: string
    tasks: SetupTask[]
}

/**
 * The verified Setup steps (sprint 0), shared by the curated projects
 * (seed/blueprints/setup.ts) and generated ones (apps/worker pipeline, RP-5).
 *
 * Sprint 0 - Setup, for each curated project (plan/project-repos RP-3, RP-4).
 *
 * Learners build on their own machine in V1, so every project starts with the
 * steps from an empty folder to the app running: tools, scaffold, database,
 * one proof that everything connects, the folder layout, the first commit.
 *
 * Decided by Niraj, 2026-09-24 (plan/project-repos overview, Decisions): npm,
 * Postgres on Neon, Prisma OR Drizzle (the learner picks), Redis on Upstash,
 * ClickHouse locally through clickhousectl. Every command here was run on a
 * clean folder on 2026-09-24 (the RP-4 report lists what ran where):
 * create-next-app 16.3, Vite 8 with TypeScript 6, Prisma 7.10, drizzle-orm
 * 0.45, Express 5, ioredis 6, Go 1.27 with go-redis 9 and clickhouse-go 2,
 * ClickHouse 26.10, Expo SDK 57.
 *
 * Text conventions the Task tab renders: a line starting with "$ " is a
 * command, `backticks` are inline code.
 */

export const step = (t: Omit<SetupTask, "difficulty" | "category">): SetupTask => ({ ...t, difficulty: "BEGINNER", category: "setup" })

// ─── Tools ───────────────────────────────────────────────────────────────────

export function installTools(extra: { go?: boolean; expoGo?: boolean; node?: boolean } = {}): SetupTask {
    const node = extra.node !== false
    return step({
        title: extra.go ? "Install Go, Git and an editor" : "Install Node.js, Git and an editor",
        description: [
            [
                node ? "Install Node.js 22 or newer from nodejs.org (the LTS build); npm comes with it." : null,
                extra.go ? "Install Go 1.23 or newer from go.dev/dl." : null,
                "Install Git, and use an editor you are comfortable debugging in - VS Code is a safe default.",
            ].filter(Boolean).join(" "),
            extra.expoGo
                ? "On your phone, install Expo Go from the App Store or Google Play: it runs the app you build without a developer account or a simulator."
                : "",
            "Everything in this project runs on your own machine, so this is the one step that differs by operating system. On Windows, use the official installers and run the commands in PowerShell or the VS Code terminal.",
        ].filter(Boolean),
        criteria: [
            node ? "`node -v` prints v22 or higher, and `npm -v` prints a version" : null,
            extra.go ? "`go version` prints go1.23 or higher" : null,
            "`git --version` prints a version",
        ].filter((c): c is string => !!c),
        hints: ["If a version still looks old after installing, close and reopen the terminal: it read your PATH when it started."],
        estimatedTime: "15 minutes",
    })
}

// ─── Next.js + Postgres on Neon ──────────────────────────────────────────────

export function nextApp(slug: string): SetupTask {
    return step({
        title: "Create the Next.js app",
        description: [
            "From the folder you keep projects in:",
            `$ npx create-next-app@latest ${slug} --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm --yes`,
            `$ cd ${slug}`,
            "$ npm run dev",
            "That makes a TypeScript app with the App Router, Tailwind and ESLint under `src/`, installs it, and makes the first git commit. TypeScript is already in strict mode; leave it that way, the later tasks lean on the compiler.",
        ],
        criteria: [
            "http://localhost:3000 shows the Next.js starter page while `npm run dev` runs",
            "`git log` shows the first commit",
        ],
        hints: ["The flags answer every question the installer would otherwise ask, so it runs without prompts."],
        estimatedTime: "10 minutes",
    })
}

export function neonDatabase(slug: string, extraEnv = ""): SetupTask {
    return step({
        title: "Create your database on Neon",
        description: [
            `Sign up at neon.tech (the free plan is enough), create a project called ${slug}, and copy its connection string from the Connect button on the dashboard.`,
            "Give this project a database of its own. The migrations you run later create and drop tables, and a migration tool pointed at a database that holds anything else will offer to drop it.",
            `In the project folder, create \`.env\` with \`DATABASE_URL="<your connection string>"\`${extraEnv}, and \`.env.example\` with the same keys and placeholder values. The example belongs in git and the real one never does.`,
        ],
        criteria: [
            "`.env` holds DATABASE_URL, and `git status` does not list `.env`",
            "`.env.example` is committed with placeholder values, not your password",
        ],
        hints: [
            "The `.gitignore` create-next-app writes ignores every file starting with `.env` - including the example. Add a line `!.env.example` to it.",
        ],
        estimatedTime: "10 minutes",
    })
}

export const ORM_DRIZZLE = [
    "Drizzle:",
    "$ npm install drizzle-orm @neondatabase/serverless",
    "$ npm install -D drizzle-kit dotenv",
]
export const ORM_PRISMA = [
    "Prisma - pin version 7 for both packages; npm's `latest` tag for `prisma` pointed at an 8.0 release candidate on 2026-09-24, which does not match the client:",
    "$ npm install -D prisma@7 dotenv",
    "$ npm install @prisma/client@7 @prisma/adapter-neon@7",
]

export function chooseOrm(where: string, prismaOutput: string): SetupTask {
    return step({
        title: "Connect with Prisma or Drizzle",
        description: [
            "Pick one ORM for the whole project; every later task works with either.",
            ...ORM_DRIZZLE,
            `Then create \`${where}/db/index.ts\` that builds the client from \`drizzle(neon(process.env.DATABASE_URL))\` and throws a clear error when DATABASE_URL is missing, and \`drizzle.config.ts\` at the root with \`import "dotenv/config"\` on its first line, \`dialect: "postgresql"\` and \`schema\` pointing at \`${where}/db/schema.ts\`.`,
            ...ORM_PRISMA,
            `$ npx prisma init --datasource-provider postgresql --output ${prismaOutput}`,
            `Then create \`${where}/lib/prisma.ts\` that makes ONE PrismaClient with the Neon adapter (\`new PrismaNeon({ connectionString })\`), and add \`"postinstall": "prisma generate"\` to the scripts in package.json so a fresh clone builds the client.`,
        ],
        criteria: [
            "One ORM is installed, not both",
            "The database client is created in exactly one file and imported from there",
            "The app refuses to start with a clear message when DATABASE_URL is missing",
            "`npx tsc --noEmit` passes",
        ],
        hints: [
            "A dev server that reloads on every save will create a new client each time unless you keep it on `globalThis` in development. The ORM's Next.js guide shows the pattern.",
        ],
        estimatedTime: "20 minutes",
    })
}

export function nextHealth(): SetupTask {
    return step({
        title: "Prove the connection with a health route",
        description: [
            "Add `src/app/api/health/route.ts`: a GET handler that runs `select 1` through your ORM and returns `{\"db\":\"ok\"}`.",
            "Nothing else talks to the database yet, so this is where a wrong connection string or a missing `.env` shows up - now, instead of in the middle of a feature.",
        ],
        criteria: [
            "With `npm run dev` running, http://localhost:3000/api/health returns {\"db\":\"ok\"}",
            "Renaming `.env` for a moment makes the app fail with your message about DATABASE_URL, not an unexplained crash",
        ],
        hints: ["Drizzle: db.execute(sql`select 1`). Prisma: prisma.$queryRaw`select 1`."],
        estimatedTime: "15 minutes",
    })
}

// ─── Shared last step ────────────────────────────────────────────────────────

export function layoutAndCommit(folders: string[], run: string, message = "Set up the project"): SetupTask {
    return step({
        title: "Lay out the folders and commit",
        description: [
            "Create the folders the next sprints fill in, each with a one-line README or an empty `index.ts`, so the structure is decided once, not per task:",
            ...folders,
            "Then commit:",
            "$ git add -A",
            `$ git commit -m "${message}"`,
            "Pushing to a private GitHub repository is a good backup, and optional.",
        ],
        criteria: [
            "The folders above exist and are committed",
            "`git status` is clean, and `.env` does not appear anywhere in `git log --stat`",
            `\`${run}\` still starts the app after the commit`,
        ],
        hints: ["A folder git sees must contain a file - git does not track empty folders."],
        estimatedTime: "10 minutes",
    })
}

export function nextJsPostgres(slug: string, folders: string[], extra: { env?: string } = {}): SetupTask[] {
    return [
        installTools(),
        nextApp(slug),
        neonDatabase(slug, extra.env ?? ""),
        chooseOrm("src", "../src/generated/prisma"),
        nextHealth(),
        layoutAndCommit(folders, "npm run dev"),
    ]
}

export const setupSprint = (name: string, goal: string, tasks: SetupTask[]): SetupSprint => ({ name, goal, duration: "1 day", tasks })

// ─── Vite + React (browser-only projects) ────────────────────────────────────

export function viteApp(slug: string): SetupTask {
    return step({
        title: "Create the Vite app",
        description: [
            "From the folder you keep projects in:",
            `$ npm create vite@latest ${slug} -- --template react-ts --no-interactive`,
            `$ cd ${slug}`,
            "$ npm install",
            "$ git init",
            "$ npm run dev",
            "That makes a React and TypeScript app built with Vite. TypeScript 6 is strict by default, so `tsconfig.app.json` has no `strict` line; leave it that way.",
        ],
        criteria: [
            "The local URL `npm run dev` prints shows the Vite starter page",
            "`npm run build` finishes without type errors",
        ],
        hints: ["The `--` before `--template` passes the flag through npm to the Vite installer."],
        estimatedTime: "10 minutes",
    })
}

export function vitest(): SetupTask {
    return step({
        title: "Add Vitest",
        description: [
            "$ npm install -D vitest",
            "Add `\"test\": \"vitest\"` to the scripts in package.json, and a first test in `src/sanity.test.ts` that imports `expect` and `test` from vitest and checks that 1 + 1 is 2.",
            "The later tasks ask for tests on the logic that is easy to get wrong - dates, streaks, parsing - so the runner goes in before there is anything to test.",
        ],
        criteria: [
            "`npm test -- --run` runs one test and it passes",
            "Changing the expected value to 3 makes it fail, and changing it back makes it pass",
        ],
        hints: ["`npm test` watches for changes; `-- --run` runs once and exits, which is what you want in a script."],
        estimatedTime: "10 minutes",
    })
}

// ─── Redis on Upstash ────────────────────────────────────────────────────────

export function upstashRedis(envFile: string): SetupTask {
    return step({
        title: "Create your Redis on Upstash",
        description: [
            "Sign up at upstash.com (the free plan is enough), create a Redis database in the region nearest you, and copy its TCP connection URL - the one that starts `rediss://`, not the REST URL.",
            `Add it to \`${envFile}\` as \`REDIS_URL="rediss://..."\`, and the key with a placeholder to \`.env.example\`.`,
        ],
        criteria: [
            "`.env` holds REDIS_URL starting with `rediss://`",
            "`.env.example` lists REDIS_URL with a placeholder",
        ],
        hints: ["`rediss` with two s is Redis over TLS. A client given a `redis://` URL for an Upstash database hangs instead of failing."],
        estimatedTime: "10 minutes",
    })
}



// ─── Node service, Go, Expo ──────────────────────────────────────────────────

export function nodeService(slug: string, withRedis = true): SetupTask {
    return step({
                title: "Create the Node service",
                description: [
                    `$ mkdir ${slug}`,
                    `$ cd ${slug}`,
                    "$ git init",
                    "$ npm init -y",
                    "$ npm pkg set type=module scripts.dev=\"tsx watch --env-file=.env src/server.ts\" scripts.typecheck=\"tsc --noEmit\"",
                    `$ npm install express@5${withRedis ? " ioredis" : ""}`,
                    "$ npm install -D typescript tsx @types/express @types/node",
                    "$ npx tsc --init",
                    "In the `tsconfig.json` that made, change `\"types\": []` to `\"types\": [\"node\"]` (or `process` will not type-check) and uncomment `\"rootDir\": \"./src\"`. Add a `.gitignore` with `node_modules` and `.env`.",
                    "`tsx` runs TypeScript directly and `--env-file` loads `.env`, so there is no build step while you develop.",
                ],
                criteria: [
                    "`npm run typecheck` passes on an empty `src/server.ts`",
                    "`.gitignore` lists `node_modules` and `.env`",
                ],
                hints: ["Imports between your own files end in `.js` even though the files are `.ts`: that is how Node's ES modules resolve them."],
                estimatedTime: "15 minutes",
            })
}

/** GET /health over Postgres, and Redis too when the project uses it. */
export function nodeHealth(withRedis: boolean): SetupTask {
    return withRedis
        ? step({
                title: "Connect both, and report them on /health",
                description: [
                    "Pick Prisma or Drizzle for Postgres (the same choice every later task works with):",
                    ...ORM_DRIZZLE,
                    ...ORM_PRISMA,
                    "Create `src/db/index.ts` with the ORM client and `src/redis.ts` with `new Redis(process.env.REDIS_URL)` from ioredis; each throws a clear error when its URL is missing.",
                    "Then `src/server.ts`: an Express app listening on port 3000 (or PORT from `.env`) with GET /health that runs `select 1` and a Redis PING, and answers 200 with `{\"postgres\":\"ok\",\"redis\":\"ok\"}` - or 503 naming whichever is down.",
                    "$ npm run dev",
                ],
                criteria: [
                    "http://localhost:3000/health answers 200 with both ok",
                    "Breaking REDIS_URL in `.env` makes /health answer 503 with redis down, not hang",
                    "`npm run typecheck` passes",
                ],
                hints: ["`Promise.allSettled` checks both at once and still tells you which one failed."],
                estimatedTime: "25 minutes",
            })
        : step({
                title: "Connect the database, and report it on /health",
                description: [
                    "Pick Prisma or Drizzle for Postgres (the same choice every later task works with):",
                    ...ORM_DRIZZLE,
                    ...ORM_PRISMA,
                    "Create `src/db/index.ts` with the ORM client; it throws a clear error when DATABASE_URL is missing.",
                    "Then `src/server.ts`: an Express app listening on port 3000 (or PORT from `.env`) with GET /health that runs `select 1` and answers 200 with `{\"db\":\"ok\"}`, or 503 when the database is down.",
                    "$ npm run dev",
                ],
                criteria: [
                    "http://localhost:3000/health answers 200 with {\"db\":\"ok\"}",
                    "Breaking DATABASE_URL in `.env` makes /health answer 503, not hang",
                    "`npm run typecheck` passes",
                ],
                hints: ["Keep the check cheap: `select 1` proves the connection without depending on any table."],
                estimatedTime: "25 minutes",
            })
}

export function goModule(slug: string, pkgs: string[]): SetupTask {
    return step({
                title: "Create the Go module",
                description: [
                    `$ mkdir ${slug}`,
                    `$ cd ${slug}`,
                    "$ git init",
                    `$ go mod init github.com/<you>/${slug}`,
                    `$ go get ${[...pkgs, "github.com/joho/godotenv"].join(" ")}`,
                    "Add a `.gitignore` with `.env` and the binaries you build.",
                ],
                criteria: [
                    "`go.mod` names your module and requires what you installed",
                    "`.gitignore` lists `.env`",
                ],
                hints: ["The module path does not have to exist on GitHub yet; it only has to be unique to you."],
                estimatedTime: "10 minutes",
            })
}

export function goRedisPing(): SetupTask {
    return step({
                title: "Ping Redis from Go",
                description: [
                    "Write `cmd/server/main.go`: load `.env` with `godotenv.Load()`, read REDIS_URL, parse it with `redis.ParseURL`, create a client and PING it. Print the reply; exit with a clear message when REDIS_URL is missing or Redis cannot be reached.",
                    "$ go mod tidy",
                    "$ go run ./cmd/server",
                ],
                criteria: [
                    "`go run ./cmd/server` prints PONG",
                    "With REDIS_URL removed from `.env` it exits non-zero with your message",
                    "`go vet ./...` reports nothing",
                ],
                hints: ["`go mod tidy` moves go-redis from indirect to a direct requirement once your code imports it."],
                estimatedTime: "20 minutes",
            })
}

export function expoApp(slug: string): SetupTask {
    return step({
                title: "Create the app with Expo",
                description: [
                    "One folder holds both halves: `app/` for the phone and `server/` for the API. Create the app BEFORE running git init - inside a git repository the installer stops to ask a question.",
                    `$ mkdir ${slug}`,
                    `$ cd ${slug}`,
                    "$ npx create-expo-app@latest app --template default",
                    "$ cd app",
                    "$ npx expo install expo-sqlite",
                    "$ npx expo start",
                    "Scan the QR code with your phone's camera (iOS) or with Expo Go (Android). The first `expo start` also writes the type declarations the template needs, so run `npx tsc --noEmit` after it, not before.",
                ],
                criteria: [
                    "The starter app opens in Expo Go on your phone",
                    "`npx tsc --noEmit` passes in `app/` after the first start",
                    "expo-sqlite is in `app/package.json`",
                ],
                hints: ["Phone and computer on the same Wi-Fi. On a network that blocks that, `npx expo start --tunnel` works anywhere."],
                estimatedTime: "25 minutes",
            })
}

export function expoApi(): SetupTask {
    return step({
                title: "Create the API and its database",
                description: [
                    "$ cd ..",
                    "$ git init",
                    "$ mkdir server",
                    "$ cd server",
                    "$ npm init -y",
                    "$ npm pkg set type=module scripts.dev=\"tsx watch --env-file=.env src/server.ts\" scripts.typecheck=\"tsc --noEmit\"",
                    "$ npm install express@5",
                    "$ npm install -D typescript tsx @types/express @types/node",
                    "$ npx tsc --init",
                    "In `server/tsconfig.json`, set `\"types\": [\"node\"]` and `\"rootDir\": \"./src\"`. Create a Postgres database on Neon (free plan) for this project, put its URL in `server/.env` as DATABASE_URL with a placeholder copy in `server/.env.example`, and install Prisma or Drizzle as below.",
                    ...ORM_DRIZZLE,
                    ...ORM_PRISMA,
                    "Finally `src/server.ts`: an Express app listening on port 3000 with GET /health that runs `select 1` and answers `{\"db\":\"ok\"}`.",
                    "$ npm run dev",
                ],
                criteria: [
                    "http://localhost:3000/health answers {\"db\":\"ok\"}",
                    "`npm run typecheck` passes in `server/`",
                    "A root `.gitignore` lists `node_modules` and `.env`",
                ],
                hints: ["The phone reaches your API by your computer's LAN address, not localhost - worth knowing before sprint 1 wires them together."],
                estimatedTime: "30 minutes",
            })
}


// ─── Generated projects (plan/project-repos RP-5) ────────────────────────────

export interface StackInfo {
    slug: string
    generationType: string
    stacks: Record<string, string | undefined>
    technologies: string[]
    /** Folders from the blueprint's projectStructure; defaults are used when empty. */
    folders: string[]
}

const NONE = /^(none|n\/a|-)?$/i

/** "`src/db/` - the client" from whatever the model wrote ("src/db: the client", "src/db"). */
function folderLine(raw: string): string | null {
    const text = raw.trim().replace(/^[-*]\s*/, "")
    // The project root or bare src/ is not a folder to create.
    if (!text || /^(\.\/?|\/|src\/?)$/.test(text)) return null
    const m = text.match(/^([\w./@()[\]-]+\/?)\s*(?:[-:]\s*(.*))?$/)
    if (!m) return `${text.slice(0, 160)}`
    return m[2] ? `\`${m[1]}\` - ${m[2].slice(0, 140)}` : `\`${m[1]}\``
}

/**
 * The verified Setup for a generated project's stack, or null when the stack
 * is not one these steps were run on - the caller then uses the model's own
 * Setup, validated (apps/worker/src/pipeline-setup.ts).
 *
 * Covered: Expo, Next.js (with or without Postgres), Vite + React with no
 * backend, a Node service over Postgres (and Redis), Go (with Redis or none).
 * A database other than Postgres, or Go over Postgres, is not covered yet.
 */
export function setupForStack(p: StackInfo): SetupSprint | null {
    const val = (k: string) => (p.stacks[k] ?? "").trim()
    const frontend = val("frontend").toLowerCase()
    const backend = NONE.test(val("backend")) ? "" : val("backend").toLowerCase()
    const database = NONE.test(val("database")) ? "" : val("database").toLowerCase()
    const all = [frontend, backend, database, ...p.technologies.map((t) => t.toLowerCase())].join(" ")
    const postgres = /postgres/.test(all)
    const redis = /redis/.test(all)
    const otherDb = database && !/postgres|redis|localstorage|indexeddb|sqlite/.test(database)
    if (otherDb) return null

    const folders = p.folders.map(folderLine).filter((f): f is string => !!f).slice(0, 6)
    const layout = (fallback: string[], run: string) => layoutAndCommit(folders.length ? folders : fallback, run)
    const goal = (what: string) => `${what} runs on your machine, ready for sprint 1.`

    if (/expo|react native/.test(all)) {
        const tasks = [installTools({ expoGo: true }), expoApp(p.slug)]
        if (backend) {
            if (!postgres) return null
            tasks.push(expoApi())
        }
        tasks.push(layout(["`app/` - the Expo app (already there)", "`server/src/` - the API", "`shared/` - types both halves use"], "npx expo start"))
        return setupSprint("Get it running on your machine", `The app opens in Expo Go on your phone${backend ? ", and its API reaches its own Postgres on Neon" : ""}.`, tasks)
    }

    if (/next/.test(frontend) || /next/.test(backend)) {
        if (postgres) {
            return setupSprint("Get it running on your machine", "A Next.js app on your machine reaches its own Postgres database on Neon through the ORM you chose.",
                nextJsPostgres(p.slug, folders.length ? folders : ["`src/db/` - the ORM client and the schema", "`src/app/` - pages and route handlers (already there)"]))
        }
        if (backend && !/next/.test(backend)) return null
        return setupSprint("Get it running on your machine", goal("A Next.js app"),
            [installTools(), nextApp(p.slug), layout(["`src/components/` - UI pieces", "`src/lib/` - logic with no React in it", "`src/app/` - pages (already there)"], "npm run dev")])
    }

    if (/\bgo\b|golang/.test(backend)) {
        if (postgres) return null
        const tasks = [installTools({ go: true, node: !!frontend }), goModule(p.slug, redis ? ["github.com/redis/go-redis/v9"] : [])]
        if (redis) tasks.push(upstashRedis(".env"), goRedisPing())
        tasks.push(layout(["`cmd/server/` - main, and nothing but wiring", "`internal/` - the packages the service is made of"], redis ? "go run ./cmd/server" : "go build ./..."))
        return setupSprint("Get it running on your machine", goal("A Go module"), tasks)
    }

    if (/node|express|fastify|hono/.test(backend)) {
        if (!postgres) return null
        const tasks = [installTools(), nodeService(p.slug, redis), neonDatabase(p.slug)]
        if (redis) tasks.push(upstashRedis(".env"))
        tasks.push(nodeHealth(redis), layout(["`src/db/` - the ORM client and the schema", "`src/routes/` - the HTTP handlers"], "npm run dev"))
        return setupSprint("Get it running on your machine", goal("A TypeScript Node service"), tasks)
    }

    if (!backend && !postgres && (/react|vite/.test(frontend) || p.generationType === "FRONTEND")) {
        return setupSprint("Get it running on your machine", "A React and TypeScript app built with Vite runs on your machine with a working test runner.",
            [installTools(), viteApp(p.slug), vitest(), layout(["`src/components/` - UI pieces", "`src/lib/` - logic with no React in it, tested"], "npm run dev")])
    }

    return null
}
