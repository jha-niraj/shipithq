import { NextRequest } from "next/server";
import { modelFor } from "@repo/ai";
import { openai } from "@/lib/openai-client";
import { db, practiceProblem, sampleTests } from "@repo/db";
import { eq } from "drizzle-orm";
import { getSession } from "@repo/auth";
import { loadMentorContext } from "@/lib/practice/memory-read";
import { buildGuidedSystemPrompt, OPENING_USER_MESSAGE, resumeMessage } from "@/lib/practice/mentor-prompt";
import { judgeStage, settleStage } from "@/lib/practice/mentor-verdict";

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

const encoder = new TextEncoder();
const sse = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
const SSE_HEADERS = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" };

/**
 * The guided DSA mentor (plan/practice-dsa PD-6). Returns null when the
 * session is not a DSA assist session, so the caller falls through to the
 * original free-form mentor for every other module.
 *
 * Streams the reply as `{content}` events. After the text, it decides whether
 * the stage moved (tests, or a small verdict call on the last turns) and, if
 * it did, sends `{stage}` before `[DONE]`. The streamed text is never parsed
 * for stage markers.
 */
async function guidedMentor(userId: string, body: {
    sessionId?: string;
    chatHistory: ChatTurn[];
    userMessage: string;
    userCode: string;
    language?: string;
    open?: boolean;
}): Promise<Response | null> {
    if (!body.sessionId) return null;
    const ctx = await loadMentorContext(userId, body.sessionId);
    if (!ctx) return new Response("Session not found", { status: 404 });
    if (ctx.session.problem.module !== "DSA" || ctx.session.mode !== "ASSIST") return null;

    const { session, stage } = ctx;
    const history = (Array.isArray(body.chatHistory) ? body.chatHistory : [])
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim());

    // Returning to a problem already started: a templated line from memory.
    // Instant, no model call, cannot invent anything.
    if (body.open && history.length > 0) {
        const text = resumeMessage(stage, session.mentorState, session.problem.title);
        return new Response(
            new ReadableStream({
                start(controller) {
                    controller.enqueue(sse({ content: text }));
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                },
            }),
            { headers: SSE_HEADERS },
        );
    }

    const opening = Boolean(body.open) && history.length === 0;
    const userMessage = opening ? OPENING_USER_MESSAGE : String(body.userMessage ?? "").slice(0, 8000);
    if (!userMessage.trim()) return new Response("Empty message", { status: 400 });

    const code = typeof body.userCode === "string" ? body.userCode : "";
    const system = buildGuidedSystemPrompt({
        problem: session.problem,
        samples: sampleTests(session.problem.judgeTests),
        stage,
        mentorState: session.mentorState,
        concepts: ctx.concepts,
        mistakes: ctx.mistakes,
        onboarding: ctx.onboarding,
        code,
        language: body.language || session.language || "cpp",
    });

    const stream = await openai.chat.completions.create({
        model: modelFor("practiceMentor"),
        messages: [{ role: "system", content: system }, ...history.slice(-20), { role: "user", content: userMessage }],
        temperature: 0.5,
        max_tokens: 900,
        stream: true,
    });

    const readable = new ReadableStream({
        async start(controller) {
            let reply = "";
            try {
                for await (const chunk of stream as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>) {
                    const content = chunk.choices?.[0]?.delta?.content;
                    if (content) {
                        reply += content;
                        controller.enqueue(sse({ content }));
                    }
                }
            } catch (err: unknown) {
                console.error("[mentor-stream] Error:", err);
                controller.error(err);
                return;
            }

            // Stage settlement. Never fatal: a failure here only means the stage
            // did not move on this reply.
            if (!opening && stage !== "done") {
                try {
                    const turns = [...history, { role: "user", content: userMessage }, { role: "assistant", content: reply }];
                    const verdict = await judgeStage({
                        stage,
                        problemTitle: session.problem.title,
                        problemDescription: session.problem.description,
                        code,
                        turns,
                    });
                    const moved = await settleStage({ sessionId: session.id, stage, mentorState: session.mentorState, verdict });
                    if (moved) controller.enqueue(sse({ stage: moved }));
                } catch (err: unknown) {
                    console.error("[mentor-stage] Error:", err instanceof Error ? err.message : err);
                }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
        },
    });

    return new Response(readable, { headers: SSE_HEADERS });
}

export async function POST(req: NextRequest) {
    const session = await getSession(req.headers);
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return new Response("OpenAI API key not configured", { status: 500 });
    }

    const body = await req.json();
    const {
        problemSlug,
        chatHistory,
        userMessage,
        userCode,
        attemptNumber = 1,
    } = body as {
        problemSlug: string;
        chatHistory: Array<{ role: "user" | "assistant" | "system"; content: string }>;
        userMessage: string;
        userCode: string;
        attemptNumber: number;
    };

    const guided = await guidedMentor(session.user.id, body);
    if (guided) return guided;

    const [problem] = await db
        .select({
            title: practiceProblem.title,
            description: practiceProblem.description,
            requirements: practiceProblem.requirements,
            hints: practiceProblem.hints,
            difficulty: practiceProblem.difficulty,
        })
        .from(practiceProblem)
        .where(eq(practiceProblem.slug, problemSlug))
        .limit(1);

    if (!problem) {
        return new Response("Problem not found", { status: 404 });
    }

    const attemptContext =
        attemptNumber <= 2
            ? "Be gentle - give subtle conceptual nudges only. Do NOT reveal specific implementation details."
            : attemptNumber <= 4
                ? "Be more specific - point to the exact part of their approach that needs fixing. You can mention the algorithm pattern needed."
                : "Be more direct - the student is struggling. Give a clear step-by-step hint. You can outline the algorithm structure without writing the full solution.";

    const systemMessage = `You are a patient, Socratic coding mentor helping a student solve a practice problem.

Problem: ${problem.title} (${problem.difficulty})
Description: ${problem.description}

Requirements:
${problem.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Available Hints (use sparingly, guide the student to discover them):
${problem.hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}

Current Code:
\`\`\`
${userCode}
\`\`\`

Attempt context: The student is on attempt #${attemptNumber}.
${attemptContext}

Rules:
1. NEVER give the complete solution. Guide with questions and small hints.
2. If the student is stuck, give ONE small nudge in the right direction.
3. If they ask for the answer directly, redirect them with a guiding question.
4. Acknowledge what they've done well before pointing out issues.
5. Keep responses concise (2-4 sentences usually).
6. Use code snippets only for small illustrative examples, never full solutions.
7. When the student asks for a flowchart, diagram, or visual explanation, generate it using a mermaid code block (\`\`\`mermaid). Use graph TD for flowcharts, sequenceDiagram for sequence flows, classDiagram for class relationships, etc.
8. Format numbered lists properly using markdown (1. item, 2. item). Use bullet points (- item) for unordered lists. Always add a blank line before and after lists.
9. When analyzing code the student sends to "run", walk through the logic step by step: identify potential bugs, predict the output, and suggest improvements. Do NOT just give the corrected code.
10. For DSA problems, use Mermaid diagrams to visualize recursion trees, pointer movements, sliding windows, stack/queue ops, and graph traversals.
11. For System Design problems, use Mermaid for architecture diagrams, sequence diagrams, and data flow.
12. Always use \`\`\`mermaid code blocks for diagrams. Use simple, clean syntax.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemMessage },
        ...chatHistory.slice(-20),
        { role: "user", content: userMessage },
    ];

    const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
            } catch (err) {
                console.error("[mentor-stream] Error:", err);
                controller.error(err);
            }
        },
    });

    return new Response(readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
