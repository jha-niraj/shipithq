import "server-only"
import { Resend } from "resend"
import { heading, paragraph, primaryButton, resolveFromAddress, shell } from "@repo/email"

/*
 * The one email a student gets about a company they asked for (plan/hiring-rounds
 * HR-7, Niraj 2026-09-25: in-app and email). Sent when the company goes live, or
 * when it is not added, with the reason. Best-effort: a failed send is logged and
 * never undoes the publish or the rejection.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export async function sendCompanyRequestEmail(to: string, input:
    | { kind: "live"; companyName: string; url: string }
    | { kind: "not_added"; companyName: string; reason: string; url: string },
): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        console.error("sendCompanyRequestEmail: RESEND_API_KEY is not set")
        return
    }
    const live = input.kind === "live"
    const subject = live ? `${input.companyName} is on ShipItHQ now` : `About your request for ${input.companyName}`
    const body = live
        ? heading(`${esc(input.companyName)} is on ShipItHQ`)
            + paragraph(`You asked us to add ${esc(input.companyName)}. Its page is live, and you're following it, so you'll hear when it posts roles.`)
            + primaryButton("Open the page", input.url)
        : heading(`We didn't add ${esc(input.companyName)}`)
            + paragraph(`Thanks for asking. We looked at it and didn't add it: ${esc(input.reason)}`)
            + paragraph("You can ask again in 30 days, or request another company any time.")
            + primaryButton("Request a company", input.url)
    try {
        const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: resolveFromAddress(),
            to,
            subject,
            html: shell({ title: subject, body, preheader: live ? "Its page is live, and you're following it." : "We looked at it and didn't add it." }),
        })
        if (result.error) console.error("sendCompanyRequestEmail:", result.error.message)
    } catch (error: unknown) {
        console.error("sendCompanyRequestEmail:", error instanceof Error ? error.message : error)
    }
}
