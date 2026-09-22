"use client"

import { useEffect, useRef, useState } from "react"
import toast from "@repo/ui/components/ui/sonner"
import { startOnboardingRun } from "@/actions/(main)/onboarding/module-onboarding.action"
import { onboardingModule, type OnboardingModuleKey } from "@/lib/onboarding/modules"
import type { OnboardingRunView } from "@/types/onboarding"
import { ModuleGate } from "./module-gate"
import { ModuleOnboarding } from "./module-onboarding"

/**
 * The client half of a gated sub-module page. Shows the gate until a run
 * exists, then the flow, with no navigation between them.
 *
 * `autoStart` skips the gate: a returning user with `?resume=1`, or a retake
 * from the widget, goes straight into the questions.
 */
export function ModuleOnboardingEntry({
    moduleKey,
    inProgress,
    autoStart,
    hasCompleted,
}: {
    moduleKey: OnboardingModuleKey
    inProgress: OnboardingRunView | null
    autoStart: boolean
    hasCompleted: boolean
}) {
    const [run, setRun] = useState<OnboardingRunView | null>(autoStart ? inProgress : null)
    const [starting, setStarting] = useState(false)
    const started = useRef(false)
    const mod = onboardingModule(moduleKey)

    const start = async () => {
        if (starting) return
        setStarting(true)
        const res = await startOnboardingRun(moduleKey)
        setStarting(false)
        if (!res.success) {
            toast.error(res.error)
            return
        }
        setRun(res.run)
    }

    useEffect(() => {
        if (!autoStart || run || started.current) return
        started.current = true
        void start()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart])

    if (run) return <ModuleOnboarding moduleKey={moduleKey} run={run} />

    return (
        <ModuleGate
            moduleKey={moduleKey}
            resumable={Boolean(inProgress)}
            starting={starting || (autoStart && !run)}
            onStart={start}
            backHref={hasCompleted ? mod.gatePath : undefined}
        />
    )
}
