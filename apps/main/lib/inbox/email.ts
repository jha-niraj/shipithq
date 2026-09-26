import "server-only"
import { inArray } from "drizzle-orm"
import { db, membersWith, users } from "@repo/db"
import { messageEmailTargets } from "@repo/db/inbox"
import { sendNewMessageEmail as send, sendNewResultsEmail } from "@repo/email/messages"

/*
 * A student's reply, emailed to the company's members who can message
 * candidates (plan/inbox IN-7). The hour between emails is enforced by
 * postMessage; this just sends.
 */

const HIRING_URL = process.env.NEXT_PUBLIC_HIRING_URL || "https://hiring.shipithq.com"

export async function sendNewMessageEmail(input: { threadId: string; to: "company"; fromName: string; body: string }): Promise<void> {
    const t = await messageEmailTargets(input.threadId, input.to)
    if (!t || !t.emails.length) return
    await send({ to: t.emails, fromName: input.fromName, about: t.about, preview: input.body, url: `${HIRING_URL}/inbox`, brand: "ShipItHQ Hiring" })
}

/** A new send, emailed to each member who can view candidates (plan/hiring-rounds HR-25). */
export async function emailNewResults(input: { companyId: string; candidateName: string; headline: string; jobTitle: string; scores: string; path: string }): Promise<void> {
    const ids = await membersWith(input.companyId, "view_candidates")
    if (!ids.length) return
    const emails = (await db.select({ email: users.email }).from(users).where(inArray(users.id, ids))).map((u) => u.email)
    await sendNewResultsEmail({ to: emails, candidateName: input.candidateName, headline: input.headline, jobTitle: input.jobTitle, scores: input.scores, url: `${HIRING_URL}${input.path}` })
}
