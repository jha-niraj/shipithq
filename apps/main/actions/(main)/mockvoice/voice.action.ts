'use server'

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, users, mockInterviewVoice, mockVoiceSession, creditTransactions } from "@repo/db"
import { eq, and, or, ilike, desc, count, avg, type SQL } from "drizzle-orm"
import { revalidatePath } from 'next/cache'
import { openai } from '@/lib/openai-client'
import { modelFor } from '@repo/ai'

// ==========================================
// TYPES
// ==========================================

interface CreateCustomMockInput {
    title: string
    description: string
    category: string
    level: string
    duration: number
    questionsCount: number
    includeResume: boolean
    isPublic: boolean
    knowledgeBase?: string
    learnStepId?: string
}

// ==========================================
// FETCH ADMIN MOCKS (by category for tabs)
// ==========================================

export async function getAdminMocksByCategory(category?: string, limit: number = 6) {
    try {
        const conditions: (SQL | undefined)[] = [
            eq(mockInterviewVoice.byAdmin, true),
            eq(mockInterviewVoice.isPublic, true),
        ]

        if (category && category !== 'ALL') {
            conditions.push(eq(mockInterviewVoice.category, category as any))
        }

        const mocks = await db.query.mockInterviewVoice.findMany({
            where: and(...conditions),
            limit,
            orderBy: [
                desc(mockInterviewVoice.isFeatured),
                desc(mockInterviewVoice.popularity),
                desc(mockInterviewVoice.createdAt),
            ],
            columns: {
                id: true,
                title: true,
                description: true,
                category: true,
                level: true,
                duration: true,
                questionsCount: true,
                creditsRequired: true,
                tags: true,
                isFeatured: true,
                byAdmin: true,
                popularity: true,
                totalSessions: true,
                averageRating: true,
                createdAt: true,
            },
        })

        return { success: true, mocks }
    } catch (error) {
        console.error('Error fetching admin mocks:', error)
        return { success: false, error: 'Failed to fetch mocks', mocks: [] }
    }
}

export async function getAllAdminMocksGrouped() {
    try {
        const mocks = await db.query.mockInterviewVoice.findMany({
            where: and(
                eq(mockInterviewVoice.byAdmin, true),
                eq(mockInterviewVoice.isPublic, true)
            ),
            orderBy: [desc(mockInterviewVoice.isFeatured), desc(mockInterviewVoice.popularity)],
            columns: {
                id: true,
                title: true,
                description: true,
                category: true,
                level: true,
                duration: true,
                questionsCount: true,
                creditsRequired: true,
                tags: true,
                isFeatured: true,
                byAdmin: true,
                popularity: true,
                totalSessions: true,
                averageRating: true,
            },
        })

        const grouped = mocks.reduce((acc, mock) => {
            const cat = mock.category
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(mock)
            return acc
        }, {} as Record<string, typeof mocks>)

        return { success: true, mocks, grouped }
    } catch (error) {
        console.error('Error fetching grouped admin mocks:', error)
        return { success: false, error: 'Failed to fetch mocks', mocks: [], grouped: {} }
    }
}

export async function getFeaturedAdminMocks(limit: number = 6) {
    try {
        const mocks = await db.query.mockInterviewVoice.findMany({
            where: and(
                eq(mockInterviewVoice.byAdmin, true),
                eq(mockInterviewVoice.isFeatured, true),
                eq(mockInterviewVoice.isPublic, true)
            ),
            limit,
            orderBy: [desc(mockInterviewVoice.popularity)],
            columns: {
                id: true,
                title: true,
                description: true,
                category: true,
                level: true,
                duration: true,
                questionsCount: true,
                creditsRequired: true,
                tags: true,
                isFeatured: true,
                byAdmin: true,
                popularity: true,
                averageRating: true,
            },
        })

        return { success: true, mocks }
    } catch (error) {
        console.error('Error fetching featured mocks:', error)
        return { success: false, error: 'Failed to fetch featured mocks', mocks: [] }
    }
}

