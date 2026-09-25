import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getResumeDrafts, getResumeTemplates } from '@/actions/(main)/ai/resume-draft.action'
import { getMyProfileLinks } from '@/actions/(main)/user/profile-links.action'
import { isOrigin } from '@/lib/resume/origin'
import { ResumeHub } from './_components/resume-hub'

export const metadata = {
    title: 'Resume Builder | ShipItHQ',
    description: 'Create, import, and manage professional resumes powered by AI.',
}

export default async function ResumeHubPage({ searchParams }: {
    searchParams: Promise<{ origin?: string; import?: string }>
}) {
    const session = await getSession(headers())
    if (!session?.user?.id) redirect('/signin')

    const sp = await searchParams
    // Links are read here so the import sheet opens already filled (RES-23).
    const [draftsRes, templatesRes, links] = await Promise.all([
        getResumeDrafts(),
        getResumeTemplates(),
        getMyProfileLinks(),
    ])

    return (
        <div className="w-full min-h-screen">
            <div className="w-full px-page">
                <ResumeHub
                    drafts={draftsRes.drafts ?? []}
                    templates={templatesRes.templates ?? []}
                    links={links}
                    initialOrigin={isOrigin(sp.origin) ? sp.origin : undefined}
                    openImport={sp.import === '1'}
                />
            </div>
        </div>
    )
}
