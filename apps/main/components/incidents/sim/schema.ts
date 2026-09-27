import { z } from "zod"

/**
 * A simulator as data (plan/incidents INC-55). A `traffic` scenario is fully declarative:
 * controls the reader picks, actors that make attempts over time, policies (a closed set
 * of rules, never code) that answer them, and the verdicts to show. This is the shape the
 * AI will draft in apps/admin (INC-60), so the schema is the gate: a draft that does not
 * parse is rejected before anyone sees it.
 *
 * Case 1's `timeline` simulator keeps its reviewed, hand-written behaviour (Niraj,
 * 2026-09-28: "wrap it, keep its code"); only new cases are data.
 */

/** Which control values turn a piece on. `{ attack: ["spray", "botnet"] }`; absent means always. */
const Active = z.record(z.string(), z.array(z.string())).optional()

const Pool = z.union([
    z.object({ mode: z.literal("fixed"), value: z.string() }),
    /** A new value per attempt, cycling through `count` of them (a spray's emails, a botnet's IPs). */
    z.object({ mode: z.literal("rotate"), prefix: z.string(), count: z.number().int().positive() }),
])

export const Actor = z.object({
    id: z.string(),
    label: z.string(),
    kind: z.enum(["attacker", "user"]),
    active: Active,
    /** Seconds from the start of the first attempt, and between attempts. */
    start: z.number().nonnegative(),
    every: z.number().positive(),
    /** Stop after this many attempts (a real user logs in once or twice). */
    count: z.number().int().positive().optional(),
    email: Pool,
    ip: Pool,
    /** A device the service has seen before signs in with a cookie; attackers are always new. */
    device: z.enum(["known", "new"]),
    /** Attacker: every Nth guess that reaches the password check is right (a spray's hit rate, one account's password rank). */
    hitEvery: z.number().int().positive().optional(),
    /** User: the first N attempts are typos, then the right password. */
    typos: z.number().int().nonnegative().optional(),
})

export const Rule = z.discriminatedUnion("type", [
    /** Count FAILED attempts per key in a sliding window; past the limit, refuse (429) or lock the key. */
    z.object({
        type: z.literal("counter"),
        key: z.array(z.enum(["email", "ip"])).min(1),
        window: z.number().positive(),
        limit: z.number().int().positive(),
        action: z.enum(["block", "lock"]),
        /** `lock`: every attempt on the key is refused for this long, even the right password. */
        lockSeconds: z.number().positive().optional(),
    }),
    /** Several signals into one score, and a graded answer (INC-58, chapter 7). */
    z.object({
        type: z.literal("score"),
        window: z.number().positive(),
        /** Per failure in the window on this email / this address / the whole service, and for a new device. */
        weights: z.object({ emailFails: z.number(), ipFails: z.number(), newDevice: z.number(), serviceFails: z.number().default(0) }),
        slowAt: z.number(),
        challengeAt: z.number(),
        blockAt: z.number(),
        /** Seconds a "slow down" answer holds the caller back. */
        slowSeconds: z.number().positive(),
    }),
])

export const TrafficScenario = z.object({
    kind: z.literal("traffic"),
    /** Seconds of simulated time. */
    duration: z.number().positive(),
    /** One line: what is being simulated. */
    job: z.string(),
    controls: z.array(z.object({
        id: z.string(),
        label: z.string(),
        options: z.array(z.object({ value: z.string(), label: z.string(), hint: z.string().optional() })).min(1),
    })).min(1),
    defaults: z.record(z.string(), z.string()),
    actors: z.array(Actor).min(1),
    policies: z.array(z.object({ id: z.string(), label: z.string(), active: Active, rules: z.array(Rule) })),
    /** What the result means, per combination: the first whose `active` matches is shown. */
    verdicts: z.array(z.object({ active: Active, headline: z.string(), reason: z.string() })).min(1),
    /** Shown under the simulator: what is faithful and what is illustrative. */
    fidelity: z.string(),
})

export type TrafficScenario = z.infer<typeof TrafficScenario>
export type TrafficActor = z.infer<typeof Actor>
export type TrafficRule = z.infer<typeof Rule>