export async function getMockById(mockId: string) {
    try {
        const mock = await db.query.mockInterviewVoice.findFirst({
            where: eq(mockInterviewVoice.id, mockId),
            with: { createdBy: true },
        })

        if (!mock) {
            return { success: false, error: 'Mock not found' }
        }

        return { success: true, mock }
    } catch (error) {
        console.error('Error fetching mock:', error)
        return { success: false, error: 'Failed to fetch mock' }
    }
}

export async function createCustomMockVoice(input: CreateCustomMockInput) {
    try {
        const session = await getSession(headers())

        if (!session?.user?.id) {
            return { success: false, error: 'You must be logged in to create a mock interview' }
        }

        if (!input.title.trim() || !input.description.trim()) {
            return { success: false, error: 'Title and description are required' }
        }

        const baseCredits = input.duration
        const questionCredits = input.questionsCount * 2
        const subtotal = (baseCredits + questionCredits) * (input.isPublic ? 0.5 : 1)
        const resumeCredits = input.includeResume ? 5 : 0
        const creditsRequired = Math.ceil(subtotal + resumeCredits)

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: { credits: true, resume: true },
        })

        if (!user) {
            return { success: false, error: 'User not found' }
        }

        if (user.credits < creditsRequired) {
            return {
                success: false,
                error: `Insufficient credits. You need ${creditsRequired} credits but have ${user.credits}`,
            }
        }

        if (input.includeResume && !user.resume) {
            return {
                success: false,
                error: 'Resume is required but not found. Please upload your resume first.',
            }
        }

        // Generate or use provided knowledge base
        let knowledgeBase: string

        if (input.knowledgeBase && input.knowledgeBase.trim().length > 50) {
            try {
                const completion = await openai.chat.completions.create({
                    model: modelFor("mockKnowledgeFromSyllabus"),
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert interviewer. Enhance the provided syllabus/study materials into a structured interview knowledge base while preserving all the original content and topics.',
                        },
                        {
                            role: 'user',
                            content: `Create an interview knowledge base for: "${input.title}" (${input.level} level)

                                The user has provided their syllabus/study materials:
                                ---
                                ${input.knowledgeBase}
                                ---

                                Interview Parameters:
                                - Questions: ${input.questionsCount}
                                - Duration: ${input.duration} minutes
                                - Level: ${input.level}
                                ${input.includeResume ? '- Include resume-based questions' : ''}

                                Create a structured knowledge base that:
                                1. Covers ALL topics from the provided syllabus
                                2. Includes question suggestions for each topic
                                3. Defines expected answer depth for ${input.level} level
                                4. Adds follow-up question strategies

                                Preserve the user's content structure and priorities.`,
                        },
                    ],
                    temperature: 0.5,
                    max_tokens: 2500,
                })

                knowledgeBase = completion.choices[0]?.message?.content || input.knowledgeBase
            } catch (error) {
                console.error('Error enhancing knowledge base:', error)
                knowledgeBase = `You are conducting a ${input.level.toLowerCase()} level interview for: ${input.title}

                    STUDY MATERIALS/SYLLABUS PROVIDED BY USER:
                    ${input.knowledgeBase}

                    Interview Parameters:
                    - Questions: ${input.questionsCount}
                    - Duration: ${input.duration} minutes
                    - Level: ${input.level}

                    Ask questions directly from the topics above. Focus on the user's provided content.
                    ${input.includeResume ? 'Also personalize questions based on their resume.' : ''}`
            }
        } else {
            try {
                const completion = await openai.chat.completions.create({
                    model: modelFor("mockKnowledgeFromTitle"),
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert technical interviewer and career coach. Generate comprehensive, detailed knowledge bases for mock interviews that will guide an AI interviewer.',
                        },
                        {
                            role: 'user',
                            content: `Generate a comprehensive knowledge base for conducting a ${input.level.toLowerCase()} level interview for the position: "${input.title}".

                            Job Description/Focus Areas:
                            ${input.description}

                            Interview Parameters:
                            - Number of Questions: ${input.questionsCount}
                            - Duration: ${input.duration} minutes
                            - Experience Level: ${input.level}
                            ${input.includeResume ? '- The candidate will provide their resume for personalized questions' : ''}

                            Create a detailed knowledge base that includes:
                            1. Key technical skills and Learns to assess
                            2. Specific question types (technical, behavioral, scenario-based)
                            3. Expected depth of answers for ${input.level} level
                            4. Red flags to watch for
                            5. Positive indicators of strong candidates
                            6. Follow-up question strategies
                            7. Industry-specific best practices

                            Make it specific, actionable, and comprehensive enough for an AI to conduct a professional interview.`,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                })

                knowledgeBase =
                    completion.choices[0]?.message?.content ||
                    `You are conducting a ${input.level.toLowerCase()} level interview for ${input.title}. ${input.description}`
            } catch (error) {
                console.error('Error generating knowledge base:', error)
                knowledgeBase = `You are conducting a ${input.level.toLowerCase()} level interview for the position of ${input.title}.

                    Description: ${input.description}

                    Interview Structure:
                    - Total Questions: ${input.questionsCount}
                    - Duration: ${input.duration} minutes
                    - Level: ${input.level}

                    Ask relevant questions based on the description and level. Focus on assessing the candidate's:
                    - Technical knowledge and skills
                    - Problem-solving abilities
                    - Communication clarity
                    - Experience and understanding

                    ${input.includeResume ? 'The candidate has provided their resume. Use this context to ask personalized questions about their experience.' : ''}

                    Be professional, supportive, and constructive in your approach.`
            }
        }

        // Create mock and deduct credits
        const [mock] = await db
            .insert(mockInterviewVoice)
            .values({
                title: input.title.trim(),
                description: input.description.trim(),
                category: (input.category || 'TECHNICAL') as any,
                level: input.level as any,
                duration: input.duration,
                questionsCount: input.questionsCount,
                isPublic: input.isPublic,
                isPredefined: false,
                byAdmin: false,
                knowledgeBase,
                createdById: session.user.id,
                includesResume: input.includeResume,
                baseCredits: baseCredits + questionCredits,
                creditsRequired,
                tags: [],
            })
            .returning({ id: mockInterviewVoice.id })

        if (!mock) throw new Error("Failed to create mock")

        await db
            .update(users)
            .set({ credits: user.credits - creditsRequired })
            .where(eq(users.id, session.user.id))

        await db.insert(creditTransactions).values({
            userId: session.user.id,
            amount: -creditsRequired,
            type: 'SPEND',
            description: `Custom Mock Interview: ${input.title}`,
            currency: 'INR',
        })

        revalidatePath('/mockinterview/voice')
        revalidatePath('/mockinterview/voice/publicmocks')
        revalidatePath('/mockinterview/voice/mymocks')

        return { success: true, mockId: mock.id }
    } catch (error) {
        console.error('Error creating custom mock:', error)
        return { success: false, error: 'Failed to create mock interview. Please try again.' }
    }
}

