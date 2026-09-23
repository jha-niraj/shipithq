import { NextRequest } from "next/server";
import { getSession } from "@repo/auth";
import { modelFor } from "@repo/ai";
import { db, users } from "@repo/db";
import type { AssistantChatAction, AssistantChatAttachment, AssistantChatStep } from "@repo/db/assistant";
import { eq } from "drizzle-orm";
import { openai } from "@/lib/openai-client";
import { TOOL_SPECS, WRITE_TOOLS, runTool } from "@/lib/ai/tools";
import { encodeFrame, type ChatFrame } from "@/lib/ai/protocol";
import {
    CHAT_HISTORY_LIMIT, CHAT_TITLE_MAX, createSession, fallbackTitle, getOwnedSession,
    insertMessage, modelContent, recentMessages, touchSession,
} from "@/lib/ai/chat-store";

export const runtime = "nodejs";
// The response is a token stream, so it can never be cached or prerendered.
export const dynamic = "force-dynamic";

// The chat model and the title model (plan/ai-chat/overview.md, Limits).
const MODEL = modelFor("assistantChat");
const TITLE_MODEL = modelFor("assistantChatTitle");

/** Each turn is capped before it reaches the model (overview, Limits). The history
 *  itself is capped at CHAT_HISTORY_LIMIT messages by the chat store. */
const MAX_MESSAGE_CHARS = 8000;
/** Attachment text, per document, and documents per turn. /api/ai/upload-doc already
 *  caps text at 20k; this is the same cap enforced on what comes back to us. */
const MAX_ATTACHMENT_CHARS = 20_000;
const MAX_ATTACHMENTS = 5;

/** How many times the model may call tools before it must answer in prose.
 *  Two rounds covers "look me up, then search on what you found"; anything
 *  beyond that is a loop, not a plan, and burns the user's tokens. */
const MAX_TOOL_ROUNDS = 2;

interface IncomingMessage {
    role: "user" | "assistant";
    content: string;
}

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Attachments come straight off the client: shape-checked and capped. */
function readAttachments(raw: unknown): AssistantChatAttachment[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((a): a is AssistantChatAttachment =>
            !!a && typeof a === "object" &&
            typeof (a as { id?: unknown }).id === "string" &&
            typeof (a as { name?: unknown }).name === "string" &&
            typeof (a as { text?: unknown }).text === "string")
        .slice(0, MAX_ATTACHMENTS)
        .map((a) => ({
            id: a.id.slice(0, 64),
            name: a.name.slice(0, 200),
            chars: Math.min(Number(a.chars) || a.text.length, MAX_ATTACHMENT_CHARS),
            truncated: Boolean(a.truncated) || a.text.length > MAX_ATTACHMENT_CHARS,
            text: a.text.slice(0, MAX_ATTACHMENT_CHARS),
        }));
}

/** A short title for a conversation from its first exchange. Never throws: a failed
 *  title call falls back to the question itself. */
