/*
 * The posting's text in and out of the review editor (plan/job-import JI-14). The stored
 * text is what the model reads, so it stays plain: a heading is a line of its own after a
 * blank line (as `unwrapJobText` writes it), a bullet is "- item", a numbered item "1. item",
 * and bold is **bold**. The editor shows those as real headings, lists and bold.
 */

import type { JSONContent } from "@tiptap/react"

const BULLET = /^\s*[•\-*·▪◦]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/
const SENTENCE_END = /[.!?:;,)"]$/

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
/** **bold** and the escaped rest. */
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

/** A short line with no end punctuation that isn't a list item or "Label: value": a heading. */
function isHeading(line: string, next: string | undefined) {
    const l = line.trim().replace(/^#{1,6}\s+/, "")
    return l.length > 0 && l.length <= 60 && !SENTENCE_END.test(l) && !BULLET.test(l) && !NUMBERED.test(l) && !/^[^:]{1,40}:\s/.test(l) && next !== undefined
}

/** Stored text to the editor's HTML. */
export function jobTextToHtml(text: string): string {
    const blocks = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)
    const html: string[] = []
    for (const block of blocks) {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean)
        let list: { tag: "ul" | "ol"; items: string[] } | null = null
        const flush = () => {
            if (list) html.push(`<${list.tag}>${list.items.map((i) => `<li><p>${inline(i)}</p></li>`).join("")}</${list.tag}>`)
            list = null
        }
        lines.forEach((line, i) => {
            const md = /^#{1,6}\s+(.+)$/.exec(line)
            if (md || (i === 0 && isHeading(line, lines[1]))) {
                flush()
                html.push(`<h3>${inline((md ? md[1]! : line).replace(/\*\*/g, ""))}</h3>`)
                return
            }
            const tag = BULLET.test(line) ? "ul" : NUMBERED.test(line) ? "ol" : null
            if (tag) {
                if (list?.tag !== tag) { flush(); list = { tag, items: [] } }
                list!.items.push(line.replace(tag === "ul" ? BULLET : NUMBERED, ""))
                return
            }
            flush()
            html.push(`<p>${inline(line)}</p>`)
        })
        flush()
    }
    return html.join("")
}

function inlineText(node: JSONContent): string {
    if (node.type === "text") {
        const bold = node.marks?.some((m) => m.type === "bold")
        return bold && node.text?.trim() ? `**${node.text}**` : node.text ?? ""
    }
    if (node.type === "hardBreak") return "\n"
    return (node.content ?? []).map(inlineText).join("")
}

/** The editor's document back to the stored text. */
export function jobDocToText(doc: JSONContent): string {
    const out: string[] = []
    const walk = (nodes: JSONContent[] | undefined, depth: number) => {
        for (const node of nodes ?? []) {
            if (node.type === "heading") out.push("", inlineText(node).replace(/\*\*/g, "").trim())
            else if (node.type === "bulletList" || node.type === "orderedList") {
                ;(node.content ?? []).forEach((item, i) => {
                    const [first, ...rest] = item.content ?? []
                    const mark = node.type === "orderedList" ? `${i + 1}.` : "-"
                    out.push(`${"  ".repeat(depth)}${mark} ${first ? inlineText(first).trim() : ""}`)
                    walk(rest, depth + 1)
                })
            } else if (node.type === "blockquote") walk(node.content, depth)
            else {
                const t = inlineText(node).trim()
                if (t) out.push(t)
            }
        }
    }
    walk(doc.content, 0)
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}