export async function getFeaturedPublicMocks(limit: number = 6) {
    try {
        const mocks = await db.query.mockInterviewVoice.findMany({
            where: and(
                eq(mockInterviewVoice.isPublic, true),
                eq(mockInterviewVoice.isPredefined, false),
            ),
            limit,
            orderBy: [desc(mockInterviewVoice.averageRating), desc(mockInterviewVoice.totalSessions)],
            with: {
                createdBy: true,
                sessions: true,
            },
        })

        // filter averageRating >= 4.0 in JS since drizzle where on real can be tricky
        const filtered = mocks.filter(m => (m.averageRating || 0) >= 4.0)

        return { success: true, mocks: filtered }
    } catch (error) {
        console.error('Error fetching featured mocks:', error)
        return { success: false, error: 'Failed to fetch featured mocks', mocks: [] }
    }
}

export async function getCreatedVoiceMocks(category?: string, limit: number = 50) {
    try {
        const session = await getSession(headers())

        if (!session?.user?.id) {
            return { success: false, error: 'You must be logged in', mocks: [] }
        }

        const conditions: (SQL | undefined)[] = [eq(mockInterviewVoice.createdById, session.user.id)]
        if (category) {
            conditions.push(eq(mockInterviewVoice.category, category as any))
        }

        const mocks = await db.query.mockInterviewVoice.findMany({
            where: and(...conditions),
            limit,
            orderBy: [desc(mockInterviewVoice.createdAt)],
            columns: {
                id: true,
                title: true,
                description: true,
                category: true,
                level: true,
                duration: true,
                questionsCount: true,
                creditsRequired: true,
                tags: true,
                isPublic: true,
                byAdmin: true,
                popularity: true,
                totalSessions: true,
                averageRating: true,
                createdAt: true,
            },
        })

        return { success: true, mocks }
    } catch (error) {
        console.error('Error fetching user mocks:', error)
        return { success: false, error: 'Failed to fetch mocks', mocks: [] }
    }
}

