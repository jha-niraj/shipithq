'use client'

import { useState } from 'react'
import { signOut, useSession } from '@repo/auth/client'
import { Input } from '@repo/ui/components/ui/input'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { SigningOutScreen } from '@repo/ui/components/ui/signing-out-screen'
import toast from '@repo/ui/components/ui/sonner'
import {
    Chip, OnboardingFrame, OnboardingStep, PanelMuted, StepField, StepFooter, type OnboardingPanel,
} from '@repo/ui/components/onboarding/split-onboarding'
import { completeOnboarding } from '@/actions/auth/onboarding.action'

/*
 * University onboarding in the shared split layout (plan/auth AUTH-14): one question at a
 * time, the auth panel on the left. Everything asked is saved: city, state, student count
 * and departments were asked before and dropped.
 */

const UNIVERSITY_TYPES = [
    { value: 'PUBLIC', label: 'Public University' },
    { value: 'PRIVATE', label: 'Private University' },
    { value: 'DEEMED', label: 'Deemed University' },
    { value: 'AUTONOMOUS', label: 'Autonomous College' },
    { value: 'AFFILIATED', label: 'Affiliated College' },
    { value: 'TECHNICAL_INSTITUTE', label: 'Technical Institute' },
    { value: 'STATE', label: 'State University' },
    { value: 'CENTRAL', label: 'Central University' },
    { value: 'COMMUNITY_COLLEGE', label: 'Community College' },
    { value: 'OTHER', label: 'Other' },
] as const

const STUDENT_COUNTS = ['Under 500 students', '500-1,000 students', '1,000-5,000 students', '5,000-10,000 students', '10,000+ students']

const DEPARTMENTS = [
    'Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering',
    'Mechanical Engineering', 'Civil Engineering', 'MBA / Business', 'Other Departments',
]

type JobTitle = Parameters<typeof completeOnboarding>[0]['userRole']

// Each role onto the job-title enum. Two used to send values the enum rejects (AUTH-14).
const ROLES: { label: string; title: JobTitle; custom?: string; head: boolean }[] = [
    { label: 'Chancellor / Vice Chancellor', title: 'CHANCELLOR', head: true },
    { label: 'Principal / Director', title: 'PRINCIPAL', head: true },
    { label: 'Registrar', title: 'REGISTRAR', head: true },
    { label: 'Dean', title: 'DEAN', head: true },
    { label: 'Head of Department', title: 'HOD', head: false },
    { label: 'Placement Head / TPO', title: 'PLACEMENT_COORDINATOR', head: false },
    { label: 'Professor / Faculty', title: 'PROFESSOR', head: false },
    { label: 'Administrative Staff', title: 'OTHER', custom: 'Administrative Staff', head: false },
]

type StepId = 'institution' | 'type' | 'role' | 'about' | 'departments' | 'campus'

const STEPS: { id: StepId; title: string; hint: string; optional?: boolean; panel: OnboardingPanel }[] = [
    { id: 'institution', title: 'Your institution', hint: 'Its name, and the email domain your students sign in with.',
        panel: { headline: <>Bring your campus <PanelMuted>online.</PanelMuted></>, sub: 'Six quick questions to set up your workspace.', art: 'roster' } },
    { id: 'type', title: 'What kind of institution is it?', hint: 'Pick the closest.',
        panel: { headline: <>Every campus is <PanelMuted>different.</PanelMuted></>, sub: 'This sets sensible defaults for your workspace.', art: 'terminal' } },
    { id: 'role', title: 'What is your role?', hint: 'Leadership roles get full admin access to the workspace.',
        panel: { headline: <>You set it <PanelMuted>up.</PanelMuted></>, sub: 'Faculty and staff join later by invite.', art: 'shield' } },
    { id: 'about', title: 'Tell students about it', hint: 'Optional. Shown on your institution page.', optional: true,
        panel: { headline: <>Your page, <PanelMuted>your words.</PanelMuted></>, sub: 'You can edit all of this later.', art: 'commit-graph' } },
    { id: 'departments', title: 'Which departments will use it first?', hint: 'Pick all that apply. You can add more later.', optional: true,
        panel: { headline: <>Start where it <PanelMuted>matters.</PanelMuted></>, sub: 'Each department gets its own space for classes and students.', art: 'contributions' } },
    { id: 'campus', title: 'Where is the main campus?', hint: 'Optional. City, state and roughly how many students.', optional: true,
        panel: { headline: <>Almost <PanelMuted>there.</PanelMuted></>, sub: 'Then your workspace is ready.', art: 'funnel' } },
]

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i

