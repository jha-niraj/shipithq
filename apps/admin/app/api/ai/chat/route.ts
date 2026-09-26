import { NextRequest } from "next/server"
import { getSession } from "@repo/auth"
import { db, adminAccess } from "@repo/db"
import { eq } from "drizzle-orm"
import { openai } from "@/lib/openai-client"
import { TOOL_SPECS, runTool, type ToolCaller } from "@/lib/ai/tools"
import { encodeFrame, type ChatFrame } from "@/lib/ai/protocol"
import type { AdminPermissions } from "@/lib/navigation"
import { modelFor } from "@repo/ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// The admin panel's model is its task line in @repo/ai (plan/ai-models AM-3); no env override.
const MODEL = modelFor("adminAssistant")

const MAX_HISTORY_MESSAGES = 20
const MAX_MESSAGE_CHARS = 8000
const MAX_TOOL_ROUNDS = 2

interface IncomingMessage {
    role: "user" | "assistant"
    content: string
}

interface ChatParam {
    role: "system" | "user" | "assistant" | "tool"
    content?: string | null
    tool_call_id?: string
    tool_calls?: ToolCall[]
}

interface ToolCall {
    id: string
    type?: string
    function?: { name?: string; arguments?: string }
}

interface CompletionResponse {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>
}

function systemPrompt(ctx: { name: string; adminRole: string; page?: { route: string; title: string } | null }): string {
    const lines = [
        "You are the ShipItHQ admin console assistant - an internal tool for the ShipItHQ team.",
        "You help the team look up users, credit balances, feedback, and platform stats, and answer questions about companies and universities on the hiring and university platforms.",
        "",
        "How to answer:",
        "- Be direct and concrete. Lead with the answer, then the reasoning.",
        "- Prefer short paragraphs and tight bullet lists over walls of text.",
        "- Never invent a user, a credit balance, a feedback item, or any other data you weren't given by a tool.",
        "",
        "Tools:",
        "- Every tool is READ ONLY. There is nothing here that changes data - if the admin wants to change something, tell them which console page to use.",
        "- Call a tool whenever the answer depends on real platform data. Don't ask the admin to look something up that a tool can answer.",
        "- A tool can return `{ error: \"forbidden\" }` - this admin does not have the permission that tool needs. Say so plainly (\"you don't have access to the credits module\") rather than making up an answer or pretending the tool doesn't exist.",
        "- If a tool returns nothing or errors, say so plainly and answer with what you have.",
        "",
        `You are talking to: ${ctx.name} (${ctx.adminRole === "SUPER_ADMIN" ? "Super Admin" : "Team Member"}).`,
    ]
    if (ctx.page) {
        lines.push(
            "",
            `They are currently on the "${ctx.page.title}" page (${ctx.page.route}). Take that into account when it's relevant; don't mention it otherwise.`,
        )
    }
    return lines.join("\n")
}

export async function POST(request: NextRequest) {
    const session = await getSession(request.headers)
    if (!session?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        })
    }

    // Same gate as every other console route: a session is not admin access.
    // Re-checked on every request, not cached from the shell, so a suspended
    // admin's session cannot keep talking to the agent after the console
    // itself has locked them out. See plan/admin/tasks.md ADM-1, ADM-19.
    const [access] = await db
        .select({ adminRole: adminAccess.adminRole, status: adminAccess.status, permissions: adminAccess.permissions })
        .from(adminAccess)
        .where(eq(adminAccess.userId, session.user.id))
        .limit(1)

    if (!access || access.status !== "ACTIVE") {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        })
    }

    const caller: ToolCaller = { adminRole: access.adminRole, permissions: (access.permissions ?? {}) as AdminPermissions }

    let body: { messages?: unknown; page?: unknown }
    try {
        body = (await request.json()) as typeof body
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }

    const rawMessages = Array.isArray(body.messages) ? body.messages : []
    const history: IncomingMessage[] = rawMessages
        .filter((m): m is IncomingMessage =>
            !!m && typeof m === "object" &&
            typeof (m as IncomingMessage).content === "string" &&
            ((m as IncomingMessage).role === "user" || (m as IncomingMessage).role === "assistant"))
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
        .filter((m) => m.content.trim().length > 0)
        .slice(-MAX_HISTORY_MESSAGES)

    if (history.length === 0) {
        return new Response(JSON.stringify({ error: "No messages provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }

    const page =
        body.page && typeof body.page === "object"
            ? {
                route: String((body.page as { route?: unknown }).route ?? "").slice(0, 200),
                title: String((body.page as { title?: unknown }).title ?? "").slice(0, 120),
            }
            : null

    const system = systemPrompt({
        name: session.user.name ?? session.user.email,
        adminRole: access.adminRole,
        page,
    })

    const conversation: ChatParam[] = [{ role: "system", content: system }, ...history]

    const encoder = new TextEncoder()
    const body$ = new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (frame: ChatFrame) => controller.enqueue(encoder.encode(encodeFrame(frame)))

            try {
                for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
                    const decision = (await openai.chat.completions.create({
                        model: MODEL,
                        messages: conversation,
                        temperature: 0.4,
                        max_tokens: 1200,
                        tools: TOOL_SPECS,
                        tool_choice: "auto",
                    })) as CompletionResponse

                    const choice = decision?.choices?.[0]?.message
                    const calls = choice?.tool_calls ?? []
                    if (calls.length === 0) break

                    conversation.push({ role: "assistant", content: choice?.content ?? null, tool_calls: calls })

                    for (const call of calls) {
                        send({ t: "tool", phase: "call", id: call.id ?? `${round}-${call.function?.name ?? "tool"}`, name: call.function?.name ?? "tool" })
                    }

                    const results = await Promise.all(
                        calls.map(async (call) => {
                            const name = call.function?.name ?? ""
                            const args = call.function?.arguments ?? ""
                            try {
                                return await runTool(name, args, caller)
                            } catch (error: unknown) {
                                console.error(`[ai/chat] tool ${name} failed:`, error)
                                return null
                            }
                        }),
                    )

                    calls.forEach((call, i) => {
                        const id = call.id ?? `${round}-${call.function?.name ?? "tool"}`
                        const name = call.function?.name ?? "tool"
                        const outcome = results[i] ?? null

                        if (outcome === null) {
                            send({ t: "tool", phase: "error", id, name })
                            conversation.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "No result." }) })
                            return
                        }

                        const payload = outcome.result as { _summary?: unknown } | null
                        const summary =
                            payload && typeof payload === "object" && typeof payload._summary === "string"
                                ? payload._summary
                                : undefined
                        send({ t: "tool", phase: "result", id, name, ...(summary ? { summary } : {}) })

                        conversation.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(outcome.result) })
                    })
                }
            } catch (error) {
                console.error("[ai/chat] tool round failed:", error)
                conversation.length = 0
                conversation.push({ role: "system", content: system }, ...history)
            }

            try {
                const stream = (await openai.chat.completions.create({
                    model: MODEL,
                    messages: conversation,
                    temperature: 0.4,
                    max_tokens: 1200,
                    stream: true,
                })) as AsyncGenerator<unknown>

                for await (const chunk of stream) {
                    const delta = (chunk as { choices?: Array<{ delta?: { content?: string } }> })?.choices?.[0]?.delta?.content
                    if (delta) send({ t: "text", v: delta })
                }
                send({ t: "done" })
            } catch (error) {
                console.error("[ai/chat] stream error:", error)
                send({ t: "error", message: "The response was cut short. Please try again." })
            } finally {
                controller.close()
            }
        },
    })

    return new Response(body$, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            "X-Accel-Buffering": "no",
        },
    })
}