export async function getPublicVoiceMocks(params?: {
    page?: number
    limit?: number
    level?: string
    category?: string
    search?: string
    includeAdmin?: boolean
}) {
    try {
        const page = params?.page || 1
        const limit = params?.limit || 20
        const offset = (page - 1) * limit

        const conditions: (SQL | undefined)[] = [eq(mockInterviewVoice.isPublic, true)]

        if (!params?.includeAdmin) {
            conditions.push(eq(mockInterviewVoice.byAdmin, false))
        }
        if (params?.level && params.level !== 'ALL') {
            conditions.push(eq(mockInterviewVoice.level, params.level as any))
        }
        if (params?.category && params.category !== 'ALL') {
            conditions.push(eq(mockInterviewVoice.category, params.category as any))
        }
        if (params?.search) {
            conditions.push(
                or(
                    ilike(mockInterviewVoice.title, `%${params.search}%`),
                    ilike(mockInterviewVoice.description, `%${params.search}%`)
                )
            )
        }

        const whereClause = and(...conditions)

        const [mocks, totalRows] = await Promise.all([
            db.query.mockInterviewVoice.findMany({
                where: whereClause,
                offset,
                limit,
                orderBy: [
                    desc(mockInterviewVoice.byAdmin),
                    desc(mockInterviewVoice.popularity),
                    desc(mockInterviewVoice.createdAt),
                ],
                with: { createdBy: true },
            }),
            db
                .select({ total: count() })
                .from(mockInterviewVoice)
                .where(whereClause),
        ])
        const total = totalRows[0]?.total ?? 0

        return {
            success: true,
            mocks,
            total: Number(total),
            totalPages: Math.ceil(Number(total) / limit),
            currentPage: page,
        }
    } catch (error) {
        console.error('Error fetching public mocks:', error)
        return { success: false, error: 'Failed to fetch public mocks' }
    }
}

export async function getAllPublicMocks(params?: {
    page?: number
    limit?: number
    level?: string
    category?: string
    search?: string
}) {
    try {
        const page = params?.page || 1
        const limit = params?.limit || 20
        const offset = (page - 1) * limit

        const conditions: (SQL | undefined)[] = [eq(mockInterviewVoice.isPublic, true)]

        if (params?.level && params.level !== 'ALL') {
            conditions.push(eq(mockInterviewVoice.level, params.level as any))
        }
        if (params?.category && params.category !== 'ALL') {
            conditions.push(eq(mockInterviewVoice.category, params.category as any))
        }
        if (params?.search) {
            conditions.push(
                or(
                    ilike(mockInterviewVoice.title, `%${params.search}%`),
                    ilike(mockInterviewVoice.description, `%${params.search}%`)
                )
            )
        }

        const whereClause = and(...conditions)

        const [mocks, totalRows2] = await Promise.all([
            db.query.mockInterviewVoice.findMany({
                where: whereClause,
                offset,
                limit,
                orderBy: [
                    desc(mockInterviewVoice.byAdmin),
                    desc(mockInterviewVoice.isFeatured),
                    desc(mockInterviewVoice.popularity),
                    desc(mockInterviewVoice.createdAt),
                ],
                with: { createdBy: true },
            }),
            db
                .select({ total: count() })
                .from(mockInterviewVoice)
                .where(whereClause),
        ])
        const total2 = totalRows2[0]?.total ?? 0

        return {
            success: true,
            mocks,
            total: Number(total2),
            totalPages: Math.ceil(Number(total2) / limit),
            currentPage: page,
        }
    } catch (error) {
        console.error('Error fetching all public mocks:', error)
        return { success: false, error: 'Failed to fetch mocks' }
    }
}

