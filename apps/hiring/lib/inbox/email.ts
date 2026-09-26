import "server-only"
import { messageEmailTargets } from "@repo/db/inbox"
import { sendNewMessageEmail as send } from "@repo/email/messages"

/*
 * A company's message, emailed to the student (plan/inbox IN-7). The hour
 * between emails is enforced by postMessage; this just sends.
 */

const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL || "https://app.shipithq.com"

export async function sendNewMessageEmail(input: { threadId: string; fromName: string; body: string }): Promise<void> {
    const t = await messageEmailTargets(input.threadId, "student")
    if (!t || !t.emails.length) return
    await send({ to: t.emails, fromName: input.fromName, about: t.about, preview: input.body, url: `${MAIN_URL}/inbox`, brand: "ShipItHQ" })
}
