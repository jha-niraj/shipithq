// Server-renders the onboarding rail (plan/module-onboarding MO-8, MO-10): sentence-case
// headings, the answered list inside a ScrollArea, the editing row, the current-question
// row as the way back. Run like onboarding-edit.ts.
import * as React from "react"
import { renderToString } from "react-dom/server"
;(globalThis as { React?: typeof React }).React = React
const { OnboardingRail } = await import("@/components/onboarding/onboarding-rail")

let pass = 0, fail = 0
const check = (name: string, ok: boolean) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`) }
const turns = Array.from({ length: 10 }, (_, i) => ({
    index: i,
    question: { kind: "single", text: `Question text number ${i + 1}?`, options: ["A", "B"] },
    answer: i < 9 ? { values: ["A"], viaVoice: false } : null,
    askedAt: new Date().toISOString(),
    answeredAt: i < 9 ? new Date().toISOString() : null,
})) as never
const base = { moduleKey: "practice:dsa" as const, turns, questionNumber: 10, finished: false, busy: false, onEdit: () => {}, onReturn: () => {} }

const idle = renderToString(<OnboardingRail {...base} editingIndex={null} />)
check("'Answered so far' is not uppercased", idle.includes(">Answered so far<") && !/uppercase[^"]*">Answered so far/.test(idle))
check("'What happens next' is not uppercased", !/uppercase[^"]*">What happens next/.test(idle))
check("the answered list sits in a ScrollArea", /data-radix-scroll-area-viewport[\s\S]*Question text number 1\?/.test(idle))
check("the rail has its own surface", idle.includes("bg-neutral-50 dark:bg-neutral-900/50"))
const currentRow = idle.slice(idle.lastIndexOf("<button", idle.indexOf(">Question <!-- -->10<")), idle.indexOf(">Question <!-- -->10<"))
check("the current question row is not clickable when not editing", currentRow.includes('disabled=""'))

const editing = renderToString(<OnboardingRail {...base} editingIndex={0} />)
check("the edited row is marked and says Editing", editing.includes('aria-current="step"') && editing.includes(">Editing<"))
check("while editing, the current question row is the way back", editing.includes('title="Back to question 10"'))

const busy = renderToString(<OnboardingRail {...base} editingIndex={null} busy />)
check("rows cannot be picked while a question loads", (busy.match(/disabled=""/g) ?? []).length >= 10)
console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
