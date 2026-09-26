import { Resend } from "resend"
import { heading, paragraph, primaryButton, resolveFromAddress, shell } from "./index"

/*
 * "You have a new message" (plan/inbox IN-7), sent by either app. The caller
 * decides when (at most one per thread per hour, stamped in the database) and
 * to whom; this only renders and sends. Best-effort: a failed send is logged
 * and never fails the message.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export async function sendNewMessageEmail(input: {
    to: string[]
    fromName: string
    about: string
    preview: string
    url: string
    brand: "ShipItHQ" | "ShipItHQ Hiring"
}): Promise<number> {
    const key = process.env.RESEND_API_KEY
    if (!key) {
        console.error("sendNewMessageEmail: RESEND_API_KEY is not set")
        return 0
    }
    const subject = `${input.fromName} sent you a message`
    const preview = input.preview.length > 400 ? `${input.preview.slice(0, 397)}...` : input.preview
    const body = heading(`New message from ${esc(input.fromName)}`)
        + paragraph(`About ${esc(input.about)}:`)
        + paragraph(`<span style="white-space:pre-line">${esc(preview)}</span>`)
        + primaryButton("Reply in your inbox", input.url)
    const resend = new Resend(key)
    let sent = 0
    for (const to of [...new Set(input.to)]) {
        try {
            const r = await resend.emails.send({ from: resolveFromAddress(), to, subject, html: shell({ title: subject, body, brand: input.brand, preheader: preview.slice(0, 120) }) })
            if (r.error) console.error("sendNewMessageEmail:", r.error.message)
            else sent++
        } catch (error: unknown) {
            console.error("sendNewMessageEmail:", error instanceof Error ? error.message : error)
        }
    }
    return sent
}

/** "New results for <role>" (plan/hiring-rounds HR-25), to each member who can view candidates. */
export async function sendNewResultsEmail(input: { to: string[]; candidateName: string; headline: string; jobTitle: string; scores: string; url: string }): Promise<number> {
    const key = process.env.RESEND_API_KEY
    if (!key) {
        console.error("sendNewResultsEmail: RESEND_API_KEY is not set")
        return 0
    }
    const subject = `${input.candidateName} sent results for ${input.jobTitle}`
    const body = heading(`New results for ${esc(input.jobTitle)}`)
        + paragraph(`<strong>${esc(input.candidateName)}</strong>, ${esc(input.headline)}, cleared the rounds and sent you their results.`)
        + paragraph(esc(input.scores))
        + primaryButton("Review the candidate", input.url)
    const resend = new Resend(key)
    let sent = 0
    for (const to of [...new Set(input.to)]) {
        try {
            const r = await resend.emails.send({ from: resolveFromAddress(), to, subject, html: shell({ title: subject, body, brand: "ShipItHQ Hiring", preheader: input.scores.slice(0, 120) }) })
            if (r.error) console.error("sendNewResultsEmail:", r.error.message)
            else sent++
        } catch (error: unknown) {
            console.error("sendNewResultsEmail:", error instanceof Error ? error.message : error)
        }
    }
    return sent
}

/** A company's decline, with its feedback when there is any (plan/hiring-rounds HR-19). */
export async function sendDeclineEmail(input: { to: string; companyName: string; jobTitle: string; feedback: string | null; url: string }): Promise<boolean> {
    const key = process.env.RESEND_API_KEY
    if (!key) {
        console.error("sendDeclineEmail: RESEND_API_KEY is not set")
        return false
    }
    const subject = `An update from ${input.companyName} on ${input.jobTitle}`
    const body = heading(`${esc(input.companyName)} won't be moving forward`)
        + paragraph(`Thank you for sending your results for ${esc(input.jobTitle)}.`)
        + (input.feedback ? paragraph(`Their note to you:`) + paragraph(`<span style="white-space:pre-line">${esc(input.feedback)}</span>`) : "")
        + paragraph("You can retake rounds to improve your results and send again once you have a new attempt.")
        + primaryButton("See your rounds", input.url)
    try {
        const r = await new Resend(key).emails.send({ from: resolveFromAddress(), to: input.to, subject, html: shell({ title: subject, body, brand: "ShipItHQ", preheader: `An update on ${input.jobTitle}` }) })
        if (r.error) { console.error("sendDeclineEmail:", r.error.message); return false }
        return true
    } catch (error: unknown) {
        console.error("sendDeclineEmail:", error instanceof Error ? error.message : error)
        return false
    }
}
