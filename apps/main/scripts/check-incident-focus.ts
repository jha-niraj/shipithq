/**
 * Checks that every narrated paragraph in every incident case names a part that exists
 * (plan/incidents INC-49, INC-57): a block id, a flow node, a compare row or a see line.
 *
 *   npx tsx scripts/check-incident-focus.ts     (from apps/main)
 */
import { INCIDENT_CASES } from "../content/incidents/cases"

let bad = 0
let total = 0
for (const c of Object.values(INCIDENT_CASES)) {
    for (const ch of c.chapters ?? []) {
        const blocks = new Map(ch.blocks.filter((b) => b.kind !== "say" && b.id).map((b) => [(b as { id: string }).id, b]))
        for (const b of ch.blocks) {
            if (b.kind !== "say") continue
            total++
            const where = `${c.slug} / ${ch.id}`
            if (!b.focus) { console.log(`${where}: no focus: ${b.text.slice(0, 50)}`); bad++; continue }
            const [id, ...rest] = b.focus.split(":")
            const part = rest.join(":")
            const blk = blocks.get(id!)
            if (!blk) { console.log(`${where}: no block "${id}"`); bad++; continue }
            if (!part) continue
            const ok = blk.kind === "flow" ? blk.flow.nodes.some((n) => n.id === part)
                : blk.kind === "compare" ? blk.rows.some((r) => r.label === part)
                : blk.kind === "see" ? Number(part) < blk.lines.length : false
            if (!ok) { console.log(`${where}: no part "${b.focus}"`); bad++ }
        }
        for (const t of ch.terms ?? []) if (!c.glossary?.[t]) { console.log(`${c.slug} / ${ch.id}: term "${t}" not in the glossary`); bad++ }
    }
}
console.log(`paragraphs: ${total}, bad: ${bad}`)
if (bad) process.exit(1)
