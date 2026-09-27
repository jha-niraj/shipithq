import { and, count, eq, inArray, sql } from "drizzle-orm"
import { db } from "./client"
import { optionValueUses, optionValues } from "./schema/option-values"
import { OPTION_BUILTINS, checkOptionValue, optionKey, type OptionKind } from "./option-builtins"

/*
 * The shared dataset behind "Other" (plan/hiring-ui HU-2). Server-only by use: it takes
 * the organisation from the caller, which must have checked the session.
 */

/** Shown to everyone once this many organisations used it (Niraj, 2026-09-28). */
export const SHARE_AFTER_ORGS = 3

/** The choices for each kind: the built-ins, shared values, and this organisation's own. */
export async function listOptions(kinds: readonly OptionKind[], org: string): Promise<Record<OptionKind, string[]>> {
    const out = {} as Record<OptionKind, string[]>
    for (const k of kinds) out[k] = [...OPTION_BUILTINS[k]]
    if (!kinds.length) return out
    const rows = await db.select({
        kind: optionValues.kind, value: optionValues.value, key: optionValues.key,
        orgs: count(optionValueUses.id),
        mine: sql<boolean>`bool_or(${optionValueUses.org} = ${org})`,
    }).from(optionValues).innerJoin(optionValueUses, eq(optionValueUses.optionId, optionValues.id))
        .where(and(inArray(optionValues.kind, [...kinds]), eq(optionValues.hidden, false)))
        .groupBy(optionValues.id)
    for (const r of rows) {
        const k = r.kind as OptionKind
        if (!(Number(r.orgs) >= SHARE_AFTER_ORGS || r.mine)) continue
        if (out[k].some((v) => optionKey(v) === r.key)) continue
        out[k].push(r.value)
    }
    return out
}

/**
 * Remember values an organisation saved. A built-in isn't stored; a new value is;
 * the organisation's use is counted once. Junk is skipped, never thrown.
 */
export async function recordOptions(kind: OptionKind, values: readonly string[], org: string): Promise<void> {
    const builtin = new Set(OPTION_BUILTINS[kind].map(optionKey))
    for (const raw of values) {
        const check = checkOptionValue(raw)
        if (!check.ok) continue
        const key = optionKey(check.value)
        if (!key || builtin.has(key)) continue
        await db.insert(optionValues).values({ kind, value: check.value, key }).onConflictDoNothing()
        const [row] = await db.select({ id: optionValues.id }).from(optionValues).where(and(eq(optionValues.kind, kind), eq(optionValues.key, key)))
        if (row) await db.insert(optionValueUses).values({ optionId: row.id, org }).onConflictDoNothing()
    }
}
