/*
 * A layered layout for incident diagrams (plan/incidents INC-62): place boxes in columns
 * by their depth along the links (the browser left, the database right) and rows by their
 * order in the list, so an author writes the parts and the links, not coordinates. A part
 * with its own `x`/`y` keeps them; `col`/`row` pin a part to a column or row.
 */

export interface LayoutNode { id: string; x?: number; y?: number; w?: number; h?: number; col?: number; row?: number }
export interface LayoutLink { from: string; to: string }
export interface Placed { x: number; y: number; w: number; h: number }

export interface LayoutOptions {
    w?: number
    h?: number
    /** Space between columns and between rows. */
    gapX?: number
    gapY?: number
}

/**
 * Columns by the longest path from a part with nothing coming in (cycles are broken by
 * visiting each part once); rows by order within a column; each column centred vertically
 * against the tallest one.
 */
export function layered(nodes: LayoutNode[], links: LayoutLink[], opts: LayoutOptions = {}): { placed: Map<string, Placed>; width: number; height: number } {
    const W = opts.w ?? 150
    const H = opts.h ?? 56
    const GX = opts.gapX ?? 70
    const GY = opts.gapY ?? 28
    const ids = new Set(nodes.map((n) => n.id))
    const out = new Map<string, string[]>()
    const indeg = new Map<string, number>()
    nodes.forEach((n) => { out.set(n.id, []); indeg.set(n.id, 0) })
    links.forEach((l) => {
        if (!ids.has(l.from) || !ids.has(l.to) || l.from === l.to) return
        out.get(l.from)!.push(l.to)
        indeg.set(l.to, (indeg.get(l.to) ?? 0) + 1)
    })

    // Longest-path depth, walking from the roots; a cycle stops at a part already seen on the path.
    const depth = new Map<string, number>()
    const visit = (id: string, d: number, path: Set<string>) => {
        if (path.has(id)) return
        if ((depth.get(id) ?? -1) >= d) return
        depth.set(id, d)
        path.add(id)
        out.get(id)!.forEach((next) => visit(next, d + 1, path))
        path.delete(id)
    }
    const roots = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0)
    ;(roots.length ? roots : nodes.slice(0, 1)).forEach((r) => visit(r.id, 0, new Set()))
    // Parts only reachable around a cycle (open <-> counting): ranked from the first listed.
    nodes.forEach((n) => { if (!depth.has(n.id)) visit(n.id, 0, new Set()) })

    const col = (n: LayoutNode) => n.col ?? depth.get(n.id)!
    const columns = new Map<number, LayoutNode[]>()
    nodes.forEach((n) => columns.set(col(n), [...(columns.get(col(n)) ?? []), n]))
    columns.forEach((list) => list.sort((a, b) => (a.row ?? Infinity) - (b.row ?? Infinity) || nodes.indexOf(a) - nodes.indexOf(b)))
    const tallest = Math.max(1, ...[...columns.values()].map((l) => l.length))
    const height = tallest * H + (tallest - 1) * GY

    const placed = new Map<string, Placed>()
    columns.forEach((list, c) => {
        const colHeight = list.length * H + (list.length - 1) * GY
        // A column with pinned rows lines up with the grid's rows; otherwise it is centred.
        const top = list.some((n) => n.row !== undefined) ? 0 : (height - colHeight) / 2
        list.forEach((n, i) => {
            const w = n.w ?? W, h = n.h ?? H
            placed.set(n.id, {
                x: n.x ?? c * (W + GX) + (W - w) / 2,
                y: n.y ?? top + (n.row ?? i) * (H + GY) + (H - h) / 2,
                w, h,
            })
        })
    })
    let width = 0, maxY = 0
    placed.forEach((p) => { width = Math.max(width, p.x + p.w); maxY = Math.max(maxY, p.y + p.h) })
    return { placed, width, height: Math.max(height, maxY) }
}

type Box = Placed
const cx = (b: Box) => b.x + b.w / 2
const cy = (b: Box) => b.y + b.h / 2

/** The point on a box's border facing another box. */
export function anchor(a: Box, b: Box): { x: number; y: number } {
    const dx = cx(b) - cx(a)
    const dy = cy(b) - cy(a)
    if (Math.abs(dx) * a.h > Math.abs(dy) * a.w) return { x: dx > 0 ? a.x + a.w : a.x, y: cy(a) }
    return { x: cx(a), y: dy > 0 ? a.y + a.h : a.y }
}

/**
 * The path between two boxes: straight when they line up, otherwise one elbow, and where
 * its label sits (beside the middle stretch, never on the line).
 */
