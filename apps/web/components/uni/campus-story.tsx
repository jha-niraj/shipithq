"use client"

import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import { ScrollStory, StoryPanel, type StoryStep } from "@/components/story/scroll-story"

/**
 * /uni's story (plan/web/story ST-15; Niraj, 2026-10-07: early access, honestly). One campus from
 * sign-up to its first assignment, then what is being built. Labels are apps/uni's own, checked
 * 2026-10-07 (plan/uni/overview.md):
 *
 *   set up       (auth)/onboarding/page.tsx: "Six quick questions to set up your workspace.", the six
 *                steps, the department chips, "Finish setup"; register: "Create your institution's workspace"
 *   faculty      components/team/invite-teacher-dialog.tsx: "Invite Faculty Member", its fields and
 *                note, the five roles, "Send Credentials"
 *   permissions  faculty/roles/page.tsx: "Roles & Permissions", 21 switches incl. "Create Assignments",
 *                "Grade Submissions", "Verify Students", "Manage Placements", "View Analytics"
 *   assignments  teacher-project-generate-sheet.tsx, teacher-mock-create-sheet.tsx,
 *                teacher-assessment-create-sheet.tsx (titles, steps, types, categories, Live Session Mode)
 *   being built  assignments page: "No classes found. Create classes first."; classes, rosters,
 *                delivery to students, results, analytics and placements are not built (plan/uni)
 */

