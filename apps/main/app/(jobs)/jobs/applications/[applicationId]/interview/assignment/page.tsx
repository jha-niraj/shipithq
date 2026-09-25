import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import {
    Loader2
} from "lucide-react"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, jobApplications, jobs, companies } from "@repo/db"
import { eq, and } from "drizzle-orm"
import {
    AssignmentContent, type Application as AssignmentApplication
} from "./assignment-content"
import Loading from "./loading"

interface AssignmentPageProps {
    params: Promise<{
        applicationId: string
    }>
}

export async function generateMetadata({ params }: AssignmentPageProps) {
    const { applicationId } = await params
    const [row] = await db.select({ jobTitle: jobs.title })
        .from(jobApplications).innerJoin(jobs, eq(jobs.id, jobApplications.jobId))
        .where(eq(jobApplications.id, applicationId)).limit(1)
    return {
        title: row ? `Assignment - ${row.jobTitle} | ShipItHQ` : "Assignment | ShipItHQ",
        description: "Complete your take-home assignment"
    }
}

// Helper to safely parse JSON fields
function parseJsonField<T>(value: unknown, defaultValue: T): T {
    if (value === null || value === undefined) return defaultValue
    if (typeof value === 'object') return value as T
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as T
        } catch {
            return defaultValue
        }
    }
    return defaultValue
}

async function getAssignmentData(applicationId: string, userId: string) {
    const app = await db.query.jobApplications.findFirst({
        where: and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)),
    })
    if (!app) return null

    const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1)
    if (!job) return null

    const [company] = await db.select({ id: companies.id, name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl })
        .from(companies).where(eq(companies.id, job.companyId)).limit(1)

    return { ...app, job: { ...job, company: company ?? { id: "", name: "", slug: null, logoUrl: null } } }
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
    const session = await getSession(headers())
    if (!session?.user?.id) {
        redirect("/signin")
    }

    const { applicationId } = await params
    const application = await getAssignmentData(applicationId, session.user.id)

    if (!application) {
        notFound()
    }

    // Check if application has access to assignment
    const allowedStatuses = ["ASSIGNMENT_SENT", "ASSIGNMENT_SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "OFFER_EXTENDED", "HIRED"]
    if (!allowedStatuses.includes(application.status) || !application.job.hasAssignment) {
        redirect(`/jobs/applications/${applicationId}/interview`)
    }

    // Transform data to match the component's expected types
    const transformedApplication: AssignmentApplication = {
        id: application.id,
        status: application.status,
        assignmentStartedAt: application.assignmentStartedAt,
        assignmentSubmittedAt: application.assignmentSubmittedAt,
        assignmentScore: application.assignmentScore,
        assignmentFeedback: application.assignmentFeedback,
        job: {
            id: application.job.id,
            title: application.job.title,
            slug: application.job.slug,
            hasAssignment: application.job.hasAssignment,
            assignmentDetails: parseJsonField(application.job.assignmentDetails, null),
            assignmentDeadlineDays: application.job.assignmentDeadlineDays,
            company: {
                id: application.job.company.id,
                name: application.job.company.name,
                slug: application.job.company.slug,
                logoUrl: application.job.company.logoUrl
            }
        }
    }

    return (
        <Suspense
            fallback={<Loading />}
        >
            <AssignmentContent application={transformedApplication} />
        </Suspense>
    )
}