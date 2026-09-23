// ─────────────────────────────────────────────────────────────────────────────
// End-to-end check of the ShipItHQ AI chat (plan/ai-chat, AC-9), against a
// DEVELOPMENT database and the real model. Creates two test users, drives the
// real route and server actions as each, and deletes everything it made.
//
//   cd apps/main && SEED_I_KNOW_WHAT_I_AM_DOING=1 node --env-file=.env \
//     --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/css.mjs scripts/practice-checks/ai-chat.ts
// ─────────────────────────────────────────────────────────────────────────────

const createId = () => `e2e${crypto.randomUUID().replace(/-/g, "")}`
import { asc, eq } from "drizzle-orm"
import { db, users, assistantChatSession, assistantChatMessage } from "@repo/db"
import { POST as chatPost } from "@/app/api/ai/chat/route"
import {
    deleteAssistantChat, getAssistantChat, listAssistantChats, setAssistantMessageFeedback,
} from "@/actions/(main)/ai/assistant-chat.action"
import { createFrameParser, type ChatFrame } from "@/lib/ai/protocol"
import { readChartSpec } from "@/components/ai/chat-chart"

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database.")
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => {
    ok ? pass++ : fail++
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`)
}

const alice = createId()
const bob = createId()
const as = (id: string) => { process.env.E2E_USER_ID = id }
for (const [id, name] of [[alice, "Ada Tester"], [bob, "Bob Tester"]] as const) {
    await db.insert(users).values({ id, name, email: `e2e-chat-${id}@shipithq.test`, emailVerified: true, onboardingCompleted: true } as typeof users.$inferInsert)
}

interface Turn { status: number; frames: ChatFrame[]; text: string }

/** POST one turn and read the whole stream. `stopAfterText` cancels once the first
 *  token arrives, the way the panel's stop button does. */
async function turn(body: Record<string, unknown>, stopAfterText = false): Promise<Turn> {
    const res = (await chatPost(new Request("http://x/api/ai/chat", { method: "POST", body: JSON.stringify({ page: { route: "/home", title: "Home" }, tags: [], ...body }) }) as never)) as Response
    if (!res.ok || !res.body) return { status: res.status, frames: [], text: "" }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const parse = createFrameParser()
    const frames: ChatFrame[] = []
    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        for (const f of parse(decoder.decode(value, { stream: true }))) {
            frames.push(f)
            if (stopAfterText && f.t === "text") {
                await reader.cancel()
                return { status: res.status, frames, text: frames.filter((x) => x.t === "text").map((x) => (x as { v: string }).v).join("") }
            }
        }
    }
    const text = frames.filter((x) => x.t === "text").map((x) => (x as { v: string }).v).join("")
    return { status: res.status, frames, text }
}
const frame = <T extends ChatFrame["t"]>(t: Turn, kind: T) => t.frames.find((f) => f.t === kind) as Extract<ChatFrame, { t: T }> | undefined

try {
    // ── A new conversation ────────────────────────────────────────────────────
    as(alice)
    const first = await turn({ content: "Hi. My name is Ada and I am practising graph problems. Reply in one short sentence." })
    const sessionId = frame(first, "session")?.id ?? ""
    check("first turn streams and names its new session", first.status === 200 && !!sessionId && first.text.length > 0, first.text.slice(0, 60))
    check("first frame is the session", first.frames[0]?.t === "session")
    const titleFrame = frame(first, "title")
    check("new conversation gets a short title", !!titleFrame && titleFrame.v.length > 0 && titleFrame.v.length <= 60, titleFrame?.v)
    const done1 = frame(first, "done")
    check("done carries both saved ids", !!done1?.messageId && !!done1?.userMessageId)

    const rows1 = await db.select().from(assistantChatMessage).where(eq(assistantChatMessage.sessionId, sessionId)).orderBy(asc(assistantChatMessage.createdAt))
    check("both turns saved in order", rows1.length === 2 && rows1[0]?.role === "user" && rows1[1]?.role === "assistant", `${rows1.length} rows`)
    check("saved reply matches what streamed", rows1[1]?.content === first.text)

    // ── Context comes from the database, not the client ───────────────────────
    const second = await turn({ sessionId, content: "What is my name? Answer with just the name." })
    check("second turn remembers the first (history loaded server-side)", /ada/i.test(second.text), second.text.slice(0, 60))
    check("second turn does not re-title", !frame(second, "title"))

    // ── Attachments are saved and re-read on later turns ──────────────────────
    const doc = { id: "doc-1", name: "notes.txt", chars: 40, text: "Project notes. The secret word is PLUMBAGO. End of notes." }
    const third = await turn({ sessionId, content: "What is the secret word in the attached document? Just the word.", attachments: [doc] })
    check("attachment reaches the model", /plumbago/i.test(third.text), third.text.slice(0, 60))
    const fourth = await turn({ sessionId, content: "Repeat that secret word once more. Just the word." })
    check("attachment is re-read from the database on a later turn", /plumbago/i.test(fourth.text), fourth.text.slice(0, 60))

    // ── Reading it back ───────────────────────────────────────────────────────
    const loaded = await getAssistantChat(sessionId)
    check("getAssistantChat returns every turn oldest first", loaded.success && loaded.messages.length === 8 && loaded.messages[0]?.role === "user", loaded.success ? `${loaded.messages.length}` : "")
    check("attachment text is not sent to the browser", loaded.success && loaded.messages[4]?.attachments?.[0]?.name === "notes.txt" && loaded.messages[4]?.attachments?.[0]?.text === "")
    const list = await listAssistantChats()
    check("listAssistantChats includes it with its title", list.success && list.sessions.some((s) => s.id === sessionId && !!s.title))

    // ── Feedback ──────────────────────────────────────────────────────────────
    const replyId = done1!.messageId!
    const up = await setAssistantMessageFeedback(replyId, 1)
    const [afterUp] = await db.select({ f: assistantChatMessage.feedback }).from(assistantChatMessage).where(eq(assistantChatMessage.id, replyId))
    check("thumbs up is saved", up.success && afterUp?.f === 1)
    const cleared = await setAssistantMessageFeedback(replyId, null)
    const [afterClear] = await db.select({ f: assistantChatMessage.feedback }).from(assistantChatMessage).where(eq(assistantChatMessage.id, replyId))
    check("pressing it again clears it", cleared.success && afterClear?.f === null)
    const onUser = await setAssistantMessageFeedback(done1!.userMessageId!, -1)
    check("feedback on a user turn is refused", !onUser.success)

    // ── Stop mid-reply keeps what streamed ────────────────────────────────────
    const stopped = await turn({ sessionId, content: "Write a detailed 300 word explanation of Dijkstra's algorithm." }, true)
    await new Promise((r) => setTimeout(r, 4000))
    const rowsAfterStop = await db.select().from(assistantChatMessage).where(eq(assistantChatMessage.sessionId, sessionId)).orderBy(asc(assistantChatMessage.createdAt))
    const lastRow = rowsAfterStop[rowsAfterStop.length - 1]
    check("a stopped reply is saved and marked partial", stopped.text.length > 0 && lastRow?.role === "assistant" && lastRow.metadata?.partial === true, `${lastRow?.content.length ?? 0} chars saved`)

    // ── Charts ────────────────────────────────────────────────────────────────
    const chart = await turn({ content: "I solved 3 problems on Monday, 5 on Tuesday and 2 on Wednesday. Show that as a bar chart." })
    const fence = /```chart\s*\n([\s\S]*?)```/.exec(chart.text)?.[1]
    let spec = null
    try { spec = fence ? readChartSpec(JSON.parse(fence)) : null } catch { spec = null }
    check("the model draws a valid chart fence when asked", !!spec && spec.type === "bar" && spec.labels.length === 3, fence ? fence.slice(0, 80).replace(/\s+/g, " ") : "no fence")
    const chartSession = frame(chart, "session")?.id

    // ── Another user cannot see or touch it ───────────────────────────────────
    as(bob)
    const intrude = await turn({ sessionId, content: "hello" })
    check("another user's session id is a 404", intrude.status === 404)
    const peek = await getAssistantChat(sessionId)
    check("another user cannot load it", !peek.success && peek.notFound === true)
    const bobRate = await setAssistantMessageFeedback(replyId, -1)
    check("another user cannot rate it", !bobRate.success)
    const bobDelete = await deleteAssistantChat(sessionId)
    check("another user cannot delete it", !bobDelete.success)
    const bobList = await listAssistantChats()
    check("another user's list does not include it", bobList.success && !bobList.sessions.some((s) => s.id === sessionId))

    // ── Delete cascades ───────────────────────────────────────────────────────
    as(alice)
    const del = await deleteAssistantChat(sessionId)
    const leftover = await db.select().from(assistantChatMessage).where(eq(assistantChatMessage.sessionId, sessionId))
    check("delete removes the chat and its messages", del.success && leftover.length === 0)
    if (chartSession) await deleteAssistantChat(chartSession)

    const empty = await turn({ content: "   " })
    check("an empty turn is refused", empty.status === 400)
} finally {
    await db.delete(users).where(eq(users.id, alice)).catch((e) => console.log(`cleanup failed: ${e}`))
    await db.delete(users).where(eq(users.id, bob)).catch((e) => console.log(`cleanup failed: ${e}`))
    const orphans = await db.select().from(assistantChatSession).where(eq(assistantChatSession.userId, alice))
    console.log(`cleanup: ${orphans.length === 0 ? "ok" : `${orphans.length} sessions left`}`)
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
