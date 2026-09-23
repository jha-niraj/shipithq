// Server-renders the practice list card and the mentor memory tabs
// (plan/practice-ui UI-8, UI-9, UI-10; plan/practice-dsa PD-15). Run like the
// other practice checks.
import * as React from "react"
import { renderToString } from "react-dom/server"
;(globalThis as { React?: typeof React }).React = React
const { ModuleContent } = await import("@/app/(main)/practice/_components/module-content")
const { MemoryTabs } = await import("@/app/(main)/practice/memory/_components/memory-tabs")
const { PracticeTabs } = await import("@/app/(main)/practice/_components/practice-tabs")

let pass = 0, fail = 0
const check = (name: string, ok: boolean) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`) }

const problems = Array.from({ length: 75 }, (_, i) => ({
    id: `p${i}`, slug: `problem-${i}`, title: `Problem ${i}`, module: "DSA" as const,
    category: "arrays-hashing", difficulty: i % 3 === 0 ? "EASY" : i % 3 === 1 ? "MEDIUM" : "HARD",
    tags: ["array"], sortOrder: i, judgeStatus: "ready" as const, userStatus: null,
})) as never[]
const categories = [{ slug: "arrays-hashing", name: "Arrays & Hashing", problemCount: 75, completedCount: 0, inProgressCount: 0 }] as never[]

const withPath = renderToString(
    <ModuleContent
        module="DSA" moduleLabel="Data Structures & Algorithms" problems={problems} categories={categories}
        leaderboard={[]} activeCategory={null} canPlan
        path={[{ topic: "Arrays & Hashing", goal: "Spot when a hash map replaces a second loop", slugs: ["problem-1", "problem-2", "problem-3"], checkpoint: { quiz: { status: "todo" }, mock: { status: "todo" }, exam: { status: "todo" }, examSlug: "problem-3" } }] as never}
    />,
)
check("the page opens with the module heading, not a summary card", withPath.indexOf("Data Structures &amp; Algorithms") < withPath.indexOf(">Path<") && !withPath.includes("WHERE YOU STAND"))
check("Path and All are both offered", withPath.includes(">Path<") && withPath.includes(">All<"))
/** Is the tab whose label is `label` the selected one? */
const tabIsActive = (html: string, label: string) => {
    const at = html.indexOf(`>${label}</span>`)
    if (at === -1) return false
    const button = html.lastIndexOf("<button", at)
    return html.slice(button, at).includes('data-state="active"')
}
check("Path opens selected when there is a stored path", tabIsActive(withPath, "Path"))
check("the stage shows its topic and goal", withPath.includes("Arrays &amp; Hashing") && withPath.includes("Spot when a hash map replaces a second loop"))
check("the stage lists its checkpoint's three parts", withPath.includes(">Quiz<") && withPath.includes(">Mock interview<") && withPath.includes(">Timed problem<"))
check("next up names one problem", withPath.includes("Next up"))
check("the page opens on the current stage, expanded", withPath.includes("Checkpoint"))
check("the list is inside a scroll area, and the page is one screen", withPath.includes("data-radix-scroll-area-viewport") && withPath.includes("lg:h-[var(--page-h,100vh)]"))

const noPath = renderToString(
    <ModuleContent
        module="DSA" moduleLabel="Data Structures & Algorithms" problems={problems} categories={categories}
        leaderboard={[]} activeCategory={null} canPlan={false} path={[]}
    />,
)
check("with no path stored, All is the open tab", tabIsActive(noPath, "All") && !tabIsActive(noPath, "Path"))

const modules = [
    { module: "DSA" as const, label: "DSA", onboardingKey: "practice:dsa" as const, profile: { concepts: [], mistakes: [] }, completed: null, inProgress: null },
    { module: "SYSTEM_DESIGN" as const, label: "System Design", onboardingKey: "practice:system-design" as const, profile: { concepts: [], mistakes: [] }, completed: null, inProgress: null },
    { module: "WEB_FRONTEND" as const, label: "Frontend", onboardingKey: "practice:web-frontend" as const, profile: { concepts: [], mistakes: [] }, completed: null, inProgress: null },
    { module: "WEB_BACKEND" as const, label: "Backend", onboardingKey: "practice:web-backend" as const, profile: { concepts: [], mistakes: [] }, completed: null, inProgress: null },
]
const memory = renderToString(<MemoryTabs modules={modules} />)
check("memory has a tab per sub-module", ["DSA", "System Design", "Frontend", "Backend"].every((l) => memory.includes(`>${l}<`)))
check("a module with no onboarding says how to get one", memory.includes("No read on where you stand"))
check("an empty memory says what fills it, per module", memory.includes("Nothing is written here until you solve a problem with the mentor"))

// The tabs live in the page header now (PJ-3), so they own no row of their own.
const tabs = renderToString(<PracticeTabs />)
check("the tabs no longer own a row above the page", !tabs.includes("h-12") && !tabs.includes("h-14") && !tabs.includes("px-page"))
check("the module page's header carries the tabs beside the title", withPath.indexOf("Data Structures &amp; Algorithms") < withPath.indexOf(">Mentor memory<"))

// Topics: a dropdown of checkboxes on the filter line, not a field of chips (2026-09-22)
const manyTopics = [
    { slug: "arrays-hashing", name: "Arrays & Hashing", problemCount: 5, completedCount: 0, inProgressCount: 0 },
    { slug: "graphs", name: "Graphs", problemCount: 5, completedCount: 0, inProgressCount: 0 },
    { slug: "trees", name: "Trees", problemCount: 5, completedCount: 0, inProgressCount: 0 },
] as never[]
const filters = renderToString(
    <ModuleContent
        module="DSA" moduleLabel="Data Structures & Algorithms" problems={problems} categories={manyTopics}
        leaderboard={[]} activeCategory={null} canPlan={false} path={[]}
    />,
)
check("topics collapse into one control on the filter line", filters.includes(">All topics<") && !/rounded-full border[^"]*"[^>]*>\s*Graphs/.test(filters))
check("the topic control sits beside search and difficulty", filters.indexOf("Search by title or tag") < filters.indexOf(">All topics<") && filters.indexOf(">All topics<") < filters.indexOf(">Hard<"))
const preselected = renderToString(
    <ModuleContent
        module="DSA" moduleLabel="Data Structures & Algorithms" problems={problems} categories={manyTopics}
        leaderboard={[]} activeCategory="graphs,trees" canPlan={false} path={[]}
    />,
)
check("a topic in the URL opens selected", preselected.includes(">2 topics<"))

const { OnboardingWidget } = await import("@/components/onboarding/onboarding-widget")
const completedRun = {
    id: "r1", moduleKey: "practice:dsa", status: "completed", turns: [], openQuestionCount: 0,
    profile: { level: "developing", facts: ["You have solved 11 to 50 problems.", "You solve problems in C++."], strengths: ["Brute force solutions"], gaps: ["Optimizing solutions"], goals: ["Prepare for campus placements"], summary: ["a", "b", "c"] },
    level: "developing", startedAt: "", completedAt: "", updatedAt: "",
} as never
const widget = renderToString(<OnboardingWidget moduleKey="practice:dsa" completed={completedRun} inProgress={null} />)
// `plain` strips the comment markers React server-rendering puts between text nodes.
const plain = widget.replace(/<!-- -->/g, "")
check("what you told us is a sheet trigger with a count, not an inline dump", plain.includes("What you told us") && plain.includes("(5)") && !plain.includes("Prepare for campus placements"))
console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
