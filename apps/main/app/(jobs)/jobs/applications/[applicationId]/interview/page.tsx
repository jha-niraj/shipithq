import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, jobApplications, jobs, companies, interviewProcesses, interviewRounds, interviewPrepProgress } from "@repo/db"
import { eq, and, asc } from "drizzle-orm"
import { InterviewJourneyLayout } from "./components/interview-journey-layout"
import Loading from "./loading"

interface InterviewJourneyPageProps {
    params: Promise<{
        applicationId: string
    }>
}

export async function generateMetadata({ params }: InterviewJourneyPageProps) {
    const { applicationId } = await params
    const [app] = await db.select({ jobTitle: jobs.title })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobs.id, jobApplications.jobId))
        .where(eq(jobApplications.id, applicationId))
        .limit(1)
    return {
        title: app ? `Interview Journey - ${app.jobTitle} | ShipItHQ` : "Interview Journey | ShipItHQ",
        description: "Track your interview progress and prepare for each round"
    }
}

// Type for transformed application data
type TransformedApplication = {
    id: string
    status: string
    assignmentStartedAt: Date | null
    assignmentSubmittedAt: Date | null
    assignmentScore: number | null
    assignmentFeedback: unknown
    interviewScheduledAt: Date | null
    interviewCompletedAt: Date | null
    interviewFeedback: unknown
    job: {
        id: string
        title: string
        slug: string
        hasAssignment: boolean
        assignmentDetails: unknown
        assignmentDeadlineDays: number | null
        company: {
            id: string
            name: string
            slug: string | null
            logoUrl: string | null
        }
        interviewProcess: {
            id: string
            name: string
            description: string | null
            rounds: Array<{
                id: string
                roundNumber: number
                roundType: string
                title: string
                description: string
                durationMinutes: number | null
                format: string
                hasMockInterview: boolean
                whatToExpect: unknown
                sampleQuestions: unknown
                tipsForCandidates: unknown
            }>
        } | null
    }
    prepProgress: {
        id: string
        overallReadinessScore?: number
        readinessScore?: number
        roundsCompleted?: number | number[]
    } | null
}

async function getApplicationWithInterviewData(applicationId: string, userId: string): Promise<TransformedApplication | null> {
    const app = await db.query.jobApplications.findFirst({
        where: and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)),
    })
    if (!app) return null

    const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1)
    if (!job) return null

    const [company] = await db.select({ id: companies.id, name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl })
        .from(companies).where(eq(companies.id, job.companyId)).limit(1)

    let process: TransformedApplication["job"]["interviewProcess"] = null
    if (job.interviewProcessId) {
        const [proc] = await db.select().from(interviewProcesses).where(eq(interviewProcesses.id, job.interviewProcessId)).limit(1)
        if (proc) {
            const rounds = await db.select().from(interviewRounds)
                .where(eq(interviewRounds.processId, proc.id))
                .orderBy(asc(interviewRounds.roundNumber))
            process = {
                id: proc.id, name: proc.name, description: proc.description,
                rounds: rounds.map(r => ({
                    id: r.id, roundNumber: r.roundNumber, roundType: r.roundType,
                    title: r.title, description: r.description, durationMinutes: r.durationMinutes,
                    format: r.format, hasMockInterview: r.hasMockInterview,
                    whatToExpect: r.whatToExpect, sampleQuestions: r.sampleQuestions,
                    tipsForCandidates: r.tipsForCandidates,
                }))
            }
        }
    }

    const prep = await db.query.interviewPrepProgress.findFirst({ where: eq(interviewPrepProgress.applicationId, app.id) })

    return {
        id: app.id, status: app.status,
        assignmentStartedAt: app.assignmentStartedAt, assignmentSubmittedAt: app.assignmentSubmittedAt,
        assignmentScore: app.assignmentScore, assignmentFeedback: app.assignmentFeedback,
        interviewScheduledAt: app.interviewScheduledAt, interviewCompletedAt: app.interviewCompletedAt,
        interviewFeedback: app.interviewFeedback,
        job: {
            id: job.id, title: job.title, slug: job.slug,
            hasAssignment: job.hasAssignment, assignmentDetails: job.assignmentDetails,
            assignmentDeadlineDays: job.assignmentDeadlineDays,
            company: company ?? { id: "", name: "", slug: null, logoUrl: null },
            interviewProcess: process,
        },
        prepProgress: prep ? {
            id: prep.id,
            overallReadinessScore: prep.overallReadinessScore ?? undefined,
            readinessScore: prep.overallReadinessScore ?? undefined,
            roundsCompleted: prep.roundsCompleted as number | number[] | undefined,
        } : null,
    }
}

export default async function InterviewJourneyPage({ params }: InterviewJourneyPageProps) {
    const session = await getSession(headers())
    if (!session?.user?.id) {
        redirect("/signin")
    }

    const { applicationId } = await params
    const application = await getApplicationWithInterviewData(applicationId, session.user.id)

    if (!application) {
        notFound()
    }

    // Check if the application status allows viewing interview journey
    const allowedStatuses = [
        "SHORTLISTED", 
        "ASSIGNMENT_SENT", 
        "ASSIGNMENT_SUBMITTED",
        "INTERVIEW_SCHEDULED", 
        "INTERVIEWED", 
        "OFFER_EXTENDED", 
        "HIRED"
    ]
    
    if (!allowedStatuses.includes(application.status)) {
        redirect(`/jobs/applications`)
    }

    return (
        <Suspense
            fallback={<Loading />}
        >
            <InterviewJourneyLayout application={application} />
        </Suspense>
    )
}
