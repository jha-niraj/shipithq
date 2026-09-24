// Server-renders the projects Explore page's pieces and the shared page header
// (plan/projects, PJ-3, PJ-4 and PJ-19). Run like the other render checks, with
// nav-shims.
import * as React from "react"
import { renderToString } from "react-dom/server"
;(globalThis as { React?: typeof React }).React = React
const { ExploreShell } = await import("@/app/(main)/projects/explore/_components/explore-shell")
const { BrowsePane } = await import("@/app/(main)/projects/explore/_components/browse-pane")
const { PageHeader } = await import("@repo/ui/components/ui/page-header")

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }
const plain = (html: string) => html.replace(/<!-- -->/g, "")

const header = plain(renderToString(<PageHeader title="Practice" subtitle="Sharpen your skills" tabs={<span>TABS</span>} />))
check("the header puts the title before the tabs, in one row", header.indexOf("Practice") < header.indexOf("TABS") && header.includes("sm:flex-row") && header.includes("sm:justify-between"))
check("the subtitle sits under the title", header.indexOf("Practice") < header.indexOf("Sharpen your skills"))

const shell = plain(renderToString(<ExploreShell tab="browse"><div>PANE</div></ExploreShell>))
// PJ-19: Ideas and Community showed the same projects; they are one tab now.
check("explore offers Browse and Mine, and nothing else", ["Browse", "Mine"].every((t) => shell.includes(`>${t}<`)) && !shell.includes(">Ideas<") && !shell.includes(">Community<"))
check("each tab is a link carrying its tab in the URL", shell.includes("/projects/explore?tab=browse") && shell.includes("/projects/explore?tab=mine"))
check("the open tab is marked", /data-state="active"|aria-current/.test(shell))
// PJ-8: the header stays put while the grid scrolls under it, which needs a
// surface of its own - the page background is transparent over the backdrop.
check("the header is a sticky band", shell.includes("sticky top-0 z-20"))
check("with something opaque behind it", /bg-white\/8\d/.test(shell) && shell.includes("backdrop-blur"))
check("the band carries the page padding, not the column", shell.includes("px-page py-3"))

const rows = [
    // A curated project, a learner's project, and an idea with no project yet:
    // the card has to read in all three (plan/projects, PJ-8, PJ-19).
    { id: "a", kind: "project", title: "Habit tracker", description: "Track habits and review weekly.", difficulty: "BEGINNER", technologies: ["react", "typescript"], categories: ["web", "productivity"], slug: "habit-tracker", madeBy: "shipithq", author: null, estimatedHours: 20, outcomes: ["Weekly roll-ups", "Local storage"], sprintCount: 4, taskCount: 18, started: 3 },
    { id: "c", kind: "project", title: "Recipe box", description: "Save recipes.", difficulty: "INTERMEDIATE", technologies: ["next"], categories: [], slug: "recipe-box-1a2b", madeBy: "community", author: { name: "Asha", username: "asha" }, estimatedHours: 12, outcomes: [], sprintCount: 3, taskCount: 12, started: 1 },
    { id: "b", kind: "idea", title: "Bookmark API", description: "Store links with tags.", difficulty: "INTERMEDIATE", technologies: ["node"], categories: ["backend"], slug: null, madeBy: "shipithq", author: null, estimatedHours: null, outcomes: [], sprintCount: 0, taskCount: 0, started: 0 },
]
const facets = { technologies: ["react", "node"], categories: ["web", "backend"], difficulties: ["BEGINNER", "INTERMEDIATE"] }
const counts = { all: 3, shipithq: 2, community: 1 }
const base = { made: "all", mode: "technology", sort: "recommended" } as const
const byTech = plain(renderToString(<BrowsePane rows={rows as never} facets={facets} counts={counts} filters={base} />))
check("browse filters by who made it, with counts", ["All", "ShipItHQ", "Community"].every((l) => byTech.includes(`>${l}<`)) && byTech.includes("made=community"))
check("a curated card says ShipItHQ made it, a learner's says who", byTech.includes("by ShipItHQ") && byTech.includes("by Asha"))
check("a learner's project is viewed, a curated one is built", byTech.includes("View project") && byTech.includes("Build this"))
check("search is a GET form that keeps the other filters", byTech.includes('role="search"') && byTech.includes('name="q"') && byTech.includes('name="tab" value="browse"'))
check("the pane offers both browse modes", byTech.includes("By stack") && byTech.includes("Problem first"))
check("the mode switch is a link, so it lands in the URL", byTech.includes("mode=problem"))
// The dropdown's own rows are portalled and only exist once opened, so what a
// server render can prove is that each filter has a trigger.
check("every filter has a control", ["Stack", "Difficulty", "Category", "Recommended"].every((l) => byTech.includes(`>${l}<`)))
// PJ-10: these were menu items with `asChild` around a Link, and every one of
// them threw `React.Children.only` on click, taking the page to the error
// boundary. A select has a combobox trigger and cannot do that.
check("each filter is a select, not a menu", (byTech.match(/role="combobox"/g) ?? []).length === 4)
check("each trigger names itself for a screen reader", ["Stack", "Difficulty", "Category"].every((l) => byTech.includes(`aria-label="${l}"`)))
check("the label is in the server HTML, so no blank pill on first paint", !/role="combobox"[^>]*>(<[^>]+>)*<span[^>]*><\/span>/.test(byTech))
check("technology mode shows the stack under a card", byTech.includes("React · Typescript"))

