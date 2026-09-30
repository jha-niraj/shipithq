/**
 * Checks every incident case's diagrams against themselves (plan/incidents INC-73): each
 * narration focus names a real part, every link and message joins real parts, every check
 * answer is on its figure, every source exists. Pure: no browser, no database.
 *
 *   npx tsx scripts/check-incident-diagrams.ts             (from apps/main)
 *   npx tsx scripts/check-incident-diagrams.ts --planted   (plants a bad id; must fail)
 *
 * Exits 1 on any problem.
 */
import { INCIDENT_CASES } from "../content/incidents/cases"
import type { ChapterBlock, IncidentCase } from "../content/incidents/types"

const problems: string[] = []
const bad = (where: string, what: string) => problems.push(`${where}: ${what}`)

/** The parts a block's `focus` can name, by block kind. */
function partsOf(b: ChapterBlock, c: IncidentCase): Set<string> | null {
    switch (b.kind) {
        case "flow": return new Set(b.flow.nodes.map((n) => n.id))
        case "sequence": return new Set([...b.sequence.actors.map((a) => a.id), ...b.sequence.messages.map((m) => m.id), "cut"])
        case "timeline": return new Set([...b.timeline.events.map((e) => e.id), ...(b.timeline.spans ?? []).map((s) => s.id)])
        case "dashboard": return new Set([...b.dashboard.series.map((s) => s.id), ...(b.dashboard.markers ?? []).map((m) => m.id)])
        case "causes": return new Set([b.causes.symptom.id, b.causes.trigger.id, ...b.causes.contributing.map((x) => x.id), ...b.causes.latent.map((x) => x.id)])
        case "states": return new Set(b.states.states.map((s) => s.id))
        case "map-change": return new Set([...(c.system?.nodes ?? []).map((n) => n.id), ...(c.system?.after?.added ?? []).map((n) => n.id)])
        case "roles": return new Set(["severity", ...b.roles.roles.map((r) => r.role)])
        case "status": return new Set(b.status.updates.map((u) => u.state))
        case "runbook": return new Set(b.steps.map((_, i) => String(i + 1)))
        case "see": return new Set(b.lines.map((_, i) => String(i)))
        case "compare": return new Set(b.rows.map((r) => r.label))
        default: return null
    }
}

