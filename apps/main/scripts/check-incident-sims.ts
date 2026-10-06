/**
 * Checks incident simulator scenarios against the outcome each chapter relies on
 * (plan/incidents INC-55, INC-58). Pure: no browser, no database.
 *
 *   npx tsx scripts/check-incident-sims.ts     (from apps/main)
 *
 * Exits 1 if any combination differs. Add a scenario's expectations here when you add one.
 */
import { getIncidentCase } from "../content/incidents/cases"
import { TrafficScenario } from "../components/incidents/sim/schema"
import { runTraffic, verdictFor } from "../components/incidents/sim/traffic-engine"
import { LOGIN_TRAFFIC } from "../content/incidents/sims/login-traffic"
const s = TrafficScenario.parse(LOGIN_TRAFFIC)
const expect: Record<string, { taken: number; lockedOut: number }> = {
  "one/none": { taken: 1, lockedOut: 0 }, "one/email": { taken: 0, lockedOut: 1 }, "one/lock": { taken: 0, lockedOut: 1 }, "one/ip": { taken: 0, lockedOut: 0 }, "one/combined": { taken: 0, lockedOut: 0 },
  "spray/none": { taken: 40, lockedOut: 0 }, "spray/email": { taken: 40, lockedOut: 0 }, "spray/lock": { taken: 40, lockedOut: 0 }, "spray/ip": { taken: 0, lockedOut: 0 }, "spray/combined": { taken: 0, lockedOut: 0 },
  "botnet/none": { taken: 40, lockedOut: 0 }, "botnet/email": { taken: 40, lockedOut: 0 }, "botnet/lock": { taken: 40, lockedOut: 0 }, "botnet/ip": { taken: 40, lockedOut: 0 }, "botnet/combined": { taken: 0, lockedOut: 0 },
}
let bad = 0
for (const attack of ["one", "spray", "botnet"]) for (const defence of ["none", "email", "lock", "ip", "combined"]) {
  const r = runTraffic(s, { attack, defence }); const e = expect[`${attack}/${defence}`]!
  const office = r.byActor["office"]; const ok = r.taken === e.taken && r.lockedOut === e.lockedOut && office?.in === 30
  if (!ok) bad++
  console.log(`${ok ? "ok " : "BAD"} ${attack}/${defence}: taken ${r.taken} (want ${e.taken}), locked out ${r.lockedOut} (want ${e.lockedOut}), office in ${office?.in}/30, stopped ${r.stopped}, checked ${r.checked} | ${verdictFor(s, { attack, defence }).headline}`)
}

// Case three's timeline simulator (plan/long-jobs-vercel LJV-6): each prediction's scenario
// gives the outcome its answer claims, and every combination stays on the timeline.
const exportCase = getIncidentCase("the-export-that-finished-after-it-failed")
const sim = exportCase && "simulate" in exportCase.simulator ? exportCase.simulator : null
const want: Record<string, { verdict: string; end: number }> = {
  "inline-6": { verdict: "killed", end: 300 }, "dial-6": { verdict: "completes", end: 360 }, "dial-14": { verdict: "killed", end: 800 },
  "after-6": { verdict: "completes", end: 360 }, "after-14": { verdict: "killed", end: 800 }, "after-crash": { verdict: "killed", end: 120 },
  "wf-14": { verdict: "completes", end: 840 }, "wf-crash": { verdict: "completes", end: 372 },
}
if (!sim) { bad++; console.log("BAD export case: no timeline simulator") }
else {
  for (const q of exportCase!.predict) {
    const r = sim.simulate(q.scenario); const w = want[q.id]
    const ok = !!w && r.verdict === w.verdict && Math.round(r.end) === w.end
    if (!ok) bad++
    console.log(`${ok ? "ok " : "BAD"} export/${q.id}: ${r.verdict} at ${Math.round(r.end)} s (want ${w ? `${w.verdict} at ${w.end} s` : "an expectation"}) | ${r.headline}`)
  }
  for (const approach of ["inline", "dial", "after", "workflow"]) for (const length of ["4", "6", "14"]) for (const event of ["none", "crash"]) {
    const r = sim.simulate({ approach, length, event })
    const over = r.end > sim.duration || r.lanes.some((l) => l.segments.some((g) => g.to > sim.duration || g.from > g.to))
    if (over) { bad++; console.log(`BAD export ${approach}/${length}/${event}: off the timeline`) }
  }
  console.log("ok  export: all 24 combinations stay on the timeline")
}

// Case four's latency simulator (plan/rag-latency RL-4): each prediction's scenario gives
// the timing its answer claims (seconds to the last word), and every combination stays on
// the 14 s timeline.
const botCase = getIncidentCase("the-bot-that-searched-the-whole-library")
const botSim = botCase && "simulate" in botCase.simulator ? botCase.simulator : null
const botWant: Record<string, number> = { quiet: 9.54, peak: 13.92, rebuilt: 3.72, exact: 3.73, semantic: 0.35, "semantic-new": 3.61, "shard-old": 7, all: 3.58 }
if (!botSim) { bad++; console.log("BAD bot case: no simulator") }
else {
  for (const q of botCase!.predict) {
    const r = botSim.simulate(q.scenario); const w = botWant[q.id]
    const ok = w !== undefined && r.verdict === "completes" && Math.abs(r.end - w) < 0.005
    if (!ok) bad++
    console.log(`${ok ? "ok " : "BAD"} bot/${q.id}: ends at ${r.end} s (want ${w}) | ${r.headline}`)
  }
  let n = 0
  for (const index of ["old", "rebuilt", "hnsw"]) for (const load of ["quiet", "peak"]) for (const cache of ["none", "exact", "semantic"]) for (const store of ["one", "sharded"]) for (const question of ["new", "repeat"]) {
    const r = botSim.simulate({ index, load, cache, store, question }); n++
    const over = r.end > botSim.duration || r.lanes.some((l) => l.segments.some((g) => g.to > botSim.duration || g.from > g.to))
    if (over) { bad++; console.log(`BAD bot ${index}/${load}/${cache}/${store}/${question}: off the timeline`) }
  }
  console.log(`ok  bot: all ${n} combinations stay on the timeline`)
}

console.log("bad:", bad)
if (bad) process.exit(1)