async function titleFor(question: string, reply: string): Promise<string> {
    try {
        const res = (await openai.chat.completions.create({
            model: TITLE_MODEL,
            temperature: 0.3,
            max_tokens: 24,
            messages: [
                {
                    role: "system",
                    content:
                        "Write a title of 2 to 6 words for this conversation, the way a person would name a chat in a sidebar. " +
                        "Name the topic, not the request (\"4-week DSA plan\", not \"User asks for a plan\"). " +
                        "Plain words only: no quotes, no trailing punctuation, no emoji.",
                },
                { role: "user", content: `Question: ${question.slice(0, 1000)}\n\nReply: ${reply.slice(0, 1000)}` },
            ],
        })) as CompletionResponse;
        const raw = res?.choices?.[0]?.message?.content ?? "";
        const title = raw.replace(/^["'\s]+|["'.\s]+$/g, "").replace(/\s+/g, " ").trim();
        if (!title) return fallbackTitle(question);
        return title.length > CHAT_TITLE_MAX ? fallbackTitle(title) : title;
    } catch (error: unknown) {
        console.error("[ai/chat] title failed:", error);
        return fallbackTitle(question);
    }
}

/** One entry in the message array we hand to the model. Wider than
 *  IncomingMessage because tool rounds add assistant-with-tool_calls and tool
 *  result messages, neither of which the client is allowed to send. */
interface ChatParam {
    role: "system" | "user" | "assistant" | "tool";
    content?: string | null;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
}

interface ToolCall {
    id: string;
    type?: string;
    function?: { name?: string; arguments?: string };
}

interface CompletionResponse {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
}

function systemPrompt(ctx: {
    name: string | null;
    username: string | null;
    university: string | null;
    semester: string | null;
    interests: string[];
    page?: { route: string; title: string } | null;
    tags?: Array<{ id: string; kind: string; title: string }>;
}): string {
    const lines = [
        "You are the ShipItHQ assistant - an engineering-career copilot for CS students and software engineers.",
        "You help with: building portfolio projects, DSA and system-design practice, resumes and cover letters, technical interview prep, and open-source contribution.",
        "",
        "How to answer:",
        "- Be direct and concrete. Lead with the answer, then the reasoning.",
        "- Prefer short paragraphs and tight bullet lists over walls of text.",
        "- Use fenced code blocks with a language tag for any code.",
        "- Punctuation: a plain hyphen (-), never an em dash or en dash.",
        "- When numbers compare or change over time (practice solved per week, progress across modules), you may draw a small chart:",
        "  a fenced block with the language `chart` holding JSON like",
        '  {"type":"bar","title":"<a short title for THIS data>","labels":["<label>","<label>"],"series":[{"name":"<series name>","data":[4,7]}],"unit":"<unit>"}.',
        '  `type` is "bar", "line" or "pie"; every series has one number per label. Only chart real numbers from a tool; never invent data for a chart. Keep prose around it short.',
        "- If a question is outside engineering/career help, answer briefly and steer back.",
        "- Never invent ShipItHQ features, prices, or user data you weren't given.",
        "",
        "Tools:",
        "- You can read this user's own ShipItHQ data and search the platform's project ideas and job posts.",
        "- Call a tool when the answer depends on their actual state (progress, goals, practice, profile) or on what the platform actually offers. Don't ask them to repeat something a tool can tell you.",
        "- Don't call a tool for general knowledge, code review, or explanations - just answer.",
        "- If a tool returns nothing or errors, say so plainly and answer with what you have. Never fabricate rows.",
        "",
        // The read tools are safe to call speculatively; this one is not. The model needs to
        // be told the difference explicitly, because nothing in a function signature says
        // "this one takes the user's money".
        "Making things (these WRITE, and most spend the user's credits):",
        "- `create_cover_letter` - creates a cover letter and starts generating it. Costs credits.",
        "- `create_project` - creates a project and generates its sprints and tasks. Costs credits (13 public / 25 private, +30 with an assessment).",
        "- `create_goal` - adds a Pathfinder goal. Free when public; private ones cost credits.",
        "",
        "Rules for all three:",
        "- Never call one speculatively, and never twice for the same thing.",
        "- Only act on something the user actually agreed to. Suggesting is free; creating is not.",
        "- After one succeeds the user is shown a BUTTON automatically. Do not write a link, do not paste a URL, and do not describe where to click.",
        "- Prefer the free/cheap option (public project, public goal) unless the user asks otherwise.",
        "",
        "Patterns worth following:",
        "- Project ideas: when you list ideas from `search_project_ideas` and the user picks one, call `create_project` with THAT idea's title and description. Do not re-list the ideas afterwards and do not ask the user to retype anything you already showed them.",
        "- Goals: if `list_my_goals` returns fewer than three, finish by suggesting two or three concrete goals that fit their profile and practice history, and offer to add them. Create only the ones they choose.",
        "- Resume: `get_my_resume` returns a `gaps` list. Give the summary first, then what is missing, worst first. The button to their profile appears on its own.",
        "",
        "Sending them somewhere:",
        "- You do NOT know this app's URLs. Never write a path, a link, or 'go to Settings > Account' in a reply.",
        "- Call `link_to` instead: pick page ids and the user gets real buttons. Do this whenever your answer points at something they can go and do.",
        "- A plan, a list of ideas, or an explanation of a feature should almost always end with one. A 4-week DSA plan ends with a button to DSA practice; a list of project ideas ends with one to the idea catalogue.",
        "",
        "About the person you're talking to:",
        `- Name: ${ctx.name ?? "unknown"}`,
    ];
    if (ctx.username) lines.push(`- Handle: @${ctx.username}`);
    if (ctx.university) lines.push(`- Studies at: ${ctx.university}${ctx.semester ? ` (${ctx.semester})` : ""}`);
    if (ctx.interests.length) lines.push(`- Wants to get better at: ${ctx.interests.join(", ")}`);
    if (ctx.page) {
        lines.push(
            "",
            // A pointer, not a payload: the model gets to know WHERE the user is so it
            // can be page-aware, without us shipping the page's contents into the prompt.
            `The user is currently on the "${ctx.page.title}" page (${ctx.page.route}). Take that into account when it's relevant; don't mention it otherwise.`,
        );
    }

    // Tagged context. Named as things to look at rather than pasted content: the
    // agent has tools for every one of these and they enforce ownership, whereas
    // inlining a resume here would put it in the prompt whether or not the answer
    // needed it.
    if (ctx.tags?.length) {
        lines.push(
            "",
            "The user has attached these to the conversation - treat them as what the question is about, and use your tools to look them up:",
            ...ctx.tags.map((t) => `- ${t.kind}: "${t.title}"`),
        );
    }
    return lines.join("\n");
}

export async function POST(request: NextRequest) {
    const session = await getSession(request.headers);
    if (!session?.user?.id) return json(401, { error: "Unauthorized" });
    const userId = session.user.id;

    let body: { sessionId?: unknown; content?: unknown; attachments?: unknown; page?: unknown; tags?: unknown };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return json(400, { error: "Invalid JSON body" });
    }

    // ONE new turn, not a history. The conversation lives in the database now
    // (plan/ai-chat, AC-3): the client used to send its whole local array, which was
    // untrusted input the route had to cap and shape-check on every request.
    const content = typeof body.content === "string" ? body.content.trim().slice(0, MAX_MESSAGE_CHARS) : "";
    const attachments = readAttachments(body.attachments);
    // An attachment alone is a valid turn - "here, read this".
    if (!content && attachments.length === 0) return json(400, { error: "Empty message" });

    // Context tags the user pinned, plus whatever page they are on. Shape-checked
    // like everything else off the client, and capped: this goes into the system
    // prompt, so an unbounded list is an unbounded prompt.
    //
    // The tags are HINTS about what to look at, never data in themselves. The
    // agent still fetches through its own tools, which are all scoped to the
    // signed-in user - so a forged tag can only ask for something the caller is
    // already allowed to read.
    const rawTags = Array.isArray(body.tags) ? body.tags : [];
    const tags = rawTags
        .filter((t): t is { id: string; kind: string; title: string } =>
            !!t && typeof t === "object" &&
            typeof (t as { id?: unknown }).id === "string" &&
            typeof (t as { kind?: unknown }).kind === "string" &&
            typeof (t as { title?: unknown }).title === "string")
        .map((t) => ({ id: t.id.slice(0, 64), kind: t.kind.slice(0, 24), title: t.title.slice(0, 120) }))
        .slice(0, 8);

    const page =
        body.page && typeof body.page === "object"
            ? {
                route: String((body.page as { route?: unknown }).route ?? "").slice(0, 200),
                title: String((body.page as { title?: unknown }).title ?? "").slice(0, 120),
            }
            : null;

    // ── The conversation ──────────────────────────────────────────────────────
    // Someone else's session id is answered exactly like a missing one, so the
    // response never confirms that an id exists.
    const requestedId = typeof body.sessionId === "string" && body.sessionId ? body.sessionId.slice(0, 64) : null;
    const chat = requestedId ? await getOwnedSession(userId, requestedId) : await createSession(userId);
    if (!chat) return json(404, { error: "Conversation not found" });

    const prior = (await recentMessages(chat.id, CHAT_HISTORY_LIMIT - 1))
        .map((m): IncomingMessage => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: modelContent(m).slice(0, MAX_MESSAGE_CHARS),
        }))
        .filter((m) => m.content.length > 0);
    const needsTitle = !chat.title;

    // Saved BEFORE answering: if the model call fails, the question is still in the
    // conversation when the user retries or reopens it.
    const userMeta = attachments.length ? { attachments } : null;
    const userMessageId = await insertMessage({ sessionId: chat.id, role: "user", content, metadata: userMeta });
    const history: IncomingMessage[] = [
        ...prior,
        { role: "user", content: modelContent({ content, metadata: userMeta }).slice(0, MAX_MESSAGE_CHARS) },
    ];

    const [user] = await db
        .select({
            name: users.name,
            username: users.username,
            university: users.university,
            semester: users.semester,
            learningPreferences: users.learningPreferences,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    const system = systemPrompt({
        name: user?.name ?? session.user.name ?? null,
        username: user?.username ?? null,
        university: user?.university ?? null,
        semester: user?.semester ?? null,
        interests: user?.learningPreferences ?? [],
        page,
        tags,
    });

    const conversation: ChatParam[] = [
        { role: "system", content: system },
        ...history,
    ];

    // ── One stream, tool rounds included ──────────────────────────────────────
    // The response opens first and every tool call is announced as it happens -
    // see `lib/ai/protocol.ts`. What streams is also collected, because the
    // assistant turn is saved from it at the end.
    const encoder = new TextEncoder();
    let cancelled = false;
    const body$ = new ReadableStream<Uint8Array>({
        async start(controller) {
            // After the reader goes away (the user pressed stop, or closed the tab),
            // enqueue throws. Nothing may throw past this point: the turn still has to
            // be saved.
            const send = (frame: ChatFrame) => {
                if (cancelled) return;
                try {
                    controller.enqueue(encoder.encode(encodeFrame(frame)));
                } catch {
                    cancelled = true;
                }
            };

            let reply = "";
            let failed = false;
            const steps = new Map<string, AssistantChatStep>();
            const actions: AssistantChatAction[] = [];

            send({ t: "session", id: chat.id });

            try {
                // Fingerprints of write-tool calls already executed in THIS turn. See the note
                // beside the check below.
                const writesThisTurn = new Set<string>();

                for (let round = 0; round < MAX_TOOL_ROUNDS && !cancelled; round++) {
                    const decision = (await openai.chat.completions.create({
                        model: MODEL,
                        messages: conversation,
                        temperature: 0.6,
                        max_tokens: 1600,
                        tools: TOOL_SPECS,
                        tool_choice: "auto",
                    })) as CompletionResponse;

                    const choice = decision?.choices?.[0]?.message;
                    const calls = choice?.tool_calls ?? [];
                    if (calls.length === 0) break;

                    conversation.push({
                        role: "assistant",
                        content: choice?.content ?? null,
                        tool_calls: calls,
                    });

                    // Announce every call before running any of them, so the panel
                    // shows the whole round at once rather than one line appearing
                    // per completed database read.
                    for (const call of calls) {
                        send({
                            t: "tool",
                            phase: "call",
                            id: call.id ?? `${round}-${call.function?.name ?? "tool"}`,
                            name: call.function?.name ?? "tool",
                        });
                    }

                    // Independent reads - run them together rather than serialising
                    // a round trip to the database per call.
                    const results = await Promise.all(
                        calls.map(async (call) => {
                            const name = call.function?.name ?? "";
                            const args = call.function?.arguments ?? "";

                            // ── Write tools run at most once per turn ──
                            //
                            // The model asked to create the same project TWICE in one round.
                            // Both the tool description and the system prompt tell it not to;
                            // it did anyway, and two calls is two credit charges for one
                            // project. Prompts are guidance, this is the control.
                            //
                            // Keyed on name + arguments, so a genuine second call with
                            // different arguments (two different cover letters) still runs.
                            if (WRITE_TOOLS.has(name)) {
                                const fingerprint = `${name}:${args}`;
                                if (writesThisTurn.has(fingerprint)) {
                                    return {
                                        result: {
                                            error: "already_done",
                                            message:
                                                "This exact call already ran in this turn and was not repeated. " +
                                                "Tell the user it is underway; do not call it again.",
                                        },
                                    };
                                }
                                writesThisTurn.add(fingerprint);
                            }

                            try {
                                return await runTool(name, args, userId);
                            } catch (error: unknown) {
                                console.error(`[ai/chat] tool ${name} failed:`, error);
                                return null;
                            }
                        }),
                    );

                    calls.forEach((call, i) => {
                        const id = call.id ?? `${round}-${call.function?.name ?? "tool"}`;
                        const name = call.function?.name ?? "tool";
                        const outcome = results[i] ?? null;

                        if (outcome === null) {
                            send({ t: "tool", phase: "error", id, name });
                            steps.set(id, { id, name, status: "error" });
                            conversation.push({
                                role: "tool",
                                tool_call_id: call.id,
                                content: JSON.stringify({ error: "No result." }),
                            });
                            return;
                        }

                        const payload = outcome.result as { _summary?: unknown } | null;
                        // A tool may return `_summary` to describe what it found in its
                        // own words ("Found 3 projects"). Better than the generic label,
                        // and it is the tool that knows.
                        const summary =
                            payload && typeof payload === "object" && typeof payload._summary === "string"
                                ? payload._summary
                                : undefined;
                        send({ t: "tool", phase: "result", id, name, ...(summary ? { summary } : {}) });
                        steps.set(id, { id, name, status: "done", ...(summary ? { summary } : {}) });

                        // A control the tool produced - a link to the thing it made. Emitted
                        // here, from the tool's own return value, so the href never passes
                        // through the model and cannot come back paraphrased or invented.
                        for (const a of [
                            ...(outcome.action ? [outcome.action] : []),
                            ...(outcome.actions ?? []),
                        ]) {
                            const action = { label: a.label, href: a.href, ...(a.kind ? { kind: a.kind } : {}) };
                            send({ t: "action", ...action });
                            actions.push(action);
                        }

                        conversation.push({
                            role: "tool",
                            tool_call_id: call.id,
                            content: JSON.stringify(outcome.result),
                        });
                    });
                }
            } catch (error: unknown) {
                // A failed tool round is recoverable: drop back to the plain history
                // and let the model answer from what it already knows.
                console.error("[ai/chat] tool round failed:", error);
                conversation.length = 0;
                conversation.push({ role: "system", content: system }, ...history);
            }

            try {
                if (!cancelled) {
                    const stream = (await openai.chat.completions.create({
                        model: MODEL,
                        messages: conversation,
                        temperature: 0.6,
                        max_tokens: 1600,
                        stream: true,
                    })) as AsyncGenerator<unknown>;

                    for await (const chunk of stream) {
                        // Stop paying for tokens nobody is reading.
                        if (cancelled) break;
                        const delta = (chunk as {
                            choices?: Array<{ delta?: { content?: string } }>;
                        })?.choices?.[0]?.delta?.content;
                        if (delta) {
                            reply += delta;
                            send({ t: "text", v: delta });
                        }
                    }
                }
            } catch (error: unknown) {
                console.error("[ai/chat] stream error:", error);
                failed = true;
                // The status code is long gone by here, so the failure has to travel
                // in band or the user just gets a truncated answer with no reason.
                send({ t: "error", message: "The response was cut short. Please try again." });
            }

            // ── Save the turn ──────────────────────────────────────────────────
            // Whatever streamed is kept, including a reply the user stopped halfway:
            // it is what they saw, and reopening the chat should show the same thing.
            let messageId: string | null = null;
            try {
                if (reply.trim() || actions.length) {
                    messageId = await insertMessage({
                        sessionId: chat.id,
                        role: "assistant",
                        content: reply,
                        metadata: {
                            ...(steps.size ? { steps: [...steps.values()] } : {}),
                            ...(actions.length ? { actions } : {}),
                            ...(cancelled || failed ? { partial: true } : {}),
                        },
                    });
                }
                let title: string | undefined;
                if (needsTitle) {
                    title = reply.trim() ? await titleFor(content || attachments[0]?.name || "", reply) : fallbackTitle(content || attachments[0]?.name || "New chat");
                    send({ t: "title", v: title });
                }
                await touchSession(chat.id, title);
            } catch (error: unknown) {
                console.error("[ai/chat] saving the turn failed:", error);
            }

            send({
                t: "done",
                ...(messageId ? { messageId } : {}),
                ...(userMessageId ? { userMessageId } : {}),
            });
            try { controller.close(); } catch { /* already cancelled */ }
        },
        cancel() {
            cancelled = true;
        },
    });

    return new Response(body$, {
        headers: {
            // NDJSON, not text/plain: the body is framed. See lib/ai/protocol.ts.
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            "X-Accel-Buffering": "no",
        },
    });
}
