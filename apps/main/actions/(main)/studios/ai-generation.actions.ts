"use server";

import { db } from "@repo/db";
import { studioSteps, studioQuizzes } from "@repo/db";
import { eq } from "drizzle-orm";
import { openai } from "@/lib/openai-client";
import { modelFor } from "@repo/ai";

// ─── Explanation ──────────────────────────────────────────────────────────────

export async function generateExplanation(
    studioId: string,
    prompt: string,
): Promise<{ success: boolean; stepId?: string; error?: string }> {
    try {
        const existing = await db.query.studioSteps.findFirst({
            where: (s, { and, eq }) => and(eq(s.studioId, studioId), eq(s.type, "EXPLANATION")),
        });

        const completion = await openai.chat.completions.create({
            model: modelFor("studioExplanation"),
            messages: [{ role: "user", content: prompt }],
        });
        const content = completion.choices[0]?.message?.content ?? "";

        if (existing) {
            await db.update(studioSteps).set({ content }).where(eq(studioSteps.id, existing.id));
            return { success: true, stepId: existing.id };
        }

        const count = await db.$count(studioSteps, eq(studioSteps.studioId, studioId));
        const [step] = await db.insert(studioSteps).values({
            studioId,
            type: "EXPLANATION",
            content,
            source: "AI",
            orderNumber: count + 1,
            metadata: {},
        }).returning({ id: studioSteps.id });

        return { success: true, stepId: step?.id };
    } catch (err) {
        console.error("generateExplanation error:", err);
        return { success: false, error: "Failed to generate explanation" };
    }
}

// ─── Videos ───────────────────────────────────────────────────────────────────

export async function generateVideos(
    studioId: string,
    topic: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const prompt = `List 3 YouTube video recommendations for learning "${topic}". Return as JSON array: [{ "title": "...", "channel": "...", "url": "https://youtube.com/..." }]`;
        const completion = await openai.chat.completions.create({
            model: modelFor("studioVideos"),
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        let videos: unknown[] = [];
        try {
            const parsed = JSON.parse(raw);
            videos = Array.isArray(parsed) ? parsed : (parsed.videos ?? parsed.items ?? []);
        } catch { /* ignore parse error */ }

        const existing = await db.query.studioSteps.findFirst({
            where: (s, { and, eq }) => and(eq(s.studioId, studioId), eq(s.type, "VIDEO")),
        });

        if (existing) {
            await db.update(studioSteps).set({ metadata: { videos } }).where(eq(studioSteps.id, existing.id));
        } else {
            const count = await db.$count(studioSteps, eq(studioSteps.studioId, studioId));
            await db.insert(studioSteps).values({
                studioId,
                type: "VIDEO",
                content: "",
                source: "AI",
                orderNumber: count + 1,
                metadata: { videos },
            });
        }

        return { success: true };
    } catch (err) {
        console.error("generateVideos error:", err);
        return { success: false, error: "Failed to generate videos" };
    }
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function generateDocuments(
    studioId: string,
    topic: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const prompt = `List 3 documentation / article references for "${topic}". Return JSON: [{ "title": "...", "source": "...", "url": "https://..." }]`;
        const completion = await openai.chat.completions.create({
            model: modelFor("studioDocuments"),
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        let docs: unknown[] = [];
        try {
            const parsed = JSON.parse(raw);
            docs = Array.isArray(parsed) ? parsed : (parsed.documents ?? parsed.items ?? []);
        } catch { /* ignore */ }

        const existing = await db.query.studioSteps.findFirst({
            where: (s, { and, eq }) => and(eq(s.studioId, studioId), eq(s.type, "DOCUMENT")),
        });

        if (existing) {
            await db.update(studioSteps).set({ metadata: { documents: docs } }).where(eq(studioSteps.id, existing.id));
        } else {
            const count = await db.$count(studioSteps, eq(studioSteps.studioId, studioId));
            await db.insert(studioSteps).values({
                studioId,
                type: "DOCUMENT",
                content: "",
                source: "AI",
                orderNumber: count + 1,
                metadata: { documents: docs },
            });
        }

        return { success: true };
    } catch (err) {
        console.error("generateDocuments error:", err);
        return { success: false, error: "Failed to generate documents" };
    }
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export async function generateQuiz(
    studioId: string,
    topic: string,
): Promise<{ success: boolean; quizId?: string; error?: string }> {
    try {
        const prompt = `Create a 5-question multiple-choice quiz about "${topic}". Return JSON: { "questions": [{ "question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..." }] }`;
        const completion = await openai.chat.completions.create({
            model: modelFor("studioQuiz"),
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);
        const questions = parsed.questions ?? [];

        const [quiz] = await db.insert(studioQuizzes).values({
            studioId,
            blockId: crypto.randomUUID(),
            title: `Quiz: ${topic}`,
            questions,
        }).returning({ id: studioQuizzes.id });

        const count = await db.$count(studioSteps, eq(studioSteps.studioId, studioId));
        await db.insert(studioSteps).values({
            studioId,
            type: "QUIZ",
            content: "",
            source: "AI",
            orderNumber: count + 1,
            metadata: { quizId: quiz?.id },
        });

        return { success: true, quizId: quiz?.id };
    } catch (err) {
        console.error("generateQuiz error:", err);
        return { success: false, error: "Failed to generate quiz" };
    }
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

export async function generateFlashcards(
    studioId: string,
    topic: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const prompt = `Create 10 flashcards for "${topic}". Return JSON: { "cards": [{ "front": "...", "back": "..." }] }`;
        const completion = await openai.chat.completions.create({
            model: modelFor("studioFlashcards"),
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);
        const cards = parsed.cards ?? [];

        const count = await db.$count(studioSteps, eq(studioSteps.studioId, studioId));
        await db.insert(studioSteps).values({
            studioId,
            type: "FLASHCARD",
            content: "",
            source: "AI",
            orderNumber: count + 1,
            metadata: { cards },
        });

        return { success: true };
    } catch (err) {
        console.error("generateFlashcards error:", err);
        return { success: false, error: "Failed to generate flashcards" };
    }
}

// ─── Get Quiz ─────────────────────────────────────────────────────────────────

export async function getQuizById(quizId: string) {
    try {
        const quiz = await db.query.studioQuizzes.findFirst({
            where: eq(studioQuizzes.id, quizId),
        });
        if (!quiz) return { success: false, error: "Quiz not found" };
        return { success: true, quiz };
    } catch (err) {
        console.error("getQuizById error:", err);
        return { success: false, error: "Failed to fetch quiz" };
    }
}

// ─── Enhance Note ─────────────────────────────────────────────────────────────

export async function enhanceNoteWithAI(
    content: string,
): Promise<{ success: boolean; enhanced?: string; error?: string }> {
    try {
        const completion = await openai.chat.completions.create({
            model: modelFor("studioNoteEnhance"),
            messages: [
                {
                    role: "system",
                    content: "You are a note-enhancement assistant. Improve the provided note by adding clarity, structure, examples, and better formatting while preserving the original meaning. Return the enhanced content in Markdown.",
                },
                { role: "user", content },
            ],
        });
        const enhanced = completion.choices[0]?.message?.content ?? content;
        return { success: true, enhanced };
    } catch (err) {
        console.error("enhanceNoteWithAI error:", err);
        return { success: false, error: "Failed to enhance note" };
    }
}
