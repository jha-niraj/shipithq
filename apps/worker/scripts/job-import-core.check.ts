/**
 * Checks the job import's pure rules (plan/job-import JI-4, JI-5): company names
 * and sites, the plan's strict check, and each round's check. No network, no
 * database. Run: npx tsx scripts/job-import-core.check.ts
 */
const C = await import("../src/jobs/job-import-core.ts")
let pass = 0, fail = 0
const check = (n: string, ok: boolean, d = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? `  (${d})` : ""}`) }

// Company (JI-4)
check("legal suffixes and punctuation drop out of a name", C.normaliseCompanyName("Acme Technologies Pvt. Ltd.") === "acme technologies")
check("& reads as and", C.normaliseCompanyName("Johnson & Johnson") === "johnson and johnson")
check("a page names the company as a whole word", C.pageNamesCompany({ title: "Acme | Payroll", text: "" }, "Acme Inc") && !C.pageNamesCompany({ title: "Acmeville tours", text: "" }, "Acme"))
check("job boards and social hosts are never a company's site", C.notCompanySite("in.linkedin.com") && C.notCompanySite("boards.greenhouse.io") && !C.notCompanySite("acme.io"))
check("the picked site is the first real company host whose page names it", C.pickCompanySite([
    { url: "https://www.glassdoor.co.in/acme", title: "Acme reviews", text: "" },
    { url: "https://acmeville.com", title: "Acmeville", text: "tours" },
    { url: "https://www.acme.io/about", title: "Acme", text: "We build payroll" },
], "Acme") === "acme.io")
check("no result names it: no site", C.pickCompanySite([{ url: "https://other.com", title: "Other", text: "" }], "Acme") === null)

// Plan (JI-5)
const plan = C.validatePlan({
    rounds: [
        { type: "APTITUDE", title: "Aptitude screen", passMark: 140, gate: "HARD", timeLimitMinutes: 5, drawCount: 99, difficulty: "HARD", reason: "Mass hiring screen." },
        { type: "DSA", title: "Coding", passMark: 60, gate: "HARD", timeLimitMinutes: 45, drawCount: 1, reason: "Go services." },
        { type: "VOICE_BEHAVIOURAL", title: "Behavioural", passMark: 60, gate: "HARD", timeLimitMinutes: 20, drawCount: 3, reason: "Ownership." },
    ],
    notPractisable: [{ name: "Take-home assignment", reason: "A 48-hour project." }, { name: "" }],
}, "ENTRY")
check("a valid plan passes", plan.ok)
if (plan.ok) {
    const [a, d, v] = plan.value.rounds
    check("numbers are clamped to the type's bounds", a!.passMark === 90 && a!.timeLimitMinutes === 10 && a!.drawCount === 30 && v!.drawCount === 1)
    check("difficulty only on DSA and design; DSA's from the level when missing", a!.difficulty === null && d!.difficulty === "MEDIUM")
    check("an AI-assessed round is always ADVISORY", v!.gate === "ADVISORY" && d!.gate === "HARD")
    check("rounds we can't run are kept, blank ones dropped", plan.value.notPractisable.length === 1 && plan.value.notPractisable[0]!.name === "Take-home assignment")
}
check("an unknown round type fails the plan (retried by the caller)", !C.validatePlan({ rounds: [{ type: "LLD", title: "x" }] }, "MID").ok)
check("a senior plan loses its aptitude round", (() => { const p = C.validatePlan({ rounds: [{ type: "APTITUDE", title: "a" }, { type: "DSA", title: "c" }] }, "SENIOR"); return p.ok && p.value.rounds.map((x) => x.type).join() === "DSA" })())
check("no rounds fails the plan", !C.validatePlan({ rounds: [] }, "MID").ok)
check("more than six rounds are cut to six", (() => { const p = C.validatePlan({ rounds: Array.from({ length: 9 }, () => ({ type: "DSA", title: "c" })) }, "MID"); return p.ok && p.value.rounds.length === 6 })())

// Rounds (JI-5)
const sent = new Set(["p1", "p2", "p3"])
check("DSA: an id we didn't send is refused", !C.validateDsa({ problemIds: ["p1", "p9"] }, sent).ok)
check("DSA: sent ids pass, deduped", (() => { const r = C.validateDsa({ problemIds: ["p1", "p2", "p1"] }, sent); return r.ok && r.value.problemIds.length === 2 })())
check("DSA: the nearest level with enough problems, and said so", (() => { const n = C.nearestDifficulty("HARD", { EASY: 22, MEDIUM: 49, HARD: 2 }, 4); return n.difficulty === "MEDIUM" && n.nearest })())
check("DSA: the planned level when it has enough", C.nearestDifficulty("EASY", { EASY: 22 }, 4).nearest === false)
const rubric = [{ criterion: "A", weight: 40, lookFor: "a" }, { criterion: "B", weight: 30, lookFor: "b" }, { criterion: "C", weight: 30, lookFor: "c" }]
check("a rubric must sum to 100", C.validateRubric(rubric) !== null && C.validateRubric([...rubric.slice(0, 2), { criterion: "C", weight: 20, lookFor: "c" }]) === null)
check("design: library ids only", !C.validateDesign({ promptIds: ["d9"] }, new Set(["d1"])).ok && C.validateDesign({ promptIds: ["d1"], newPrompt: null }, new Set(["d1"])).ok)
check("design: a new prompt needs a brief and a valid rubric", !C.validateDesign({ promptIds: [], newPrompt: { title: "Design X", prompt: "short", rubric } }, new Set()).ok
    && C.validateDesign({ promptIds: [], newPrompt: { title: "Design X", prompt: "x".repeat(100), rubric } }, new Set()).ok)
check("aptitude: only bank topics are kept", (() => { const r = C.validateAptitude({ sections: ["QUANT", "ART"], difficulties: ["EASY"], topics: ["percentages", "astrology"] }, ["percentages"]); return r.ok && r.value.sections.join() === "QUANT" && r.value.topics.join() === "percentages" })())
check("voice: a short brief fails", !C.validateVoice({ rubric, knowledgeBase: "Ask things." }).ok && C.validateVoice({ rubric, knowledgeBase: "q".repeat(250) }).ok)

// Reported loop in the plan (JI-11)
const ex = { title: "Backend Engineer", company: { name: "Acme", website: null }, level: "MID" as const, location: null, skills: ["Go"], requirements: [], responsibilities: [] }
check("no reports: the plan prompt is unchanged", !C.planUser(ex).includes("REPORTED BY STUDENTS") && C.planUser(ex, null) === C.planUser(ex))
const withLoop = C.planUser(ex, { group: "backend roles, mid level", recent: 5, order: { rounds: ["ONLINE_ASSESSMENT", "DSA", "HR"], count: 3, of: 5 }, rounds: [{ type: "DSA", questions: [{ text: "Two sum", reported: 3 }] }, { type: "HR", questions: [] }] })
check("with reports: the order, its share and counted questions are in the prompt", withLoop.includes("REPORTED BY STUDENTS (backend roles, mid level; 5 reports") && withLoop.includes("Online assessment > Coding (DSA) > HR (in 3 of 5 reports)") && withLoop.includes('"Two sum" (reported 3 times)') && !withLoop.includes("HR: "))
check("the plan rules say how to weigh reports", C.PLAN_SYSTEM.includes("REPORTED BY STUDENTS"))

console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
