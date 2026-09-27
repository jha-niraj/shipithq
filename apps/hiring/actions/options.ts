"use server"

import { listOptions } from "@repo/db/options"
import { OPTION_KINDS, type OptionKind } from "@repo/db/option-builtins"
import { requirePermission } from "@/lib/permissions"

/*
 * The choices behind every select with "Other" in the hiring app (plan/hiring-ui HU-2):
 * the built-ins, values 3+ organisations used, and this company's own. Saving goes
 * through each form's own action, which calls `recordOptions`.
 */
export async function getOptions(kinds: OptionKind[]): Promise<Record<OptionKind, string[]>> {
    const wanted = kinds.filter((k) => (OPTION_KINDS as readonly string[]).includes(k))
    const auth = await requirePermission()
    if (!auth.ok) {
        const { OPTION_BUILTINS } = await import("@repo/db/option-builtins")
        return Object.fromEntries(wanted.map((k) => [k, [...OPTION_BUILTINS[k]]])) as Record<OptionKind, string[]>
    }
    return listOptions(wanted, `company:${auth.ctx.companyId}`)
}
