// Interview Process Templates Actions
"use server"

import { db, interviewProcessTemplates, companyMembers } from "@repo/db"
import { eq, desc } from "drizzle-orm"
import { requirePermission } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

// Types
export interface TemplateRound {
    roundType: string
    title: string
    durationMinutes: number
    format: string
    description: string
}

export interface InterviewTemplate {
    id: string
    name: string
    description: string | null
    style: string
    category: string
    rounds: TemplateRound[]
    estimatedDurationWeeks: number | null
    roundCount: number
    isAiGenerated: boolean
    isPublic: boolean
    usageCount: number
    createdAt: Date
}

// Default templates (fallback when database is empty)
const defaultTemplates: Omit<InterviewTemplate, "id" | "createdAt">[] = [
    {
        name: "Startup Software Engineer",
        description: "Fast-paced interview process for early-stage startups. Focus on practical skills and cultural fit.",
        style: "STARTUP",
        category: "ENGINEERING",
        estimatedDurationWeeks: 1,
        roundCount: 3,
        isPublic: true,
        isAiGenerated: false,
        usageCount: 0,
        rounds: [
            { roundType: "PHONE_SCREEN", title: "Intro Call", durationMinutes: 30, format: "VOICE", description: "Quick chat to understand your background." },
            { roundType: "TECHNICAL_CODING", title: "Technical Round", durationMinutes: 60, format: "LIVE_CODING", description: "Hands-on coding session." },
            { roundType: "CULTURE_FIT", title: "Founder Chat", durationMinutes: 45, format: "VIDEO", description: "Meet the founders and discuss vision." }
        ]
    },
    {
        name: "FAANG Software Engineer",
        description: "Comprehensive technical interview process similar to top tech companies.",
        style: "FAANG",
        category: "ENGINEERING",
        estimatedDurationWeeks: 4,
        roundCount: 6,
        isPublic: true,
        isAiGenerated: false,
        usageCount: 0,
        rounds: [
            { roundType: "PHONE_SCREEN", title: "Recruiter Screen", durationMinutes: 30, format: "VOICE", description: "Initial screening." },
            { roundType: "TECHNICAL_CODING", title: "Phone Technical", durationMinutes: 45, format: "LIVE_CODING", description: "First technical screen." },
            { roundType: "TECHNICAL_CODING", title: "Onsite Coding 1", durationMinutes: 60, format: "LIVE_CODING", description: "Algorithm problems." },
            { roundType: "TECHNICAL_CODING", title: "Onsite Coding 2", durationMinutes: 60, format: "LIVE_CODING", description: "More coding challenges." },
            { roundType: "SYSTEM_DESIGN", title: "System Design", durationMinutes: 60, format: "WHITEBOARD", description: "Design scalable systems." },
            { roundType: "BEHAVIORAL", title: "Behavioral", durationMinutes: 45, format: "VIDEO", description: "Leadership principles." }
        ]
    },
    {
        name: "MNC Software Engineer",
        description: "Traditional corporate interview process with structured rounds.",
        style: "MNC",
        category: "ENGINEERING",
        estimatedDurationWeeks: 3,
        roundCount: 5,
        isPublic: true,
        isAiGenerated: false,
        usageCount: 0,
        rounds: [
            { roundType: "PHONE_SCREEN", title: "HR Screening", durationMinutes: 30, format: "VOICE", description: "Initial HR call." },
            { roundType: "TECHNICAL_CODING", title: "Technical Written", durationMinutes: 90, format: "WRITTEN_TEST", description: "Online assessment." },
            { roundType: "TECHNICAL_CODING", title: "Technical Interview", durationMinutes: 60, format: "VIDEO", description: "Technical discussion." },
            { roundType: "PANEL", title: "Panel Interview", durationMinutes: 60, format: "VIDEO", description: "Multiple interviewers." },
            { roundType: "HR_FINAL", title: "HR Final", durationMinutes: 30, format: "VIDEO", description: "Final HR discussion." }
        ]
    },
    {
        name: "Product Manager Interview",
        description: "Strategy and communication focused interview for PM roles.",
        style: "FAANG",
        category: "PRODUCT",
        estimatedDurationWeeks: 3,
        roundCount: 5,
        isPublic: true,
        isAiGenerated: false,
        usageCount: 0,
        rounds: [
            { roundType: "PHONE_SCREEN", title: "Recruiter Screen", durationMinutes: 30, format: "VOICE", description: "Initial discussion." },
            { roundType: "CUSTOM", title: "Product Sense", durationMinutes: 45, format: "VIDEO", description: "Product design questions." },
            { roundType: "CUSTOM", title: "Analytical / Metrics", durationMinutes: 45, format: "VIDEO", description: "Data-driven decisions." },
            { roundType: "CUSTOM", title: "Execution", durationMinutes: 60, format: "VIDEO", description: "Prioritization and roadmap." },
            { roundType: "BEHAVIORAL", title: "Leadership", durationMinutes: 45, format: "VIDEO", description: "Leadership principles." }
        ]
    },
    {
        name: "Designer Interview",
        description: "Portfolio-focused interview process for design roles.",
        style: "CUSTOM",
        category: "DESIGN",
        estimatedDurationWeeks: 2,
        roundCount: 4,
        isPublic: true,
        isAiGenerated: false,
        usageCount: 0,
        rounds: [
            { roundType: "CUSTOM", title: "Portfolio Review", durationMinutes: 45, format: "VIDEO", description: "Walk through your work." },
            { roundType: "TAKE_HOME", title: "Design Challenge", durationMinutes: 240, format: "TAKE_HOME", description: "Design exercise." },
            { roundType: "CUSTOM", title: "Design Critique", durationMinutes: 60, format: "VIDEO", description: "Present and discuss." },
            { roundType: "CULTURE_FIT", title: "Team Fit", durationMinutes: 45, format: "VIDEO", description: "Meet the team." }
        ]
    },
    {
        name: "Intern Interview",
        description: "Simplified process for internship positions.",
        style: "STARTUP",
        category: "INTERN",
        estimatedDurationWeeks: 1,
        roundCount: 2,
        isPublic: true,
        isAiGenerated: false,
        usageCount: 0,
        rounds: [
            { roundType: "PHONE_SCREEN", title: "Intro Call", durationMinutes: 20, format: "VOICE", description: "Quick intro call." },
            { roundType: "TECHNICAL_CODING", title: "Technical Discussion", durationMinutes: 45, format: "LIVE_CODING", description: "Simple coding problems." }
        ]
    }
]