check("a card with a blueprint says how big it is", byTech.includes("4 sprints · 18 tasks · ~20 hours"))
check("and what you will learn from it", byTech.includes("Weekly roll-ups") && byTech.includes("Local storage"))
check("both browse modes are on the card, stack and categories", byTech.includes("React · Typescript") && byTech.includes("Web · Productivity"))
check("a card with a blueprint opens the project", byTech.includes('href="/projects/habit-tracker"'))
check("one without still offers to generate it", byTech.includes("Generate this"))
// The button sits at the END of the column, so three cards in a row line up.
check("the card is a column with the body taking the slack", byTech.includes("flex min-w-0 flex-col") && byTech.includes("flex-1"))

const byProblem = plain(renderToString(<BrowsePane rows={rows as never} facets={facets} counts={counts} filters={{ ...base, mode: "problem", difficulty: "BEGINNER" }} />))
check("problem mode shows the categories instead", byProblem.includes("Web · Productivity"))
check("an applied filter shows its value on the trigger", byProblem.includes(">Easy<"))
check("switching mode keeps the filters already applied", byProblem.includes("difficulty=BEGINNER"))

// The trap that caused it, guarded at the source: our menu items always render
// their own indicator, so `asChild` on one reaches React.Children.only.
const { readFileSync, readdirSync, statSync } = await import("node:fs")
const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
        if (entry === "node_modules" || entry === ".next") return []
        const full = `${dir}/${entry}`
        return statSync(full).isDirectory() ? walk(full) : full.endsWith(".tsx") ? [full] : []
    })
const offenders = walk("app").concat(walk("components")).filter((file) => {
    // Comments stripped first: the note explaining this trap quotes the broken
    // markup, and a guard that trips on its own explanation is no guard.
    const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    return /<DropdownMenu(CheckboxItem|RadioItem)[^>]*\basChild\b/.test(src)
})
check("no menu item wraps a child with asChild anywhere in the app", offenders.length === 0, offenders.join(", "))

// PJ-9: the Mine pane's own tab strip. It was `<TabsList className="">` with no
// props, which is the bordered card variant at full width with `flex-1`
// triggers - four labels stretched across the page.
const { default: MyProjectsClient } = await import("@/app/(main)/projects/myprojects/_components/MyProjectsClient")
const mine = plain(renderToString(<MyProjectsClient embedded />))
check("the Mine tabs are the shared segmented strip", mine.includes("bg-neutral-100/70") && mine.includes("dark:bg-neutral-800/50"))
// `(?<![-\w])` and not `\b`: `max-w-full` contains "w-full", and a word
// boundary matches inside it, so the naive form never fails.
check("they hug their labels instead of filling the page", mine.includes("w-fit max-w-full") && !/role="tablist"[^>]*class="[^"]*(?<![-\w])w-full\b/.test(mine))
check("all four filters are there", ["All Projects", "In Progress", "Completed", "Submissions"].every((l) => mine.includes(l)))
check("no gray anywhere on the pane", !/class="[^"]*\b(?:text|bg|border)-gray-/.test(mine))

const empty = plain(renderToString(<BrowsePane rows={[]} facets={facets} counts={counts} filters={{ ...base, technology: "react" }} />))
check("no matches explains itself and offers a way out", empty.includes("Nothing matches those filters") && empty.includes("Clear the filters"))
const noCommunity = plain(renderToString(<BrowsePane rows={[]} facets={facets} counts={{ all: 2, shipithq: 2, community: 0 }} filters={{ ...base, made: "community" }} />))
check("an empty community says how a project gets listed", noCommunity.includes("Nothing published by the community yet") && noCommunity.includes("makes a project public"))
console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
