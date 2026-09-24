import type { SeedSprint } from "./types"
import {
    expoApi, expoApp, goModule, goRedisPing, installTools, layoutAndCommit, nextJsPostgres, neonDatabase, nodeHealth, nodeService, setupSprint,
    step, upstashRedis, viteApp, vitest,
} from "../../project-setup"

/**
 * Sprint 0 - Setup, for each of the ten curated projects (plan/project-repos
 * RP-4). The steps themselves, and how each was verified, are in
 * `packages/db/src/project-setup.ts`, shared with generated projects.
 */

// ─── The ten ─────────────────────────────────────────────────────────────────

export const SETUPS: Record<string, SeedSprint> = {
    "expense-splitter": setupSprint(
        "Get it running on your machine",
        "A Next.js app on your machine reaches its own Postgres database on Neon through the ORM you chose.",
        nextJsPostgres("expense-splitter", [
            "`src/db/` - the ORM client and the schema",
            "`src/domain/` - money, splits and settle-up as pure functions: no database or React imports, so they can be tested alone",
            "`src/app/` - pages and route handlers (already there)",
        ]),
    ),

    "job-board-with-matching": setupSprint(
        "Get it running on your machine",
        "A Next.js app with Tailwind on your machine reaches its own Postgres database on Neon through the ORM you chose.",
        nextJsPostgres("job-board-with-matching", [
            "`src/db/` - the ORM client and the schema",
            "`src/server/` - queries and actions that touch the database; only server code imports from here",
            "`src/matching/` - the scoring, as pure functions over plain data",
            "`src/app/` - pages and route handlers (already there)",
        ]),
    ),

    "personal-finance-tracker": setupSprint(
        "Get it running on your machine",
        "A Next.js app on your machine reaches its own Postgres database on Neon through the ORM you chose.",
        nextJsPostgres("personal-finance-tracker", [
            "`src/db/` - the ORM client and the schema",
            "`src/import/` - reading a bank's CSV into rows, pure and tested",
            "`src/categorise/` - the rules that label a transaction",
            "`src/app/` - pages and route handlers (already there)",
        ]),
    ),

    "realtime-collaboration-board": setupSprint(
        "Get it running on your machine",
        "A Next.js app on your machine reaches its own Postgres database on Neon through the ORM you chose.",
        nextJsPostgres("realtime-collaboration-board", [
            "`src/db/` - the ORM client and the schema",
            "`src/board/` - the board's client-side state: notes, strokes, selection",
            "`server/` - the realtime server you add when the board goes multiplayer (a README saying so is enough for now)",
            "`src/app/` - pages and route handlers (already there)",
        ]),
    ),

    "habit-tracker-weekly-review": setupSprint(
        "Get it running on your machine",
        "A React and TypeScript app built with Vite runs on your machine with a working test runner.",
        [
            installTools(),
            viteApp("habit-tracker-weekly-review"),
            vitest(),
            layoutAndCommit([
                "`src/habits/` - the habit and completion types, and the storage behind them",
                "`src/dates/` - calendar-date helpers, pure and tested (this is where the bugs live)",
                "`src/views/` - the Today and Week screens",
            ], "npm run dev"),
        ],
    ),

    "markdown-notes-with-search": setupSprint(
        "Get it running on your machine",
        "A React and TypeScript app built with Vite runs on your machine with a working test runner.",
        [
            installTools(),
            viteApp("markdown-notes-with-search"),
            vitest(),
            layoutAndCommit([
                "`src/notes/` - the note model and its IndexedDB storage",
                "`src/search/` - the index and the query, pure and tested",
                "`src/workers/` - the web worker the search moves into later",
                "`src/components/` - the editor, the list and the preview",
            ], "npm run dev"),
        ],
    ),

    "url-shortener-with-analytics": setupSprint(
        "Get it running on your machine",
        "A TypeScript Node service on your machine reaches its own Postgres on Neon and Redis on Upstash, and says so on /health.",
        [
            installTools(),
            nodeService("url-shortener-with-analytics"),
            neonDatabase("url-shortener-with-analytics"),
            upstashRedis(".env"),
            nodeHealth(true),
            layoutAndCommit([
                "`src/db/` - the ORM client and the schema",
                "`src/routes/` - the HTTP handlers",
                "`src/links/` - creating and resolving a short code, independent of Express",
            ], "npm run dev"),
        ],
    ),

    "rate-limiter-service": setupSprint(
        "Get it running on your machine",
        "A Go module on your machine reaches its own Redis on Upstash and prints PONG.",
        [
            installTools({ go: true, node: false }),
            goModule("rate-limiter-service", ["github.com/redis/go-redis/v9"]),
            upstashRedis(".env"),
            goRedisPing(),
            layoutAndCommit([
                "`cmd/server/` - main, and nothing but wiring",
                "`internal/limiter/` - the algorithms, testable without Redis",
                "`internal/store/` - the Redis calls",
                "`internal/config/` - reading and validating settings",
            ], "go run ./cmd/server"),
        ],
    ),

    "observability-mini-stack": setupSprint(
        "Get it running on your machine",
        "A Go module on your machine reaches a local ClickHouse server and reads its version.",
        [
            installTools({ go: true }),
            step({
                title: "Run ClickHouse locally",
                description: [
                    "ClickHouse has no free hosted plan worth using here, so it runs on your machine. Install ClickHouse's own CLI (macOS and Linux; on Windows, run these inside WSL2):",
                    "$ curl https://clickhouse.com/ | sh",
                    "That installs `clickhousectl` into `~/.local/bin`. Then, from the project folder:",
                    "$ mkdir observability-mini-stack",
                    "$ cd observability-mini-stack",
                    "$ clickhousectl local server start",
                    "$ clickhousectl local client -q 'SELECT version()'",
                    "The first start downloads ClickHouse. The server keeps its data in a `.clickhouse` folder in the project; `clickhousectl local server stop default` stops it.",
                ],
                criteria: [
                    "`clickhousectl local client -q 'SELECT version()'` prints a version",
                    "`.clickhouse` is in `.gitignore`",
                ],
                hints: ["If `clickhousectl` is not found, `~/.local/bin` is not on your PATH yet - open a new terminal."],
                estimatedTime: "15 minutes",
            }),
            step({
                title: "Create the Go module and query ClickHouse",
                description: [
                    "$ git init",
                    "$ go mod init github.com/<you>/observability-mini-stack",
                    "$ go get github.com/ClickHouse/clickhouse-go/v2",
                    "Write `cmd/check/main.go`: open a connection to localhost:9000 with `clickhouse.Open`, run `SELECT version()`, print it, and exit with a clear message if the server is not running.",
                    "$ go mod tidy",
                    "$ go run ./cmd/check",
                ],
                criteria: [
                    "`go run ./cmd/check` prints the ClickHouse version",
                    "With the server stopped it exits non-zero with your message",
                ],
                hints: ["Port 9000 is ClickHouse's native protocol, which the Go driver speaks; 8123 is HTTP."],
                estimatedTime: "20 minutes",
            }),
            layoutAndCommit([
                "`demo/` - the service you will observe",
                "`collector/` - receiving telemetry and writing it to ClickHouse",
                "`schema/` - the ClickHouse tables, as SQL files",
                "`dashboard/` - the React UI you add later (a README saying so is enough for now)",
            ], "go run ./cmd/check"),
        ],
    ),

    "offline-first-delivery-app": setupSprint(
        "Get it running on your machine",
        "The courier app opens in Expo Go on your phone, and a TypeScript API beside it reaches its own Postgres on Neon.",
        [
            installTools({ expoGo: true }),
            expoApp("offline-first-delivery-app"),
            expoApi(),
            layoutAndCommit([
                "`app/` - the Expo app (already there)",
                "`server/src/routes/` - the HTTP handlers",
                "`server/src/db/` - the ORM client and the schema",
                "`shared/` - the event and stop types both halves agree on",
            ], "npx expo start"),
        ],
    ),
}