export function connector(a: Box, b: Box, place: "middle" | "source" = "middle"): { d: string; label: { x: number; y: number; anchor: "start" | "middle" } } {
    const p = anchor(a, b)
    const q = anchor(b, a)
    const midX = (p.x + q.x) / 2
    const midY = (p.y + q.y) / 2
    const straight = Math.abs(p.y - q.y) < 2 || Math.abs(p.x - q.x) < 2
    const sideways = p.x === a.x || p.x === a.x + a.w
    const d = straight
        ? `M${p.x} ${p.y} L${q.x} ${q.y}`
        : sideways
            ? `M${p.x} ${p.y} L${midX} ${p.y} L${midX} ${q.y} L${q.x} ${q.y}`
            : `M${p.x} ${p.y} L${p.x} ${midY} L${q.x} ${midY} L${q.x} ${q.y}`
    // "middle": beside the middle stretch (flowcharts, positioned by hand for it, INC-46).
    // "source": beside the FIRST stretch, next to where the link leaves, so it never runs into
    // the box, ring or group outline at the far end (system maps; Niraj, 2026-09-30).
    if (place === "middle") {
        const vertical = straight ? Math.abs(p.x - q.x) < 2 : sideways
        const label = vertical
            ? { x: (straight ? p.x : midX) + 9, y: midY + 4, anchor: "start" as const }
            : { x: midX, y: (straight ? p.y : midY) - 8, anchor: "middle" as const }
        return { d, label }
    }
    let label: { x: number; y: number; anchor: "start" | "middle" }
    if (straight && Math.abs(p.y - q.y) < 2) label = { x: midX, y: p.y - 8, anchor: "middle" }
    else if (straight) label = { x: p.x + 9, y: midY + 4, anchor: "start" }
    else if (sideways) label = q.x >= p.x ? { x: p.x + 8, y: p.y - 8, anchor: "start" } : { x: midX + 8, y: p.y - 8, anchor: "start" }
    else label = { x: p.x + 9, y: (p.y + midY) / 2 + 4, anchor: "start" }
    return { d, label }
}


type Side = "left" | "right" | "top" | "bottom"

/**
 * The side of `a` that faces `b`, for maps laid out in columns (INC-63): a box in another
 * column is joined from the side, whatever the boxes' shape, so wide boxes don't send every
 * link out of their top or bottom.
 */
export function sideFacing(a: Box, b: Box): Side {
    const dx = cx(b) - cx(a), dy = cy(b) - cy(a)
    if (Math.abs(dx) >= (a.w + b.w) / 2) return dx > 0 ? "right" : "left"
    return dy > 0 ? "bottom" : "top"
}

function pointOn(b: Box, side: Side, offset: number): { x: number; y: number } {
    if (side === "left") return { x: b.x, y: cy(b) + offset }
    if (side === "right") return { x: b.x + b.w, y: cy(b) + offset }
    if (side === "top") return { x: cx(b) + offset, y: b.y }
    return { x: cx(b) + offset, y: b.y + b.h }
}

/**
 * Links for a map, with their ends spread: when several links meet the same side of a box,
 * each gets its own point along that side, so no two arrows share a tip.
 */
export function mapConnectors(links: { from: string; to: string }[], placed: Map<string, Box>): ({ d: string; label: { x: number; y: number; anchor: "start" | "middle" | "end" } } | null)[] {
    const ends: { node: string; side: Side; link: number; end: "a" | "b"; toward: number }[] = []
    links.forEach((l, i) => {
        const a = placed.get(l.from), b = placed.get(l.to)
        if (!a || !b) return
        const sa = sideFacing(a, b), sb = sideFacing(b, a)
        ends.push({ node: l.from, side: sa, link: i, end: "a", toward: sa === "left" || sa === "right" ? cy(b) : cx(b) })
        ends.push({ node: l.to, side: sb, link: i, end: "b", toward: sb === "left" || sb === "right" ? cy(a) : cx(a) })
    })
    const offset = new Map<string, number>()
    const groups = new Map<string, typeof ends>()
    ends.forEach((e) => groups.set(`${e.node}|${e.side}`, [...(groups.get(`${e.node}|${e.side}`) ?? []), e]))
    groups.forEach((g) => {
        // Ordered by where the other end is, so the spread doesn't cross itself.
        g.sort((p, q) => p.toward - q.toward)
        g.forEach((e, k) => offset.set(`${e.link}${e.end}`, (k - (g.length - 1) / 2) * 12))
    })
    return links.map((l, i) => {
        const a = placed.get(l.from), b = placed.get(l.to)
        if (!a || !b) return null
        const sa = sideFacing(a, b), sb = sideFacing(b, a)
        const p = pointOn(a, sa, offset.get(`${i}a`) ?? 0)
        const q = pointOn(b, sb, offset.get(`${i}b`) ?? 0)
        const horizontal = sa === "left" || sa === "right"
        let d: string
        if (Math.abs(p.y - q.y) < 1 || Math.abs(p.x - q.x) < 1) d = `M${p.x} ${p.y} L${q.x} ${q.y}`
        else if (horizontal && (sb === "left" || sb === "right")) { const m = (p.x + q.x) / 2; d = `M${p.x} ${p.y} L${m} ${p.y} L${m} ${q.y} L${q.x} ${q.y}` }
        else if (horizontal) d = `M${p.x} ${p.y} L${q.x} ${p.y} L${q.x} ${q.y}`
        else if (sb === "top" || sb === "bottom") { const m = (p.y + q.y) / 2; d = `M${p.x} ${p.y} L${p.x} ${m} L${q.x} ${m} L${q.x} ${q.y}` }
        else d = `M${p.x} ${p.y} L${p.x} ${q.y} L${q.x} ${q.y}`
        // The label beside the first stretch, next to where the link leaves.
        const label: { x: number; y: number; anchor: "start" | "middle" | "end" } = horizontal
            ? (q.x >= p.x ? { x: p.x + 8, y: p.y - 7, anchor: "start" } : { x: p.x - 8, y: p.y - 7, anchor: "end" })
            : { x: p.x + 8, y: (p.y + (Math.abs(p.y - q.y) < 1 ? q.y : (p.y + q.y) / 2)) / 2 + 4, anchor: "start" }
        return { d, label }
    })
}
