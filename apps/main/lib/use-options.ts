"use client"

import { useEffect, useState } from "react"
import { OPTION_BUILTINS, type OptionKind } from "@repo/db/option-builtins"
import { getOptions } from "@/actions/(common)/options/options.action"

/**
 * The choices for a form's selects (plan/ui-forms): the built-ins at once, then the
 * shared and the student's own values when they arrive, so a select is never empty.
 */
export function useOptions<K extends OptionKind>(kinds: readonly K[]): Record<K, string[]> {
    const key = kinds.join(",")
    const [options, setOptions] = useState(() => Object.fromEntries(kinds.map((k) => [k, [...OPTION_BUILTINS[k]]])) as Record<K, string[]>)
    useEffect(() => {
        let live = true
        getOptions([...kinds]).then((o) => { if (live) setOptions(o as Record<K, string[]>) }).catch(() => null)
        return () => { live = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    return options
}
