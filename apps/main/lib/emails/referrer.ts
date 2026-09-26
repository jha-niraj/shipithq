import "server-only"
import { Resend } from "resend"
import { heading, otpPanel, paragraph, primaryButton, resolveFromAddress, shell } from "@repo/email"

/*
 * Verified referrals (plan/competition/skillmeet CMP-4): the code that proves an
 * employee works at a company, and the note that a student asked them for a
 * referral. The code must arrive, so its sender says whether it did; the note is
 * best-effort (the Inbox has it too).
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

async function send(to: string, subject: string, body: string, preheader: string): Promise<boolean> {
    if (!process.env.RESEND_API_KEY) {
        console.error("referrer email: RESEND_API_KEY is not set")
        return false
    }
    try {
        const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: resolveFromAddress(),
            to,
            subject,
            html: shell({ title: subject, body, brand: "ShipItHQ", preheader }),
        })
        if (result.error) {
            console.error("referrer email:", result.error.message)
            return false
        }
        return true
    } catch (error: unknown) {
        console.error("referrer email:", error instanceof Error ? error.message : error)
        return false
    }
}

/** The 6-digit code to a company address. */
export function sendReferrerCodeEmail(to: string, input: { code: string; companyName: string }): Promise<boolean> {
    const subject = `Your code to refer for ${input.companyName} on ShipItHQ`
    return send(to, subject,
        heading("Confirm you work here")
        + paragraph(`Someone signed in to ShipItHQ asked to refer students for ${esc(input.companyName)} with this address. Enter this code to confirm it's you.`)
        + otpPanel(input.code, "Referrer code", "Valid for 10 minutes")
        + paragraph("If this wasn't you, ignore this email: nothing happens without the code."),
        "Your code to confirm you work here.")
}

/** A student asked this referrer for a referral. */
export function sendReferralRequestEmail(to: string, input: { companyName: string; jobTitle: string; url: string }): Promise<boolean> {
    const subject = `A student asked you for a referral at ${input.companyName}`
    return send(to, subject,
        heading("A referral request")
        + paragraph(`A student asked for a referral for ${esc(input.jobTitle)} at ${esc(input.companyName)}. Their note, the rounds they cleared and their projects are waiting for you.`)
        + paragraph("Accept or decline when you can; it closes on its own after 14 days.")
        + primaryButton("Open the request", input.url),
        "A student asked you for a referral.")
}