function checkCase(c: IncidentCase) {
    const sources = new Set(Object.keys(c.sources))
    const mapIds = new Set((c.system?.nodes ?? []).map((n) => n.id))
    const chapters = c.chapters ?? []

    // The map: links, groups, the incident, the chapters it lights, the fix.
    if (c.system) {
        const s = c.system
        const groups = new Set((s.groups ?? []).map((g) => g.id))
        s.nodes.forEach((n) => { if (n.group && !groups.has(n.group)) bad(`${c.slug} map`, `node ${n.id} is in unknown group ${n.group}`) })
        s.links.forEach((l) => { if (!mapIds.has(l.from) || !mapIds.has(l.to)) bad(`${c.slug} map`, `link ${l.from} -> ${l.to} joins an unknown part`) })
        ;[...(s.incident?.broken ?? []), ...(s.incident?.blast ?? [])].forEach((id) => { if (!mapIds.has(id)) bad(`${c.slug} map`, `incident names unknown part ${id}`) })
        Object.entries(s.chapters ?? {}).forEach(([ch, parts]) => {
            if (!chapters.some((x) => x.id === ch)) bad(`${c.slug} map`, `lights parts for unknown chapter ${ch}`)
            parts.forEach((p) => { if (!mapIds.has(p)) bad(`${c.slug} map`, `chapter ${ch} lights unknown part ${p}`) })
        })
        if (s.after) {
            const after = new Set([...mapIds, ...(s.after.added ?? []).map((n) => n.id)])
            ;[...(s.after.addedLinks ?? []), ...(s.after.removedLinks ?? [])].forEach((l) => { if (!after.has(l.from) || !after.has(l.to)) bad(`${c.slug} fix`, `link ${l.from} -> ${l.to} joins an unknown part`) })
            ;[...(s.after.removed ?? []), ...(s.after.changed ?? []), ...Object.keys(s.after.notes ?? {}), ...Object.keys(s.after.move ?? {})].forEach((id) => { if (!after.has(id)) bad(`${c.slug} fix`, `names unknown part ${id}`) })
        }
    }

    for (const ch of chapters) {
        const where = `${c.slug} / ${ch.id}`
        const blocks = new Map<string, ChapterBlock>()
        ch.blocks.forEach((b, i) => { if (b.kind !== "say") blocks.set(("id" in b && b.id) || `b${i}`, b) })

        // Every focus: a block of this chapter (or the pinned map), and a part of it.
        ch.blocks.forEach((b) => {
            if (b.kind !== "say" || !b.focus) return
            const [block, ...rest] = b.focus.split(":")
            const part = rest.join(":")
            if (block === "map") {
                if (!c.system) bad(where, `focus ${b.focus}: the case has no map`)
                else if (part && !mapIds.has(part)) bad(where, `focus ${b.focus}: no such part on the map`)
                return
            }
            const target = blocks.get(block!)
            if (!target) return bad(where, `focus ${b.focus}: no block ${block}`)
            const parts = partsOf(target, c)
            if (part && parts && !parts.has(part)) bad(where, `focus ${b.focus}: ${target.kind} has no part ${part}`)
        })

        // Each diagram joins only its own parts.
        for (const [id, b] of blocks) {
            if (b.kind === "sequence") {
                const actors = new Set(b.sequence.actors.map((a) => a.id))
                b.sequence.messages.forEach((m) => { if (!actors.has(m.from) || !actors.has(m.to)) bad(`${where} / ${id}`, `message ${m.id} joins an unknown actor`) })
            }
            if (b.kind === "timeline") {
                const events = new Set(b.timeline.events.map((e) => e.id))
                ;(b.timeline.spans ?? []).forEach((s) => { if (!events.has(s.from) || !events.has(s.to)) bad(`${where} / ${id}`, `span ${s.id} names an unknown event`) })
            }
            if (b.kind === "states") {
                const states = new Set(b.states.states.map((s) => s.id))
                b.states.transitions.forEach((t) => { if (!states.has(t.from) || !states.has(t.to)) bad(`${where} / ${id}`, `transition ${t.from} -> ${t.to} names an unknown state`) })
                if (b.states.stuck && !states.has(b.states.stuck)) bad(`${where} / ${id}`, `stuck state ${b.states.stuck} is unknown`)
            }
            if (b.kind === "flow") {
                const nodes = new Set(b.flow.nodes.map((n) => n.id))
                b.flow.edges.forEach((e) => { if (!nodes.has(e.from) || !nodes.has(e.to)) bad(`${where} / ${id}`, `edge ${e.from} -> ${e.to} joins an unknown node`) })
            }
            if (b.kind === "map-change" && !c.system?.after) bad(`${where} / ${id}`, "a before/after block, but the map has no fix")
            if (b.kind === "roles") b.roles.sources.forEach((s) => { if (!sources.has(s.source)) bad(`${where} / ${id}`, `unknown source ${s.source}`) })
        }

        // Checks on a figure: the parts are on it, and the answer is among the parts.
        for (const q of ch.check ?? []) {
            if (q.kind !== "pick") continue
            const ids = new Set(q.parts.map((p) => p.id))
            if (q.figure === "map") q.parts.forEach((p) => { if (!mapIds.has(p.id)) bad(`${where} check ${q.id}`, `part ${p.id} is not on the map`) })
            q.answer.forEach((a) => { if (!ids.has(a)) bad(`${where} check ${q.id}`, `answer ${a} is not one of the parts`) })
            if (!q.answer.length) bad(`${where} check ${q.id}`, "no answer")
        }

        ch.sources.forEach((s) => { if (!sources.has(s.source)) bad(where, `unknown source ${s.source}`) })
    }

    // The postmortem step's points cover every section.
    if (c.postmortem && c.postmortemPoints) {
        for (const [section, points] of Object.entries(c.postmortemPoints)) if (!points.length) bad(`${c.slug} postmortem`, `section ${section} has no points`)
        c.postmortem.sources.forEach((s) => { if (!sources.has(s.source)) bad(`${c.slug} postmortem`, `unknown source ${s.source}`) })
    }
}

const planted = process.argv.includes("--planted")
const all = Object.values(INCIDENT_CASES)
for (const c of all) {
    // --planted: a copy of the first case with one focus pointing nowhere.
    const target = planted && c === all[0]
        ? { ...c, chapters: (c.chapters ?? []).map((ch, i) => (i === 0 ? { ...ch, blocks: [...ch.blocks, { kind: "say" as const, text: "planted", focus: "map:nowhere" }] } : ch)) }
        : c
    checkCase(target)
    console.log(`checked ${c.slug}`)
}
problems.forEach((p) => console.log(`BAD ${p}`))
console.log(problems.length ? `${problems.length} problem(s)` : "ok: every diagram id resolves")
if (problems.length) process.exit(1)
