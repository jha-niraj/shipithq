import { Resend } from "resend"
import { C, F, eyebrow, heading, paragraph, primaryButton, resolveFromAddress, shell } from "./index"

/*
 * The progress report email (plan/progress PRG-10): the headline numbers, the top three
 * wins, which modules moved, and one button to the full report page. No AI: every line
 * is filled from the stored snapshot. Sent by the worker's scheduled job.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export interface ProgressEmailInput {
    to: string
    name: string | null
    /** "week", "two weeks" or "month". */
    periodWord: string
    /** "Weekly report", as the eyebrow. */
    kindLabel: string
    /** "Sep 21 to Sep 27, 2026". */
    periodLabel: string
    stats: { label: string; value: string; change: string | null }[]
    wins: { title: string; detail: string }[]
    modules: { title: string; line: string }[]
    /** Badges earned in the period (plan/badges BDG-7). */
    badges?: { title: string; detail: string }[]
    reportUrl: string
    settingsUrl: string
    unsubscribeUrl: string
}

function statsTable(stats: ProgressEmailInput["stats"]): string {
    const cells = stats.map((s) => `
        <td valign="top" style="padding:14px 12px;border:1px solid ${C.border};background:${C.card};width:${Math.floor(100 / stats.length)}%;">
            <div style="font-family:${F.mono};font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">${esc(s.label)}</div>
            <div style="font-family:${F.sans};font-size:22px;font-weight:600;color:${C.ink};margin-top:4px;">${esc(s.value)}</div>
            ${s.change ? `<div style="font-family:${F.sans};font-size:11px;color:${C.muted};margin-top:2px;">${esc(s.change)}</div>` : ""}
        </td>`).join("")
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 20px;"><tr>${cells}</tr></table>`
}

function list(title: string, rows: { title: string; detail: string }[]): string {
    if (!rows.length) return ""
    const items = rows.map((r) => `
        <tr><td style="padding:10px 0;border-bottom:1px solid ${C.line};">
            <div style="font-family:${F.sans};font-size:14px;font-weight:600;color:${C.ink};">${esc(r.title)}</div>
            <div style="font-family:${F.sans};font-size:12px;color:${C.muted};margin-top:2px;">${esc(r.detail)}</div>
        </td></tr>`).join("")
    return `${eyebrow(title)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">${items}</table>`
}

export function renderProgressEmail(input: ProgressEmailInput): { subject: string; html: string; text: string } {
    const first = input.name?.split(" ")[0]
    const subject = `Your ${input.periodWord} on ShipItHQ: ${input.stats[0]?.value ?? "0"} ${input.stats[0]?.label.toLowerCase() ?? "XP"}`
    const body = heading(`${first ? `${esc(first)}, here is` : "Here is"} your ${esc(input.periodWord)}`)
        + paragraph(`What you did on ShipItHQ, ${esc(input.periodLabel)}.`)
        + statsTable(input.stats)
        + list("Top wins", input.wins)
        + list("Badges earned", input.badges ?? [])
        + list("Where you worked", input.modules.map((m) => ({ title: m.title, detail: m.line })))
        + primaryButton("Open the full report", input.reportUrl)
        + paragraph(`<span style="font-size:12px;color:${C.muted};">The full report has the charts, every module and everything you did, day by day.</span>`)
    const footerNote = `You get this ${esc(input.kindLabel.toLowerCase())} because progress reports are on. `
        + `<a href="${esc(input.settingsUrl)}" style="color:${C.muted};">Change how often</a> or `
        + `<a href="${esc(input.unsubscribeUrl)}" style="color:${C.muted};">turn them off</a>.`
    const html = shell({ title: subject, eyebrow: `${input.kindLabel} · ${input.periodLabel}`, body, footerNote, preheader: input.stats.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(" · ") })
    const text = [
        `Your ${input.periodWord} on ShipItHQ (${input.periodLabel})`,
        "",
        ...input.stats.map((s) => `${s.label}: ${s.value}${s.change ? ` (${s.change})` : ""}`),
        "",
        ...(input.wins.length ? ["Top wins:", ...input.wins.map((w) => `- ${w.title}`), ""] : []),
        `Full report: ${input.reportUrl}`,
        `Turn reports off: ${input.unsubscribeUrl}`,
    ].join("\n")
    return { subject, html, text }
}

/**
 * Send one report email. Returns false (logged) on any failure, so the job can retry it.
 * The worker passes its key and sender from its own env; elsewhere they come from
 * process.env, as every other email here.
 */
export async function sendProgressEmail(input: ProgressEmailInput, config: { apiKey?: string; from?: string } = {}): Promise<boolean> {
    const key = config.apiKey ?? process.env.RESEND_API_KEY
    if (!key) {
        console.error("sendProgressEmail: RESEND_API_KEY is not set")
        return false
    }
    const { subject, html, text } = renderProgressEmail(input)
    try {
        const r = await new Resend(key).emails.send({
            from: config.from ?? resolveFromAddress(),
            to: input.to,
            subject,
            html,
            text,
            // One-click unsubscribe in the mail client's own UI (RFC 8058).
            headers: { "List-Unsubscribe": `<${input.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        })
        if (r.error) { console.error("sendProgressEmail:", r.error.message); return false }
        return true
    } catch (error: unknown) {
        console.error("sendProgressEmail:", error instanceof Error ? error.message : error)
        return false
    }
}
