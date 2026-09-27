"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { listOptions, recordOptions } from "@repo/db/options"
import { OPTION_BUILTINS, OPTION_KINDS, type OptionKind } from "@repo/db/option-builtins"

/*
 * The choices behind every select with "Other" in apps/main (plan/ui-forms): the
 * built-ins, values 3 or more students or companies used, and this student's own.
 * The organisation is `user:<id>`, from the session, never from the client.
 */

const valid = (kinds: readonly string[]) => kinds.filter((k): k is OptionKind => (OPTION_KINDS as readonly string[]).includes(k))

export async function getOptions(kinds: OptionKind[]): Promise<Record<OptionKind, string[]>> {
    const wanted = valid(kinds)
    const session = await getSession(await headers())
    if (!session?.user?.id) return Object.fromEntries(wanted.map((k) => [k, [...OPTION_BUILTINS[k]]])) as Record<OptionKind, string[]>
    return listOptions(wanted, `user:${session.user.id}`)
}

/**
 * Remember what a student saved, after the form itself saved (best effort, never
 * throws). Built-ins and junk are skipped by `recordOptions`; a value is shown to
 * others only once 3 organisations used it.
 */
export async function rememberOptions(entries: { kind: OptionKind; values: string[] }[]): Promise<void> {
    const session = await getSession(await headers())
    if (!session?.user?.id) return
    const org = `user:${session.user.id}`
    for (const e of entries.slice(0, 12)) {
        if (!valid([e.kind]).length) continue
        const values = e.values.filter((v) => typeof v === "string").slice(0, 30)
        if (values.length) await recordOptions(e.kind, values, org).catch(() => null)
    }
}
