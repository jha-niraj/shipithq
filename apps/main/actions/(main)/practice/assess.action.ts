"use server";

import { openai } from '@/lib/openai-client'
import { db, practiceProblem, clientSafeJudge } from "@repo/db";
import { eq } from "drizzle-orm";
import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import type {
    PracticeAssessPayload, PracticeAssessResult, PracticeProblemDetail
} from "@/types/practice";


// ─────────────────────────────────────────────
// SYSTEM PROMPTS PER MODULE
// ─────────────────────────────────────────────

const MODULE_SYSTEM_PROMPTS: Record<string, string> = {
    DSA: `You are a senior software engineer and DSA expert reviewing a candidate's solution.
Evaluate their code for:
- Correctness: Does the solution handle all cases including edge cases?
- Time Complexity: Is it optimal? What is the Big-O?
- Space Complexity: Is memory usage efficient?
- Code Quality: Clean, readable, well-named variables, no unnecessary complexity.
- Approach: Is the chosen algorithm appropriate?

When providing feedback, include Mermaid diagrams where helpful:
- Use graph TD for recursion trees
- Use graph LR for array pointer visualization
- Use sequenceDiagram for step-by-step algorithm traces`,

    SYSTEM_DESIGN: `You are a senior system architect reviewing a system design solution on an Excalidraw canvas (provided as JSON).
Evaluate the design for:
- Component Selection: Are the right components (load balancers, caches, databases, queues) chosen?
- Scalability: Does the design handle scale requirements?
- Data Flow: Is the data flow logical and complete?
- Trade-offs: Are trade-offs acknowledged and reasonable?
- Completeness: Does the design address all requirements?

When providing feedback, include Mermaid diagrams:
- Use graph TD for architecture overview
- Use sequenceDiagram for request flow analysis
- Identify missing components visually`,

    WEB_FRONTEND: `You are a senior frontend engineer reviewing a React/HTML/CSS implementation.
Evaluate the work for:
- Visual Accuracy: Does it match the requirements?
- Responsiveness: Does the layout work at different sizes?
- Code Quality: Clean JSX/HTML, semantic elements, organized CSS.
- Interactivity: Do interactions work correctly?
- Accessibility: Basic a11y considerations (alt tags, labels, contrast).`,

    WEB_BACKEND: `You are a senior backend engineer reviewing an API implementation.
Evaluate the work for:
- Endpoint Design: RESTful conventions, proper HTTP methods and status codes.
- Input Validation: Are inputs validated and sanitized?
- Error Handling: Graceful error responses, proper error codes.
- Security: Authentication, authorization, injection prevention.
- Code Structure: Clean separation of concerns, maintainable code.`,
};

// ─────────────────────────────────────────────
// CANVAS TOPOLOGY EXTRACTION
// ─────────────────────────────────────────────

interface ExcalidrawElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    boundElements?: { id: string; type: string }[];
    startBinding?: { elementId: string } | null;
    endBinding?: { elementId: string } | null;
    containerId?: string | null;
}

function extractTopology(canvasJSON: string): string {
    let elements: ExcalidrawElement[];
    try {
        const parsed = JSON.parse(canvasJSON);
        elements = Array.isArray(parsed) ? parsed : parsed.elements ?? [];
    } catch {
        return "Unable to parse canvas data.";
    }

    if (elements.length === 0) {
        return "Empty canvas - no components found.";
    }

    const rectangles = elements.filter(
        (el) => el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond"
    );
    const arrows = elements.filter(
        (el) => el.type === "arrow" || el.type === "line"
    );
    const textElements = elements.filter((el) => el.type === "text");

    const idToLabel = new Map<string, string>();

    for (const text of textElements) {
        if (text.containerId) {
            idToLabel.set(text.containerId, text.text?.trim() ?? "");
        }
    }

    for (const rect of rectangles) {
        if (!idToLabel.has(rect.id)) {
            const boundText = textElements.find((t) => t.containerId === rect.id);
            if (boundText?.text) {
                idToLabel.set(rect.id, boundText.text.trim());
            } else {
                const nearby = textElements.find(
                    (t) =>
                        !t.containerId &&
                        Math.abs(t.x - rect.x) < rect.width + 20 &&
                        Math.abs(t.y - rect.y) < rect.height + 20
                );
                if (nearby?.text) {
                    idToLabel.set(rect.id, nearby.text.trim());
                }
            }
        }
    }

    const labelCounts = new Map<string, number>();
    for (const label of idToLabel.values()) {
        labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }

    const componentLines: string[] = [];
    for (const [label, count] of labelCounts.entries()) {
        componentLines.push(count > 1 ? `- ${label} (x${count})` : `- ${label}`);
    }

    const connectionLines: string[] = [];
    for (const arrow of arrows) {
        const fromId = arrow.startBinding?.elementId;
        const toId = arrow.endBinding?.elementId;
        const fromLabel = fromId ? idToLabel.get(fromId) ?? "Unknown" : "Unknown";
        const toLabel = toId ? idToLabel.get(toId) ?? "Unknown" : "Unknown";
        if (fromId && toId) {
            connectionLines.push(`- ${fromLabel} → ${toLabel}`);
        }
    }

    const annotations = textElements
        .filter((t) => !t.containerId)
        .filter((t) => {
            return !rectangles.some(
                (r) =>
                    Math.abs(t.x - r.x) < r.width + 20 &&
                    Math.abs(t.y - r.y) < r.height + 20
            );
        })
        .map((t) => `- "${t.text?.trim()}"`)
        .filter((a) => a !== '- ""');

    const sections: string[] = [];

    if (componentLines.length > 0) {
        sections.push(`Components found:\n${componentLines.join("\n")}`);
    } else {
        sections.push("Components found: none identified");
    }

    if (connectionLines.length > 0) {
        sections.push(`Connections:\n${connectionLines.join("\n")}`);
    } else {
        sections.push("Connections: none identified");
    }

    if (annotations.length > 0) {
        sections.push(`Annotations:\n${annotations.join("\n")}`);
    }

    sections.push(
        `\nRaw element counts: ${rectangles.length} shapes, ${arrows.length} connectors, ${textElements.length} text elements`
    );

    return sections.join("\n\n");
}