// ============================================
// GET ALL TEMPLATES (with fallback)
// ============================================

export async function getInterviewTemplates(filters?: {
    style?: string
    category?: string
}) {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }

        // Try to fetch from database
        let templates: InterviewTemplate[]

        try {
            const dbTemplates = await db.query.interviewProcessTemplates.findMany({
                where: eq(interviewProcessTemplates.isPublic, true),
                orderBy: [
                    desc(interviewProcessTemplates.usageCount),
                    desc(interviewProcessTemplates.createdAt)
                ]
            })

            if (dbTemplates && dbTemplates.length > 0) {
                templates = dbTemplates.map((t) => ({
                    ...t,
                    rounds: t.rounds as unknown as TemplateRound[]
                }))
            } else {
                // Use default templates
                templates = defaultTemplates.map((t, idx) => ({
                    ...t,
                    id: `default-${idx}`,
                    createdAt: new Date()
                }))
            }
        } catch {
            // Database model doesn't exist yet, use defaults
            templates = defaultTemplates.map((t, idx) => ({
                ...t,
                id: `default-${idx}`,
                createdAt: new Date()
            }))
        }

        // Filter if needed
        if (filters?.style && filters.style !== "ALL") {
            templates = templates.filter(t => t.style === filters.style)
        }
        if (filters?.category && filters.category !== "ALL") {
            templates = templates.filter(t => t.category === filters.category)
        }

        return { success: true, data: templates }
    } catch (error) {
        console.error("Error fetching templates:", error)
        return { success: false, error: "Failed to fetch templates" }
    }
}

// ============================================
// GET SINGLE TEMPLATE
// ============================================

export async function getInterviewTemplate(id: string) {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }

        // Check if it's a default template
        if (id.startsWith("default-")) {
            const idx = parseInt(id.replace("default-", ""))
            if (defaultTemplates[idx]) {
                return {
                    success: true,
                    data: {
                        ...defaultTemplates[idx],
                        id,
                        createdAt: new Date()
                    } as InterviewTemplate
                }
            }
        }

        // Try database
        try {
            const template = await db.query.interviewProcessTemplates.findFirst({
                where: eq(interviewProcessTemplates.id, id)
            })

            if (template) {
                return {
                    success: true,
                    data: {
                        ...template,
                        rounds: template.rounds as unknown as TemplateRound[]
                    } as InterviewTemplate
                }
            }
        } catch {
            // Model doesn't exist
        }

        return { success: false, error: "Template not found" }
    } catch (error) {
        console.error("Error fetching template:", error)
        return { success: false, error: "Failed to fetch template" }
    }
}

// ============================================
// INCREMENT TEMPLATE USAGE
// ============================================

export async function incrementTemplateUsage(id: string) {
    try {
        const auth = await requirePermission("manage_pipelines")
        if (!auth.ok) return { success: false, error: auth.error }

        if (id.startsWith("default-")) {
            return { success: true }
        }

        const existing = await db.query.interviewProcessTemplates.findFirst({
            where: eq(interviewProcessTemplates.id, id),
            columns: { id: true, usageCount: true }
        })

        if (existing) {
            await db.update(interviewProcessTemplates)
                .set({ usageCount: existing.usageCount + 1 })
                .where(eq(interviewProcessTemplates.id, id))
        }

        return { success: true }
    } catch (error) {
        console.error("Error incrementing usage:", error)
        return { success: false, error: "Failed to update usage" }
    }
}

