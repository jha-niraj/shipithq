import "server-only"
import { Resend } from "resend"
import { heading, paragraph, primaryButton, resolveFromAddress, shell } from "@repo/email"

/*
 * The email a claimant gets when an admin decides their claim on a company page
 * (plan/hiring-rounds HR-8). Best-effort: a failed send is logged and never
 * undoes the decision.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export async function sendCompanyClaimEmail(to: string, input:
    | { kind: "approved"; companyName: string; url: string }
    | { kind: "rejected"; companyName: string; reason: string; url: string },
): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        console.error("sendCompanyClaimEmail: RESEND_API_KEY is not set")
        return
    }
    const approved = input.kind === "approved"
    const subject = approved ? `You're the Owner of ${input.companyName} on ShipItHQ` : `About your claim for ${input.companyName}`
    const body = approved
        ? heading(`${esc(input.companyName)} is yours`)
            + paragraph(`Your claim is approved. You're the Owner of ${esc(input.companyName)}'s page, which is now verified. Sign in to edit it, invite your team and start hiring.`)
            + primaryButton("Open your workspace", input.url)
        : heading("Your claim wasn't approved")
            + paragraph(`We couldn't confirm your claim for ${esc(input.companyName)}: ${esc(input.reason)}`)
            + paragraph("You can claim it again with more detail, for example your LinkedIn profile.")
            + primaryButton("Claim again", input.url)
    try {
        const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: resolveFromAddress(),
            to,
            subject,
            html: shell({ title: subject, body, brand: "ShipItHQ Hiring", preheader: approved ? "Your company page is verified." : "We couldn't confirm your claim." }),
        })
        if (result.error) console.error("sendCompanyClaimEmail:", result.error.message)
    } catch (error: unknown) {
        console.error("sendCompanyClaimEmail:", error instanceof Error ? error.message : error)
    }
}
