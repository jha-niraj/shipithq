/*
 * A job posting's text made readable (plan/job-import; Niraj, 2026-09-28): pages come back
 * with hard line breaks inside sentences ("builds scalable APIs, optimizing\n\ndatabases").
 * This joins a line to the one before when it plainly continues it, and keeps headings,
 * bullets and real paragraph breaks. No imports: the worker (on save) and the app (showing
 * older imports) both use it.
 */

const BULLET = /^\s*(?:[•\-*·▪◦]|\d+[.)]|#{1,6}\s)/
const CONTINUES_AFTER = /[,;:/&(\-]$|\b(?:and|or|of|the|a|an|to|in|on|for|with|by|at|from|as|into|across)$/i
const SENTENCE_END = /[.!?:)"]$/

export function unwrapJobText(raw: string): string {
    const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim())
    // Markdown heading marks ("# Software Development Engineer I") dropped: the line stays a
    // heading of its own, without the hashes (Niraj, 2026-09-28).
    const headings = new Set<string>()
    const out: string[] = []
    let fact: string | null = null
    for (const line of lines) {
        if (!line) continue
        // A listing's facts ("- ### Seniority level" then "Entry level") read as "Seniority level: Entry level".
        const label = /^-?\s*#{2,6}\s+(.+)$/.exec(line)
        if (label) { fact = label[1]!.trim(); continue }
        if (fact) { out.push(`${fact}: ${line}`); fact = null; continue }
        const md = /^#{1,6}\s+(.+)$/.exec(line)
        if (md) { const h = md[1]!.replace(/[*_`]/g, "").trim(); headings.add(h); out.push(h); continue }
        const prev = out[out.length - 1]
        const joins = prev !== undefined
            && !BULLET.test(line)
            && !headings.has(prev)
            && (/^[a-z(]/.test(line) || CONTINUES_AFTER.test(prev) || (!SENTENCE_END.test(prev) && /[a-z]$/.test(prev) && /^[a-z0-9]/.test(line)))
        if (joins) out[out.length - 1] = `${prev} ${line}`
        else out.push(line)
    }
    // Blank line before a heading-like line (short, no end punctuation, followed by a bullet),
    // so sections read as sections.
    return out.map((l, i) => {
        const heading = l.length <= 40 && !SENTENCE_END.test(l) && !BULLET.test(l) && i > 0 && BULLET.test(out[i + 1] ?? "")
        return (heading || headings.has(l)) && i > 0 ? `\n${l}` : l
    }).join("\n").trim()
}

/**
 * A posting's title, company and location read without AI (JI-13), for the student to check:
 * LinkedIn's "<Company> hiring <Title> in <Location> | LinkedIn", else "<Title> at <Company>"
 * and a " - <Location>" tail, else the text's first line. Empty where nothing was found.
 */
export function guessJobFacts(pageTitle: string, text: string, companyHint?: string | null): { title: string; company: string; location: string } {
    const raw = (pageTitle ?? "").replace(/\s*\|\s*(LinkedIn|Indeed|Glassdoor|Naukri|Wellfound)[^|]*$/i, "").trim()
    const hiring = /^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+))?$/i.exec(raw)
    let title = "", company = "", location = ""
    if (hiring) {
        company = hiring[1]!.trim(); title = hiring[2]!.trim(); location = (hiring[3] ?? "").trim()
    } else if (/^(careers?|jobs?|home|join us|work with us)\b/i.test(raw)) {
        // A site's generic page title ("Careers | Acme"): the company is after the bar, the
        // role comes from the posting itself below.
        company = raw.split(/\s*\|\s*/)[1]?.trim() ?? ""
    } else if (raw) {
        const [head, tail] = raw.split(/\s+-\s+/, 2)
        const at = /^(.+?)\s+at\s+(.+)$/i.exec(head ?? "")
        title = (at ? at[1] : head)?.trim() ?? ""
        company = at?.[2]?.trim() ?? ""
        location = tail?.trim() ?? ""
    }
    if (!title) title = (unwrapJobText(text).split("\n").find((l) => l.trim()) ?? "").trim()
    if (companyHint) company = companyHint
    const cap = (s: string, n: number) => s.replace(/\s+/g, " ").slice(0, n)
    return { title: cap(title, 120), company: cap(company, 120), location: cap(location, 120) }
}
