import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema/index";

// ─────────────────────────────────────────────────────────────────────────────
// TWO clients, on purpose.
//
// `db` (neon-http) is the default and handles every read and single-statement
// write. It is stateless HTTP: no connection setup, lowest latency per query, and
// it works identically in Node, on Vercel and on Cloudflare Workers.
//
// What it CANNOT do is `.transaction()`. Calling it throws
//   "No transactions support in neon-http driver"
// at runtime. That is not a theoretical limitation: 28 call sites across this
// codebase were calling `db.transaction()`, every one of them threw, and every one
// was swallowed by a surrounding try/catch that returned `{ success: false }`.
// Upvotes, credit grants, XP/levels, follows, quiz submissions, standups and the
// resume marketplace were all silently failing in production.
//
// `dbTx` (neon-serverless) is a WebSocket Pool, which DOES support real
// transactions. It is deliberately NOT the default: a pool connection costs a
// handshake, and the overwhelming majority of queries here are single statements
// that have no need for one.
//
// Use `withTransaction` for any multi-statement write that must be atomic.
// ─────────────────────────────────────────────────────────────────────────────

// A browser bundle that reaches this file fails in `neon()` with "No database
// connection string was provided", which reads like a missing env var and sends
// people to check .env. The real cause is a client component importing a VALUE
// from the `@repo/db` root, which drags this module in. Say so.
if (typeof window !== "undefined") {
    throw new Error(
        "@repo/db's database client was imported in the browser. A client component (or something it imports) " +
        "takes a value from the `@repo/db` root; import from a database-free entry instead: `@repo/db/onboarding`, " +
        "`@repo/db/practice` or `@repo/db/resume`, or use `import type`.",
    );
}

const connectionString = process.env.DATABASE_URL!;

// ── Default client: HTTP, stateless, no transactions ─────────────────────────
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export type DB = NeonHttpDatabase<typeof schema>;

// ── Transactional client: WebSocket pool, created lazily ─────────────────────
// Lazily, because most requests never open a transaction and constructing the
// pool eagerly would pay the handshake on every cold start for nothing.
let pool: Pool | undefined;
let txDb: NeonDatabase<typeof schema> | undefined;

function getTxDb(): NeonDatabase<typeof schema> {
    if (!txDb) {
        // On Cloudflare Workers the runtime provides a global WebSocket; in Node
        // (dev server, scripts, migrations) there is none, so the driver needs one
        // supplied. `ws` is only reached for in the Node branch, so the Workers
        // bundle never pulls it in.
        if (typeof WebSocket !== "undefined") {
            neonConfig.webSocketConstructor = WebSocket;
        }
        pool = new Pool({ connectionString });
        txDb = drizzlePool(pool, { schema });
    }
    return txDb;
}

/** The drizzle transaction callback shape, re-exported so callers can type theirs. */
export type TxClient = Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

/**
 * Run `fn` inside a real database transaction.
 *
 * Drop-in for the old `db.transaction(async (tx) => { … })` - the `tx` handed to
 * the callback exposes the same drizzle query builder against the same schema, so
 * existing bodies work unchanged.
 *
 *   await withTransaction(async (tx) => {
 *     await tx.insert(votes).values(…)
 *     await tx.update(ideas).set({ upvotes: sql`${ideas.upvotes} + 1` })…
 *   })
 */
export async function withTransaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
    return getTxDb().transaction(fn);
}