// ============================================
// AI TEMPLATE GENERATION (placeholder - requires OpenAI)
// ============================================

interface AIGenerationInput {
    style: "STARTUP" | "FAANG" | "MNC"
    roleType: string
    customPrompt?: string
}

export async function generateInterviewTemplate(input: AIGenerationInput) {
    const auth = await requirePermission("manage_pipelines")
    if (!auth.ok) return { success: false, error: auth.error }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    if (!OPENAI_API_KEY) {
        // Return a template based on style as fallback
        const fallbackTemplate = defaultTemplates.find(t => t.style === input.style) || defaultTemplates[0]
        return {
            success: true,
            data: {
                ...fallbackTemplate,
                id: `generated-${Date.now()}`,
                name: `${input.style} ${input.roleType} Process`,
                description: `AI-inspired interview process for ${input.roleType} (${input.style} style)`,
                createdAt: new Date()
            } as InterviewTemplate
        }
    }

    async function callOpenAI(messages: Array<{role: string; content: string}>, model = "gpt-4o") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ model, messages, temperature: 0.7 }),
        })
        if (!res.ok) throw new Error(`OpenAI error ${res.status}`)
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        return data.choices[0]?.message?.content ?? ""
    }

    try {
        const styleDescriptions = {
            STARTUP: "Fast-paced startup environment with fewer rounds, focus on practical skills, adaptability, and cultural fit. Usually 2-3 rounds completing within 1 week.",
            FAANG: "Rigorous process similar to top tech companies (Google, Meta, Amazon). Heavy focus on algorithms, system design, and behavioral questions. Usually 5-6 rounds over 3-4 weeks.",
            MNC: "Traditional corporate style with structured rounds, panel interviews, and HR involvement. Usually 4-5 rounds over 2-3 weeks."
        }

        const systemPrompt = `You are an expert HR consultant who designs interview processes for tech companies.
Generate a detailed interview process based on the given style and role type.

The interview process should include:
1. Round type (PHONE_SCREEN, TECHNICAL_CODING, SYSTEM_DESIGN, BEHAVIORAL, TAKE_HOME, PANEL, HIRING_MANAGER, CULTURE_FIT, HR_FINAL, or CUSTOM)
2. Title for each round
3. Duration in minutes (realistic durations)
4. Format (VOICE, VIDEO, LIVE_CODING, WHITEBOARD, TAKE_HOME, WRITTEN_TEST)
5. Description of what happens in each round

Return ONLY a valid JSON object with this exact structure:
{
    "name": "string - process name",
    "description": "string - brief description",
    "estimatedDurationWeeks": number,
    "rounds": [
        {
            "roundType": "string",
            "title": "string",
            "durationMinutes": number,
            "format": "string",
            "description": "string"
        }
    ]
}`

        const userPrompt = `Create an interview process for:
- Style: ${input.style} - ${styleDescriptions[input.style]}
- Role: ${input.roleType}
${input.customPrompt ? `- Additional requirements: ${input.customPrompt}` : ""}

Generate a realistic and comprehensive interview process.`

        const content = await callOpenAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ], "gpt-4o-mini")

        if (!content) {
            return { success: false, error: "No response from AI" }
        }

        const generated = JSON.parse(content) as {
            name: string
            description: string
            estimatedDurationWeeks: number
            rounds: TemplateRound[]
        }

        // Try to save to database
        try {
            const insertedTemplates = await db.insert(interviewProcessTemplates).values({
                name: generated.name,
                description: generated.description,
                style: input.style,
                category: "GENERAL",
                rounds: generated.rounds as unknown as Record<string, unknown>[],
                estimatedDurationWeeks: generated.estimatedDurationWeeks,
                roundCount: generated.rounds.length,
                isAiGenerated: true,
                aiPrompt: userPrompt,
                isPublic: true,
                createdByCompanyId: auth.ctx.companyId,
                createdByUserId: auth.ctx.userId
            }).returning()

            const template = insertedTemplates[0]
            if (!template) throw new Error("Failed to save template")

            revalidatePath("/interview-config")

            return {
                success: true,
                data: {
                    ...template,
                    rounds: template.rounds as unknown as TemplateRound[]
                } as InterviewTemplate
            }
        } catch {
            // Return generated template without saving
            return {
                success: true,
                data: {
                    id: `generated-${Date.now()}`,
                    ...generated,
                    style: input.style,
                    category: "GENERAL",
                    roundCount: generated.rounds.length,
                    isAiGenerated: true,
                    isPublic: true,
                    usageCount: 0,
                    createdAt: new Date()
                } as InterviewTemplate
            }
        }
    } catch (error) {
        console.error("Error generating template:", error)
        return { success: false, error: "Failed to generate template" }
    }
}

// ============================================
// GET TEMPLATES BY STYLE
// ============================================

export async function getTemplatesByStyle(style: "STARTUP" | "FAANG" | "MNC" | "ALL") {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    return getInterviewTemplates({ style })
}