const Box = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("rounded-xl bg-white p-4 ring-1 ring-neutral-200", className)}>{children}</div>
)
const Cap = ({ children }: { children: ReactNode }) => <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>{children}</p>
const Chip = ({ children, on = false }: { children: ReactNode; on?: boolean }) => (
    <span className={cn("rounded-md px-2 py-1 text-[12px] font-medium", on ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700")}>{children}</span>
)
const Field = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 py-1.5 text-[13px] last:border-0">
        <span className="text-neutral-600">{k}</span><span className="min-w-0 truncate text-right text-neutral-900">{v}</span>
    </div>
)
const Btn = ({ children }: { children: ReactNode }) => (
    <span className="inline-flex h-8 items-center rounded-lg bg-neutral-900 px-3 text-[13px] font-medium text-white">{children}</span>
)
const Switch = ({ label, on }: { label: string; on: boolean }) => (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13.5px]">
        <span className="text-neutral-900">{label}</span>
        <span aria-label={on ? "on" : "off"} className={cn("relative h-5 w-9 shrink-0 rounded-full", on ? "bg-neutral-900" : "bg-neutral-300")}>
            <span className={cn("absolute top-0.5 size-4 rounded-full bg-white", on ? "left-[18px]" : "left-0.5")} />
        </span>
    </div>
)
const Example = ({ children }: { children: ReactNode }) => (
    <div><p className={cn(MONO, "mb-3 text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Example campus</p>{children}</div>
)
const Planned = ({ children }: { children: ReactNode }) => (
    <div className="rounded-xl border border-dashed border-neutral-400 bg-white/70 p-4">
        <p className={cn(MONO, "mb-2 inline-flex rounded-full bg-[#EFD9A0] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em] text-neutral-900")}>Being built</p>
        {children}
    </div>
)
const Today = "Works today"
const Building = "Being built"

const STEPS: (StoryStep & { panel: ReactNode })[] = [
    {
        id: "set-up", tag: `${Today} · Set up`, title: "Set up the campus in six short questions",
        body: <>Create your institution&apos;s workspace, confirm your email with a code, then answer six questions: the institution, its type, your role, a line about it, the departments that start first, and the campus. The departments you pick are created for you.</>,
        panel: (
            <StoryPanel label="Onboarding" takeaway="A workspace that already has its departments.">
                <Example>
                    <Box>
                        <Cap>Six quick questions to set up your workspace</Cap>
                        <ol className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-2">
                            {["Your institution", "Its type", "Your role", "About it (optional)", "Departments", "The campus"].map((t, i) => (
                                <li key={t} className={cn("flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]", i === 4 ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-800")}><span className={cn(MONO, "text-[11px]")}>{i + 1}</span>{t}</li>
                            ))}
                        </ol>
                        <p className="mt-4 text-[13px] font-medium text-neutral-900">Which departments will use it first?</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{["Computer Science", "Information Technology", "Electronics & Communication", "Mechanical Engineering", "MBA / Business"].map((d, i) => <Chip key={d} on={i < 3}>{d}</Chip>)}</div>
                        <div className="mt-4"><Btn>Finish setup</Btn></div>
                    </Box>
                </Example>
            </StoryPanel>
        ),
    },
    {
        id: "faculty", tag: `${Today} · Faculty`, title: "Invite your faculty with a role",
        body: <>Add each person with their role, job title and department. They are sent temporary credentials to sign in. Six roles in all: you, as University Admin, and five you can invite.</>,
        panel: (
            <StoryPanel label="Inviting a faculty member" takeaway="Everyone arrives with a role and a department, not as a generic member.">
                <Example>
                    <Box>
                        <p className="text-[14px] font-semibold text-neutral-900">Invite Faculty Member</p>
                        <p className="mt-1 text-[12.5px] leading-5 text-neutral-600">Create an account with temporary credentials. They&apos;ll receive an email to sign in.</p>
                        <div className="mt-3"><Field k="Email Address" v="a.rao@campus.edu" /><Field k="Full Name" v="Dr A. Rao" /><Field k="Job Title" v="Associate Professor" /><Field k="Department" v="Computer Science" /></div>
                        <p className="mt-3 text-[12.5px] font-medium text-neutral-900">Role</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">{["Faculty", "Department Head", "Teaching Assistant", "Placement Officer", "Finance Officer"].map((r, i) => <Chip key={r} on={i === 0}>{r}</Chip>)}</div>
                        <div className="mt-4"><Btn>Send Credentials</Btn></div>
                    </Box>
                </Example>
            </StoryPanel>
        ),
    },
    {
        id: "permissions", tag: `${Today} · Permissions`, title: "Decide exactly what each person can do",
        body: <>Every member has 21 permissions you can switch one by one, from creating assignments to verifying students, so a teaching assistant can help a class without seeing what they should not.</>,
        panel: (
            <StoryPanel label="Roles and permissions" takeaway="Access is set per person, switch by switch.">
                <Example>
                    <Box>
                        <div className="flex items-baseline justify-between gap-3"><p className="text-[14px] font-semibold text-neutral-900">Roles &amp; Permissions</p><span className={cn(MONO, "text-[11px] text-neutral-600")}>5 of 21 shown</span></div>
                        <p className="mt-1 text-[12.5px] text-neutral-600">Dr A. Rao · Faculty</p>
                        <div className="mt-2"><Switch label="Create Assignments" on /><Switch label="Grade Submissions" on /><Switch label="Verify Students" on={false} /><Switch label="Manage Placements" on={false} /><Switch label="View Analytics" on /></div>
                    </Box>
                </Example>
            </StoryPanel>
        ),
    },
    {
        id: "design", tag: `${Today} · Assignments`, title: "Design the work: a project, a mock, an assessment",
        body: <>A project brief written by AI for the type, level and stack you choose; a voice mock interview by category and level; or a quiz, code or mixed assessment with a time limit and a live mode for in-class tests. Each takes a deadline, credits and instructions.</>,
        panel: (
            <StoryPanel label="Three kinds of assignment" takeaway="Faculty can design all three today.">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
                    <Box>
                        <p className="text-[13.5px] font-semibold text-neutral-900">Create Project Assignment</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{["Full Stack", "Frontend", "Mobile App", "Programs", "AI/ML", "AI Agent"].map((t, i) => <Chip key={t} on={i === 0}>{t}</Chip>)}</div>
                    </Box>
                    <Box>
                        <p className="text-[13.5px] font-semibold text-neutral-900">Create Mock Interview</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{["Technical", "Behavioral", "HR Round", "System Design", "Live Coding", "General"].map((t, i) => <Chip key={t} on={i === 3}>{t}</Chip>)}</div>
                    </Box>
                    <Box>
                        <p className="text-[13.5px] font-semibold text-neutral-900">Create Assessment</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">{["Quiz", "Coding", "Mixed"].map((t, i) => <Chip key={t} on={i === 1}>{t}</Chip>)}<span className="ml-1 flex items-center gap-1 text-[12.5px] text-neutral-700"><Check className="size-3.5" aria-hidden />Live Session Mode</span></div>
                    </Box>
                </div>
            </StoryPanel>
        ),
    },
    {
        id: "classes", tag: `${Building} · Classes and students`, title: "Classes, rosters, and the work reaching students",
        body: <>Next: creating classes, students joining with their ShipItHQ account and being verified for your campus, and each assignment appearing in their account with its deadline. Until then an assignment cannot reach anyone, and the app says so.</>,
        panel: (
            <StoryPanel label="What is being built: classes and students" takeaway="The next piece, and the one that makes the rest useful.">
                <div className="space-y-2.5">
                    <Box><p className="text-[13px] text-neutral-700">Today, assigning work shows:</p><p className={cn(MONO, "mt-1.5 rounded-md bg-neutral-100 px-2.5 py-1.5 text-[12.5px] text-neutral-900")}>No classes found. Create classes first.</p></Box>
                    <Planned>
                        <ul className="space-y-1.5 text-[13.5px] text-neutral-800">
                            <li>Create classes in each department</li>
                            <li>Students join with their ShipItHQ account; you verify them</li>
                            <li>Assignments appear in each student&apos;s account, with the deadline</li>
                        </ul>
                    </Planned>
                </div>
            </StoryPanel>
        ),
    },
    {
        id: "results", tag: `${Building} · Results and readiness`, title: "Results, readiness and placements",
        body: <>After that: who started, finished and how they scored, per class and per student; readiness by department; and campus drives. Companies already hire through ShipItHQ Hiring, where students who clear a company&apos;s rounds send their results.</>,
        panel: (
            <StoryPanel label="What is being built: results and readiness" takeaway="Built from the work students do, once that work reaches them.">
                <Planned>
                    <ul className="space-y-1.5 text-[13.5px] text-neutral-800">
                        <li>Results per assignment, by class and student, with scores</li>
                        <li>Readiness and completion by department</li>
                        <li>Campus-only jobs and company referrals, applied to placed</li>
                    </ul>
                </Planned>
            </StoryPanel>
        ),
    },
]

export function CampusStory() {
    return <ScrollStory steps={STEPS} panel={(i) => STEPS[i]?.panel ?? null} />
}
