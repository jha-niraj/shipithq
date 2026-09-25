import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { 
    Loader2 
} from "lucide-react"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, jobApplications, jobs, companies, interviewProcesses, interviewRounds, interviewPrepProgress } from "@repo/db"
import { eq, and, asc } from "drizzle-orm"
import { 
    RoundContent, type Application as RoundApplication, type InterviewRound 
} from "./round-content"
import Loading from "./loading"

interface RoundPageProps {
    params: Promise<{
        applicationId: string
        roundId: string
    }>
}

export async function generateMetadata({ params }: RoundPageProps) {
    const { roundId } = await params
    const [round] = await db.select({ title: interviewRounds.title }).from(interviewRounds).where(eq(interviewRounds.id, roundId)).limit(1)
    return {
        title: round ? `${round.title} | Interview Round` : "Interview Round | ShipItHQ",
        description: "Prepare for your interview round"
    }
}

// Helper to safely parse JSON array fields
function parseJsonArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String)
    if (value === null || value === undefined) return []
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed.map(String) : []
        } catch {
            return []
        }
    }
    return []
}

async function getRoundData(applicationId: string, roundId: string, userId: string) {
    const app = await db.query.jobApplications.findFirst({
        where: and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)),
    })
    if (!app) return null

    const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1)
    if (!job) return null

    const [company] = await db.select({ id: companies.id, name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl })
        .from(companies).where(eq(companies.id, job.companyId)).limit(1)

    const [round] = await db.select().from(interviewRounds).where(eq(interviewRounds.id, roundId)).limit(1)
    if (!round) return null

    let processRounds: (typeof interviewRounds.$inferSelect)[] = []
    if (job.interviewProcessId) {
        processRounds = await db.select().from(interviewRounds)
            .where(eq(interviewRounds.processId, job.interviewProcessId))
            .orderBy(asc(interviewRounds.roundNumber))
    }

    const proc = job.interviewProcessId
        ? await db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, job.interviewProcessId) })
        : null

    const prep = await db.query.interviewPrepProgress.findFirst({ where: eq(interviewPrepProgress.applicationId, app.id) })

    return {
        application: {
            ...app,
            job: {
                ...job,
                company: company ?? { id: "", name: "", slug: null, logoUrl: null },
                interviewProcess: proc ? { ...proc, rounds: processRounds } : null,
            },
            prepProgress: prep ?? null,
        },
        round,
    }
}

export default async function RoundPage({ params }: RoundPageProps) {
    const session = await getSession(headers())
    if (!session?.user?.id) {
        redirect("/signin")
    }

    const { applicationId, roundId } = await params
    const data = await getRoundData(applicationId, roundId, session.user.id)

    if (!data) {
        notFound()
    }

    // Check if application has access to interviews
    const allowedStatuses = ["INTERVIEW_SCHEDULED", "INTERVIEWED", "OFFER_EXTENDED", "HIRED"]
    if (!allowedStatuses.includes(data.application.status)) {
        redirect(`/jobs/applications/${applicationId}/interview`)
    }

    // Transform application data
    const transformedApplication: RoundApplication = {
        id: data.application.id,
        status: data.application.status,
        interviewScheduledAt: data.application.interviewScheduledAt,
        job: {
            id: data.application.job.id,
            title: data.application.job.title,
            slug: data.application.job.slug,
            company: {
                id: data.application.job.company.id,
                name: data.application.job.company.name,
                slug: data.application.job.company.slug,
                logoUrl: data.application.job.company.logoUrl
            },
            interviewProcess: data.application.job.interviewProcess ? {
                id: data.application.job.interviewProcess.id,
                name: data.application.job.interviewProcess.name,
                rounds: data.application.job.interviewProcess.rounds.map(r => ({
                    id: r.id,
                    roundNumber: r.roundNumber,
                    roundType: r.roundType,
                    title: r.title,
                    description: r.description || "",
                    durationMinutes: r.durationMinutes,
                    format: r.format,
                    hasMockInterview: r.hasMockInterview,
                    whatToExpect: parseJsonArray(r.whatToExpect),
                    sampleQuestions: parseJsonArray(r.sampleQuestions),
                    evaluationCriteria: parseJsonArray(r.evaluationCriteria),
                    topicsCovered: parseJsonArray(r.topicsCovered),
                    tipsForCandidates: parseJsonArray(r.tipsForCandidates)
                }))
            } : null
        },
        prepProgress: data.application.prepProgress ? {
            id: data.application.prepProgress.id,
            roundsCompleted: parseJsonArray(data.application.prepProgress.roundsCompleted) as unknown as number[]
        } : null
    }

    // Transform round data
    const transformedRound: InterviewRound = {
        id: data.round.id,
        roundNumber: data.round.roundNumber,
        roundType: data.round.roundType,
        title: data.round.title,
        description: data.round.description || "",
        durationMinutes: data.round.durationMinutes,
        format: data.round.format,
        hasMockInterview: data.round.hasMockInterview,
        whatToExpect: parseJsonArray(data.round.whatToExpect),
        sampleQuestions: parseJsonArray(data.round.sampleQuestions),
        evaluationCriteria: parseJsonArray(data.round.evaluationCriteria),
        topicsCovered: parseJsonArray(data.round.topicsCovered),
        tipsForCandidates: parseJsonArray(data.round.tipsForCandidates)
    }

    return (
        <Suspense
            fallback={<Loading />}
        >
            <RoundContent application={transformedApplication} round={transformedRound} />
        </Suspense>
    )
}