export default function OnboardingPage() {
    const { refetch } = useSession()
    const [i, setI] = useState(0)
    const [name, setName] = useState('')
    const [domain, setDomain] = useState('')
    const [type, setType] = useState('')
    const [role, setRole] = useState<number | null>(null)
    const [website, setWebsite] = useState('')
    const [description, setDescription] = useState('')
    const [departments, setDepartments] = useState<string[]>([])
    const [city, setCity] = useState('')
    const [state, setState] = useState('')
    const [students, setStudents] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [leaving, setLeaving] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)

    const step = STEPS[i]!
    const back = () => { if (i > 0) { setError(null); setI(i - 1) } }

    const save = async () => {
        const r = role === null ? null : ROLES[role]!
        const result = await completeOnboarding({
            universityName: name.trim(),
            emailDomain: domain.trim().toLowerCase().replace(/^@/, ''),
            universityType: type || undefined,
            website: website.trim() || undefined,
            description: description.trim() || undefined,
            city: city.trim() || undefined,
            state: state.trim() || undefined,
            studentCount: students || undefined,
            departments,
            userRole: r!.title,
            jobTitleCustom: r?.custom,
        })
        if (!result.success) throw new Error(result.error || 'Could not set up the workspace')
        await refetch()
        toast.success('Your workspace is ready')
        setLeaving(true)
        window.location.href = '/home'
    }

    const next = async (skip = false) => {
        if (busy) return
        setError(null)
        if (step.id === 'institution') {
            if (name.trim().length < 2) return setError('Add the institution\'s name.')
            if (!DOMAIN_RE.test(domain.trim().replace(/^@/, ''))) return setError('Add the email domain, like dtu.ac.in.')
        }
        if (step.id === 'type' && !type) return setError('Pick one.')
        if (step.id === 'role' && role === null) return setError('Pick your role.')
        if (skip) {
            if (step.id === 'about') { setWebsite(''); setDescription('') }
            if (step.id === 'departments') setDepartments([])
            if (step.id === 'campus') { setCity(''); setState(''); setStudents('') }
        }
        if (step.id !== 'campus') return setI(i + 1)
        setBusy(true)
        try {
            await save()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
        } finally {
            setBusy(false)
        }
    }

    const logout = async () => {
        if (loggingOut) return
        setLoggingOut(true)
        try {
            await Promise.all([signOut(), new Promise((r) => setTimeout(r, 1200))])
        } catch {
            // even if the sign-out call fails, send them to the sign-in screen
        }
        window.location.href = '/signin'
    }

    if (loggingOut) return <SigningOutScreen />
    if (leaving) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-white px-6 dark:bg-neutral-950">
                <div className="text-center">
                    <InlineLoader size="lg" />
                    <p className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">Setting up your workspace</p>
                </div>
            </div>
        )
    }

    return (
        <OnboardingFrame
            brand="ShipItHQ University"
            panel={step.panel}
            panelKey={step.id}
            steps={STEPS.length}
            current={i}
            onJump={(n) => { setError(null); setI(n) }}
            onLogout={logout}
            loggingOut={loggingOut}
            onEnter={() => void next()}
            onEscape={back}
        >
            <OnboardingStep
                key={step.id}
                title={step.title}
                hint={step.hint}
                error={error}
                wide={step.id === 'institution' || step.id === 'about' || step.id === 'campus'}
                footer={
                    <StepFooter
                        onBack={i > 0 ? back : undefined}
                        onSkip={step.optional ? () => void next(true) : undefined}
                        onNext={() => void next()}
                        nextLabel={step.id === 'campus' ? 'Finish setup' : 'Continue'}
                        busy={busy}
                    />
                }
            >
                {step.id === 'institution' && (
                    <div className="space-y-5">
                        <StepField label="Institution name">
                            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Delhi Technological University" />
                        </StepField>
                        <StepField label="Email domain">
                            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="dtu.ac.in" />
                        </StepField>
                    </div>
                )}
                {step.id === 'type' && (
                    <div className="flex flex-wrap gap-2">
                        {UNIVERSITY_TYPES.map((t) => <Chip key={t.value} on={type === t.value} onClick={() => setType(t.value)}>{t.label}</Chip>)}
                    </div>
                )}
                {step.id === 'role' && (
                    <div className="flex flex-wrap gap-2">
                        {ROLES.map((r, n) => <Chip key={r.label} on={role === n} onClick={() => setRole(n)}>{r.label}{r.head && <span className="ml-1 text-[11px] opacity-60">admin</span>}</Chip>)}
                    </div>
                )}
                {step.id === 'about' && (
                    <div className="space-y-5">
                        <StepField label="Website" optional>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://university.edu" />
                        </StepField>
                        <StepField label="About" optional>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} placeholder="Programmes, strengths, what students build here." />
                        </StepField>
                    </div>
                )}
                {step.id === 'departments' && (
                    <div className="flex flex-wrap gap-2">
                        {DEPARTMENTS.map((d) => {
                            const on = departments.includes(d)
                            return <Chip key={d} on={on} onClick={() => setDepartments(on ? departments.filter((x) => x !== d) : [...departments, d])}>{d}</Chip>
                        })}
                    </div>
                )}
                {step.id === 'campus' && (
                    <div className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <StepField label="City" optional>
                                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="New Delhi" />
                            </StepField>
                            <StepField label="State" optional>
                                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Delhi" />
                            </StepField>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[14px] font-medium text-neutral-800 dark:text-neutral-200">Students <span className="font-normal text-neutral-500">(optional)</span></p>
                            <div className="flex flex-wrap gap-2">
                                {STUDENT_COUNTS.map((c) => <Chip key={c} on={students === c} onClick={() => setStudents(students === c ? '' : c)}>{c}</Chip>)}
                            </div>
                        </div>
                    </div>
                )}
            </OnboardingStep>
        </OnboardingFrame>
    )
}
