"use client"

import { useCase } from "../primitives"
import { Simulator } from "../simulator"
import { TrafficView } from "./traffic-view"

/**
 * The case's simulator, whichever kind it is (plan/incidents INC-55, INC-56): a `traffic`
 * scenario (data, the engine) or case 1's `timeline` (its reviewed code, kept). `preset`
 * starts it on the choices a chapter is talking about.
 */
export function CaseSimulator({ preset }: { preset?: Record<string, string> }) {
    const c = useCase()
    if ("kind" in c.simulator && c.simulator.kind === "traffic") return <TrafficView scenario={c.simulator} preset={preset} />
    return <Simulator />
}
