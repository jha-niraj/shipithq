/**
 * Checks incident simulator scenarios against the outcome each chapter relies on
 * (plan/incidents INC-55, INC-58). Pure: no browser, no database.
 *
 *   npx tsx scripts/check-incident-sims.ts     (from apps/main)
 *
 * Exits 1 if any combination differs. Add a scenario's expectations here when you add one.
 */
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
console.log("bad:", bad)
if (bad) process.exit(1)
