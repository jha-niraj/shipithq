import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@repo/auth'
import { countResumeView, loadPublicResume } from '@/lib/resume/public'
import { ResumeDraftContent, PLATFORM_TEMPLATES } from '@/types/resume-draft'
import { Button } from '@repo/ui/components/ui/button'
import { Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params
    const draft = await loadPublicResume(slug)
    if (!draft) {
        // Missing and private look the same, and neither should be indexed.
        return { title: 'Resume not found', robots: { index: false, follow: false } }
    }
    const name = draft.user?.name ?? 'Developer'
    return {
        // The root layout appends " | ShipItHQ".
        title: `${name}'s Resume`,
        description: `View ${name}'s professional resume built with ShipItHQ.`,
    }
}

export default async function PublicResumePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // In `(public)`: a resume its owner published opens for anyone with the link
    // (plan/resume RES-24). A private or missing slug is a plain 404.
    const draft = await loadPublicResume(slug)
    if (!draft) notFound()
    const session = await getSession(await headers())
    await countResumeView(draft, session?.user?.id ?? null)

    const content = draft.content as ResumeDraftContent
    const user = draft.user as { name: string | null; username: string | null; image: string | null }
    const platDef = PLATFORM_TEMPLATES.find(p => p.slug === draft.templateSlug)
    const accent = platDef?.config.primaryColor ?? '#1a1a1a'

    const { header, experience, projects, education, skills, certifications } = content

    function fmt(d?: string) {
        if (!d) return ''
        try { return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) } catch { return d }
    }

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 py-8 px-4">
            {/* Action bar */}
            <div className="max-w-[700px] mx-auto flex items-center justify-between mb-4">
                <Link href="/">
                    <Button variant="ghost" size="sm" className="text-neutral-600 dark:text-neutral-400">
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                        Back to ShipItHQ
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    {user?.name && <span className="text-sm text-neutral-500 dark:text-neutral-400">Resume by {user.name}</span>}
                    <a href={`/api/resume/pdf/${draft.id}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Download PDF
                        </Button>
                    </a>
                </div>
            </div>

            {/* Resume paper */}
            <div className="max-w-[700px] mx-auto bg-white shadow-xl rounded-lg p-10 text-xs leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#1a1a1a' }}>
                {/* Header */}
                <div style={{ borderBottomWidth: 2, borderBottomColor: accent, paddingBottom: 10, marginBottom: 14 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.5px' }}>{header.name}</h1>
                    {header.title && <p style={{ fontSize: 13, color: '#737373', marginTop: 3 }}>{header.title}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, color: '#737373', fontSize: 11 }}>
                        {[header.email, header.phone, header.location, header.github, header.linkedin, header.website].filter(Boolean).map((v, i) => <span key={i}>{v}</span>)}
                    </div>
                </div>

                {header.summary && (
                    <p style={{ color: '#525252', marginBottom: 14, lineHeight: 1.6, fontSize: 11 }}>{header.summary}</p>
                )}

                {experience.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                        <SectionHeader title="Experience" color={accent} />
                        {experience.map(e => (
                            <div key={e.id} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontWeight: 700, fontSize: 12 }}>{e.role} <span style={{ color: '#737373', fontWeight: 400 }}>at {e.company}</span></span>
                                    <span style={{ color: '#a3a3a3', fontSize: 10 }}>{fmt(e.startDate)} - {e.current ? 'Present' : fmt(e.endDate)}</span>
                                </div>
                                {e.bullets.filter(Boolean).map((b, i) => (
                                    <p key={i} style={{ paddingLeft: 14, color: '#404040', marginTop: 2, lineHeight: 1.5 }}>• {b}</p>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {skills.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                        <SectionHeader title="Skills" color={accent} />
                        {skills.map((g, gi) => (
                            <div key={gi} style={{ marginBottom: 4 }}>
                                <span style={{ fontWeight: 700 }}>{g.category}: </span>
                                <span style={{ color: '#525252' }}>{g.items.join(' · ')}</span>
                            </div>
                        ))}
                    </div>
                )}

                {projects.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                        <SectionHeader title="Projects" color={accent} />
                        {projects.map(p => (
                            <div key={p.id} style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                                    {p.liveUrl && <a href={p.liveUrl} style={{ color: accent, fontSize: 10 }} target="_blank" rel="noopener noreferrer">{p.liveUrl}</a>}
                                </div>
                                {p.technologies.length > 0 && <p style={{ color: '#a3a3a3', marginTop: 1, fontSize: 10 }}>{p.technologies.join(', ')}</p>}
                                {p.bullets.filter(Boolean).map((b, i) => <p key={i} style={{ paddingLeft: 14, color: '#404040', marginTop: 2, lineHeight: 1.5 }}>• {b}</p>)}
                            </div>
                        ))}
                    </div>
                )}

                {education.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                        <SectionHeader title="Education" color={accent} />
                        {education.map(e => (
                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span><span style={{ fontWeight: 700 }}>{e.institution}</span>{e.degree && <span style={{ color: '#737373' }}> · {e.degree}{e.field ? `, ${e.field}` : ''}</span>}</span>
                                <span style={{ color: '#a3a3a3', fontSize: 10 }}>{fmt(e.startDate)} - {fmt(e.endDate)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {certifications.length > 0 && (
                    <div>
                        <SectionHeader title="Certifications" color={accent} />
                        {certifications.map(c => (
                            <div key={c.id} style={{ marginBottom: 3 }}>
                                <span style={{ fontWeight: 700 }}>{c.name}</span>
                                {c.issuer && <span style={{ color: '#737373' }}> · {c.issuer}{c.date ? `, ${fmt(c.date)}` : ''}</span>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 8, textAlign: 'center', color: '#a3a3a3', fontSize: 9 }}>
                    Built with ShipItHQ Resume Builder
                </div>
            </div>
        </div>
    )
}

function SectionHeader({ title, color }: { title: string; color: string }) {
    return (
        <p style={{
            fontSize: 9, fontWeight: 700, color, textTransform: '', letterSpacing: 1.5,
            borderBottomWidth: 0.5, borderBottomColor: '#e5e5e5', paddingBottom: 3, marginBottom: 8
        }}>
            {title}
        </p>
    )
}
