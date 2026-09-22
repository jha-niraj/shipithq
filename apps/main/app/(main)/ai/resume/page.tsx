import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getResumeDrafts, getResumeTemplates } from '@/actions/(main)/ai/resume-draft.action'
import { ResumeHub } from './_components/resume-hub'

export const metadata = {
    title: 'Resume Builder | ShipItHQ',
    description: 'Create, import, and manage professional resumes powered by AI.',
}

export default async function ResumeHubPage() {
    const session = await getSession(headers())
    if (!session?.user?.id) redirect('/signin')

    const [draftsRes, templatesRes] = await Promise.all([
        getResumeDrafts(),
        getResumeTemplates(),
    ])

    return (
        <div className="w-full min-h-screen">
            <div className="w-full px-page">
                <ResumeHub
                    drafts={draftsRes.drafts ?? []}
                    templates={templatesRes.templates ?? []}
                />
            </div>
        </div>
    )
}
