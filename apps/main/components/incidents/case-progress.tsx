"use client"

import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react"
import toast from "@repo/ui/components/ui/sonner"
import { recordIncidentProgress } from "@/actions/(main)/incidents/incidents.action"
import type { ProgressInput } from "@/lib/incidents/record"
import type { IncidentCase } from "@/content/incidents/types"
import type { QuizResponse } from "@repo/ui/lib/quiz"

/**
 * A reader's progress through one case (plan/incidents INC-3, INC-4). The page loads
 * a signed-in reader's saved progress as `initial`; every change is applied here at
 * once and saved by `recordIncidentProgress`, which is also where XP is awarded,
 * once per item. Signed out, nothing is saved (every action asks for sign-in first,
 * except noting that the model was read, which is simply not kept).
 *
 * Answers are final: a prediction or a round answer, once given, is locked. That is
 * what "first try" means for XP.
 */

export type Progress = {
    fork: string | null
    modelSeen: boolean
    simulatorPlayed: boolean
    predictions: Record<string, string>
    treeLeaf: string | null
    checklist: string[]
    round: Record<string, string>
    /** A chapter check's answers, by "chapter:question" (INC-19). */
    checks: Record<string, QuizResponse>
    /** Steps the reader marked done with "Got it, continue" (INC-20). */
    stepsDone: string[]
}

type Action =
    | { type: "fork"; option: string }
    | { type: "modelSeen" }
    | { type: "simulatorPlayed" }
    | { type: "predict"; question: string; option: string }
    | { type: "treeLeaf"; leaf: string | null }
    | { type: "check"; item: string }
    | { type: "round"; item: string; option: string }
    | { type: "roundReset" }
    | { type: "quiz"; chapter: string; questionId: string; response: QuizResponse }
    | { type: "stepDone"; stepKey: string }

export const EMPTY_PROGRESS: Progress = {
    fork: null, modelSeen: false, simulatorPlayed: false, predictions: {}, treeLeaf: null, checklist: [], round: {}, checks: {}, stepsDone: [],
}

function reduce(s: Progress, a: Action): Progress {
    switch (a.type) {
        case "fork": return s.fork ? s : { ...s, fork: a.option }
        case "modelSeen": return s.modelSeen ? s : { ...s, modelSeen: true }
        case "simulatorPlayed": return s.simulatorPlayed ? s : { ...s, simulatorPlayed: true }
        case "predict": return a.question in s.predictions ? s : { ...s, predictions: { ...s.predictions, [a.question]: a.option } }
        case "treeLeaf": return { ...s, treeLeaf: a.leaf }
        case "check": return {
            ...s,
            checklist: s.checklist.includes(a.item) ? s.checklist.filter((i) => i !== a.item) : [...s.checklist, a.item],
        }
        case "round": return a.item in s.round ? s : { ...s, round: { ...s.round, [a.item]: a.option } }
        case "roundReset": return { ...s, round: {} }
        case "quiz": {
            const k = `${a.chapter}:${a.questionId}`
            return k in s.checks ? s : { ...s, checks: { ...s.checks, [k]: a.response } }
        }
        case "stepDone": return s.stepsDone.includes(a.stepKey) ? s : { ...s, stepsDone: [...s.stepsDone, a.stepKey] }
    }
}

export type Derived = {
    predictionsRight: number
    predictionsDone: boolean
    roundRight: number
    roundDone: boolean
    /** Per section id: finished or not, for the progress rail. */
    sections: Record<string, boolean>
    complete: boolean
}

function derive(c: IncidentCase, s: Progress): Derived {
    const predictionsRight = c.predict.filter((q) => s.predictions[q.id] === q.answer).length
    const predictionsDone = c.predict.every((q) => q.id in s.predictions)
    const roundRight = c.round.filter((r) => s.round[r.id] === r.answer).length
    const roundDone = c.round.every((r) => r.id in s.round)
    return {
        predictionsRight, predictionsDone, roundRight, roundDone,
        sections: {
            incident: s.fork !== null,
            model: s.modelSeen,
            simulator: s.simulatorPlayed,
            predict: predictionsDone,
            fix: s.treeLeaf !== null,
            checklist: roundDone,
        },
        complete: predictionsDone && roundDone,
    }
}

type Ctx = { progress: Progress; derived: Derived; dispatch: (a: Action) => void }
const ProgressCtx = createContext<Ctx | null>(null)

/** The save a change needs, or null when it changes nothing already saved. */
function toInput(slug: string, s: Progress, a: Action): ProgressInput | null {
    switch (a.type) {
        case "fork": return s.fork ? null : { slug, kind: "fork", value: a.option }
        case "modelSeen": return s.modelSeen ? null : { slug, kind: "model" }
        case "simulatorPlayed": return s.simulatorPlayed ? null : { slug, kind: "simulator" }
        case "predict": return a.question in s.predictions ? null : { slug, kind: "prediction", itemId: a.question, value: a.option }
        case "round": return a.item in s.round ? null : { slug, kind: "round", itemId: a.item, value: a.option }
        case "treeLeaf": return a.leaf && a.leaf !== s.treeLeaf ? { slug, kind: "tree", value: a.leaf } : null
        case "check": return { slug, kind: "checklist", itemId: a.item, checked: !s.checklist.includes(a.item) }
        case "roundReset": return null
        case "quiz": return `${a.chapter}:${a.questionId}` in s.checks ? null : { slug, kind: "check", chapter: a.chapter, questionId: a.questionId, response: a.response }
        case "stepDone": return s.stepsDone.includes(a.stepKey) ? null : { slug, kind: "step", stepKey: a.stepKey }
    }
}

export function CaseProgressProvider({ incident, initial = EMPTY_PROGRESS, signedIn, children }: { incident: IncidentCase; initial?: Progress; signedIn: boolean; children: ReactNode }) {
    const [progress, apply] = useReducer(reduce, initial)
    const latest = useRef(progress)
    latest.current = progress

    const dispatch = useCallback((a: Action) => {
        const input = signedIn ? toInput(incident.slug, latest.current, a) : null
        apply(a)
        if (!input) return
        void recordIncidentProgress(input).then((r) => {
            if (!r.success) return toast.error(r.error)
            for (const l of r.levelUps) toast.success(`Level ${l.level}: ${l.title}`)
            for (const b of r.badges) toast.success(`Badge earned: ${b.title}`)
        }).catch(() => toast.error("Could not save that. Check your connection."))
    }, [incident.slug, signedIn])
    const derived = useMemo(() => derive(incident, progress), [incident, progress])
    const value = useMemo(() => ({ progress, derived, dispatch }), [progress, derived, dispatch])
    return <ProgressCtx.Provider value={value}>{children}</ProgressCtx.Provider>
}

export function useProgress(): Ctx {
    const c = useContext(ProgressCtx)
    if (!c) throw new Error("useProgress must be used inside CaseProgressProvider")
    return c
}