// ─────────────────────────────────────────────
// BUILD ASSESSMENT PROMPT
// ─────────────────────────────────────────────

function buildAssessPrompt(
    problem: PracticeProblemDetail,
    payload: PracticeAssessPayload
): string {
    const requirementsList = problem.requirements
        .map((r, i) => `  ${i + 1}. ${r}`)
        .join("\n");

    const previousContext = payload.previousFeedback
        ? `\n\nPrevious Feedback (attempt ${payload.attemptNumber - 1}):\n${payload.previousFeedback}`
        : "";

    const conversationContext = payload.conversationHistory.length > 0
        ? `\n\nConversation History:\n${payload.conversationHistory
            .slice(-10)
            .map((m) => `[${m.role}]: ${m.content}`)
            .join("\n")}`
        : "";

    let workSection = "";
    if (payload.module === "SYSTEM_DESIGN") {
        const topology = extractTopology(payload.userWork);
        workSection = `System Design Canvas Analysis:\n${topology}\n\nRaw Canvas Data (for reference):\n\`\`\`json\n${payload.userWork.substring(0, 3000)}\n\`\`\``;
    } else if (payload.module === "WEB_FRONTEND") {
        workSection = `HTML/JSX Code:\n\`\`\`\n${payload.userWork}\n\`\`\``;
        if (payload.userCss) {
            workSection += `\n\nCSS:\n\`\`\`css\n${payload.userCss}\n\`\`\``;
        }
    } else {
        workSection = `Code (${payload.language ?? "javascript"}):\n\`\`\`${payload.language ?? "javascript"}\n${payload.userWork}\n\`\`\``;
    }

    return `Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Category: ${problem.category}
Mode: ${payload.mode} (${payload.mode === "EXAM" ? "no assistance given" : "AI assistance was available"})
Attempt Number: ${payload.attemptNumber}

Description:
${problem.description}

Requirements:
${requirementsList}

${workSection}
${payload.judgeSummary ? `\nJudge results (authoritative; these were produced by running the code against the problem's full test set, do not contradict them):\n${payload.judgeSummary}\n` : ""}
${previousContext}
${conversationContext}

Evaluate the solution and respond with ONLY valid JSON (no markdown, no code blocks):
{
  "score": <number 0-100>,
  "feedback": "<detailed constructive feedback as a single string>",
  "requirementsMet": {
    ${problem.requirements.map((r, i) => `"req-${i}": <true|false>`).join(",\n    ")}
  },
  "summary": "<one-line summary of performance>"
}

Scoring Guidelines:
- 90-100: Excellent - all requirements met, optimal approach, clean code
- 75-89: Good - most requirements met, reasonable approach, minor issues
- 60-74: Satisfactory - core requirements met, some issues to address
- 40-59: Needs Improvement - several requirements missing, significant issues
- 0-39: Incomplete - fundamental issues, major requirements not met

For ${payload.mode === "EXAM" ? "EXAM mode, be fair but rigorous since no help was given" : "ASSIST mode, acknowledge the collaborative approach but still evaluate the final result objectively"}.`;
}

// ─────────────────────────────────────────────
// ASSESS ACTION
// ─────────────────────────────────────────────

export async function assessPracticeWork(
    payload: PracticeAssessPayload
): Promise<{ success: true; result: PracticeAssessResult } | { success: false; error: string }> {
    const session = await getSession(headers());
    if (!session?.user?.id) {
        return { success: false, error: "Not authenticated" };
    }

    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: "OpenAI API key not configured" };
    }

    try {
        const problem = await db.query.practiceProblem.findFirst({
            where: eq(practiceProblem.slug, payload.problemSlug),
        });
        if (!problem) {
            return { success: false, error: "Problem not found" };
        }

        const problemDetail: PracticeProblemDetail = {
            id: problem.id,
            slug: problem.slug,
            title: problem.title,
            description: problem.description,
            module: problem.module,
            category: problem.category,
            difficulty: problem.difficulty,
            requirements: problem.requirements,
            hints: problem.hints,
            starterCode: problem.starterCode,
            starterCss: problem.starterCss,
            testCases: problem.testCases as PracticeProblemDetail["testCases"],
            tags: problem.tags,
            judge: clientSafeJudge(problem),
        };

        const systemPrompt = MODULE_SYSTEM_PROMPTS[payload.module] ?? MODULE_SYSTEM_PROMPTS.DSA!;
        const userPrompt = buildAssessPrompt(problemDetail, payload);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 1500,
        });

        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
            return { success: false, error: "No response from AI" };
        }

        const cleaned = responseContent.replace(/```json\s*|```\s*/g, "").trim();
        let parsed: {
            score: number;
            feedback: string;
            requirementsMet: Record<string, boolean>;
            summary?: string;
        };

        try {
            parsed = JSON.parse(cleaned);
        } catch {
            const scoreMatch = responseContent.match(/score['"]\s*:\s*(\d+)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1] ?? "50", 10) : 50;
            parsed = {
                score,
                feedback: responseContent,
                requirementsMet: {},
            };
        }

        const difficultyMultiplier: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
        const mult = difficultyMultiplier[problem.difficulty] ?? 1;
        const baseXP = Math.round((parsed.score / 100) * 25);
        const xpAwarded = baseXP * mult;

        const attemptPenalty = payload.attemptNumber > 1 ? Math.max(0.5, 1 - (payload.attemptNumber - 1) * 0.1) : 1;
        const finalXP = Math.round(xpAwarded * attemptPenalty);

        const result: PracticeAssessResult = {
            score: parsed.score,
            feedback: parsed.feedback,
            requirementsMet: parsed.requirementsMet,
            xpAwarded: finalXP,
        };

        return { success: true, result };
    } catch (err) {
        console.error("[assessPracticeWork] Error:", err);
        return { success: false, error: "Assessment failed. Please try again." };
    }
}

// ─────────────────────────────────────────────
// AI MENTOR CHAT (Assist Mode)
// ─────────────────────────────────────────────

export async function getMentorResponse(
    problemSlug: string,
    chatHistory: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    userMessage: string,
    userCode: string,
    module: string,
    attemptNumber: number = 1
): Promise<{ success: true; message: string } | { success: false; error: string }> {
    const session = await getSession(headers());
    if (!session?.user?.id) {
        return { success: false, error: "Not authenticated" };
    }

    if (!process.env.OPENAI_API_KEY) {
        return { success: false, error: "OpenAI API key not configured" };
    }

    try {
        const problem = await db.query.practiceProblem.findFirst({
            where: eq(practiceProblem.slug, problemSlug),
            columns: { title: true, description: true, requirements: true, hints: true, difficulty: true },
        });
        if (!problem) {
            return { success: false, error: "Problem not found" };
        }

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
${attemptNumber <= 2 ? 'Be gentle - give subtle conceptual nudges only. Do NOT reveal specific implementation details.' : ''}
${attemptNumber >= 3 && attemptNumber <= 4 ? 'Be more specific - point to the exact part of their approach that needs fixing. You can mention the algorithm pattern needed.' : ''}
${attemptNumber >= 5 ? 'Be more direct - the student is struggling. Give a clear step-by-step hint. You can outline the algorithm structure without writing the full solution.' : ''}

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
10. For DSA problems, use Mermaid diagrams to visualize:
    - Recursion trees (graph TD)
    - Pointer movement in arrays (graph LR with highlighted nodes)
    - Sliding window visualization
    - Stack/Queue operations
    - Graph traversals (BFS/DFS)
    - Linked list operations
11. For System Design problems, use Mermaid to show:
    - Architecture diagrams (graph TD)
    - Sequence diagrams for request flows
    - Data flow diagrams
12. Always use \`\`\`mermaid code blocks for diagrams. Use simple, clean syntax that renders well.`;

        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: systemMessage },
            ...chatHistory.slice(-20),
            { role: "user", content: userMessage },
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages,
            temperature: 0.7,
            max_tokens: 1000,
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
            return { success: false, error: "No response from AI mentor" };
        }

        return { success: true, message: response };
    } catch (err) {
        console.error("[getMentorResponse] Error:", err);
        return { success: false, error: "Mentor unavailable. Please try again." };
    }
}