export async function getUserCreatedMocks(userId?: string) {
    try {
        const session = await getSession(headers())

        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const targetUserId = userId || session.user.id

        const mocks = await db.query.mockInterviewVoice.findMany({
            where: and(
                eq(mockInterviewVoice.createdById, targetUserId),
                eq(mockInterviewVoice.isPredefined, false)
            ),
            orderBy: desc(mockInterviewVoice.createdAt),
            with: { sessions: true },
        })

        return { success: true, mocks }
    } catch (error) {
        console.error('Error fetching user created mocks:', error)
        return { success: false, error: 'Failed to fetch your mocks' }
    }
}

export async function getUserMockSessions(userId?: string) {
    try {
        const session = await getSession(headers())

        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const targetUserId = userId || session.user.id

        const sessions = await db.query.mockVoiceSession.findMany({
            where: eq(mockVoiceSession.userId, targetUserId),
            orderBy: desc(mockVoiceSession.createdAt),
            with: { mock: true },
        })

        return { success: true, sessions }
    } catch (error) {
        console.error('Error fetching user sessions:', error)
        return { success: false, error: 'Failed to fetch your sessions' }
    }
}

export async function deleteCustomMock(mockId: string) {
    try {
        const session = await getSession(headers())

        if (!session?.user?.id) {
            return { success: false, error: 'Authentication required' }
        }

        const mock = await db.query.mockInterviewVoice.findFirst({
            where: eq(mockInterviewVoice.id, mockId),
            columns: { createdById: true, isPredefined: true },
        })

        if (!mock) {
            return { success: false, error: 'Mock not found' }
        }

        if (mock.isPredefined) {
            return { success: false, error: 'Cannot delete predefined mocks' }
        }

        if (mock.createdById !== session.user.id) {
            return { success: false, error: 'You can only delete your own mocks' }
        }

        await db.delete(mockInterviewVoice).where(eq(mockInterviewVoice.id, mockId))

        revalidatePath('/mockinterview/voice/mymocks')
        revalidatePath('/mockinterview/voice/publicmocks')

        return { success: true }
    } catch (error) {
        console.error('Error deleting mock:', error)
        return { success: false, error: 'Failed to delete mock' }
    }
}

export async function getVoiceMockStats() {
    try {
        const [totalMocksRow, totalSessionsRow, avgRatingRow] = await Promise.all([
            db
                .select({ cnt: count() })
                .from(mockInterviewVoice)
                .where(eq(mockInterviewVoice.isPublic, true))
                .then(([r]) => r),
            db.select({ cnt: count() }).from(mockVoiceSession).then(([r]) => r),
            db
                .select({ avg: avg(mockInterviewVoice.averageRating) })
                .from(mockInterviewVoice)
                .where(eq(mockInterviewVoice.isPublic, true))
                .then(([r]) => r),
        ])

        return {
            success: true,
            stats: {
                totalMocks: Number(totalMocksRow?.cnt ?? 0),
                totalSessions: Number(totalSessionsRow?.cnt ?? 0),
                avgRating: avgRatingRow?.avg ? Number(avgRatingRow.avg) : 0,
            },
        }
    } catch (error) {
        console.error('Error fetching voice mock stats:', error)
        return { success: false, stats: null }
    }
}
