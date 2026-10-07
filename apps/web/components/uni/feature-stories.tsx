"use client"

import type { ReactNode } from "react"
import { Check, Trash2 } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import { ScrollStory, StoryPanel, type StoryStep } from "@/components/story/scroll-story"

/**
 * "How it works" on /uni/faculty and /uni/assignments, the two university modules that run today
 * (plan/web/story ST-15). Labels from apps/uni, checked 2026-10-07:
 *   faculty      invite-teacher-dialog.tsx; faculty/roles/page.tsx (21 permissions in six
 *                categories: Admin 6, Classes 4, Assignments 4, Students 3, Analytics 2,
 *                Placements 2; "Invitation revoked")
 *   assignments  teacher-project-generate-sheet.tsx ("Create Project Assignment", its four steps,
 *                its types, "Generating project structure"), teacher-mock-create-sheet.tsx (steps,
 *                categories, Beginner to Expert), teacher-assessment-create-sheet.tsx (Quiz, Coding,
 *                Mixed, "Time Limit (minutes)", "Live Session Mode", "AI Generate"); the assignments
 *                page's "No classes found. Create classes first."
 * Other modules have no story: they are not built, and their pages read as planned.
 */

const Box = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("rounded-xl bg-white p-4 ring-1 ring-neutral-200", className)}>{children}</div>
)
const Chip = ({ children, on = false }: { children: ReactNode; on?: boolean }) => (
    <span className={cn("rounded-md px-2 py-1 text-[12px] font-medium", on ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700")}>{children}</span>
)
const Steps = ({ items, at }: { items: string[]; at: number }) => (
    <ol className="flex flex-wrap gap-1.5">{items.map((s, i) => <li key={s} className={cn("rounded-md px-2 py-1 text-[12px]", i === at ? "bg-neutral-900 font-medium text-white" : i < at ? "bg-neutral-200 text-neutral-800" : "bg-neutral-100 text-neutral-600")}><span className={cn(MONO, "mr-1 text-[10.5px]")}>{i + 1}</span>{s}</li>)}</ol>
)
const Field = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 py-1.5 text-[13px] last:border-0"><span className="text-neutral-600">{k}</span><span className="min-w-0 truncate text-right text-neutral-900">{v}</span></div>
)
const Example = ({ children }: { children: ReactNode }) => (
    <div><p className={cn(MONO, "mb-3 text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Example</p>{children}</div>
)

const FACULTY: (StoryStep & { panel: ReactNode })[] = [
    {
        id: "invite", tag: "Invite", title: "Add a faculty member",
        body: <>The University Admin adds each person with their email, name, role, job title and department. They are sent temporary credentials and sign in with them.</>,
        panel: (
            <StoryPanel label="Inviting a faculty member" takeaway="One form, and they have an account.">
                <Example><Box>
                    <p className="text-[14px] font-semibold text-neutral-900">Invite Faculty Member</p>
                    <p className="mt-1 text-[12.5px] text-neutral-600">Create an account with temporary credentials. They&apos;ll receive an email to sign in.</p>
                    <div className="mt-3"><Field k="Email Address" v="s.iyer@campus.edu" /><Field k="Full Name" v="Prof S. Iyer" /><Field k="Job Title" v="Head, Placement Cell" /><Field k="Department (Optional)" v="Computer Science" /></div>
                </Box></Example>
            </StoryPanel>
        ),
    },
    {
        id: "role", tag: "Role", title: "Give them a role that matches the campus",
        body: <>Five roles to invite into: Faculty, Department Head, Teaching Assistant, Placement Officer and Finance Officer. The person who set up the workspace is its University Admin.</>,
        panel: (
            <StoryPanel label="Roles" takeaway="Six roles in all, named the way a campus is organised.">
                <Box>
                    <div className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-[13.5px] font-medium text-white"><Check className="size-4" aria-hidden />University Admin <span className={cn(MONO, "ml-auto text-[10.5px] text-neutral-300")}>who set it up</span></div>
                    <div className="mt-2 flex flex-wrap gap-1.5">{["Faculty", "Department Head", "Teaching Assistant", "Placement Officer", "Finance Officer"].map((r, i) => <Chip key={r} on={i === 3}>{r}</Chip>)}</div>
                </Box>
            </StoryPanel>
        ),
    },
    {
        id: "permissions", tag: "Permissions", title: "Switch each permission, person by person",
        body: <>21 permissions in six groups: administration, classes, assignments, students, analytics and placements. Turn any one on or off for any member.</>,
        panel: (
            <StoryPanel label="Permissions by group" takeaway="Access set per person, not only per role.">
                <Box>
                    <ul className="space-y-1.5">
                        {([["Admin", 6], ["Classes", 4], ["Assignments", 4], ["Students", 3], ["Analytics", 2], ["Placements", 2]] as const).map(([g, n]) => (
                            <li key={g} className="flex items-center gap-3 text-[13.5px]">
                                <span className="w-24 shrink-0 text-neutral-900">{g}</span>
                                <span className="flex gap-1">{Array.from({ length: n }).map((_, i) => <span key={i} className={cn("h-3 w-5 rounded-full", i % 3 === 2 ? "bg-neutral-300" : "bg-neutral-900")} />)}</span>
                                <span className={cn(MONO, "ml-auto text-[11.5px] text-neutral-600")}>{n}</span>
                            </li>
                        ))}
                    </ul>
                    <p className={cn(MONO, "mt-3 border-t border-neutral-100 pt-2 text-right text-[11.5px] text-neutral-900")}>21 in all</p>
                </Box>
            </StoryPanel>
        ),
    },
    {
        id: "revoke", tag: "Change", title: "Revoke an invitation nobody used",
        body: <>An invitation stays pending until it is used, and you can revoke it from the same page.</>,
        panel: (
            <StoryPanel label="A pending invitation" takeaway="Nobody keeps access they should not have.">
                <Example><Box>
                    <p className="text-[14px] font-semibold text-neutral-900">Pending Invitations</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-neutral-200 px-3 py-2.5 text-[13px]">
                        <span className="min-w-0"><span className="block font-medium text-neutral-900">Guest Lecturer</span><span className="text-neutral-600">guest.lecturer@campus.edu · Faculty</span></span>
                        <span className="ml-auto flex items-center gap-2 text-[12px] text-neutral-600">Sent 2 Oct <span className="flex size-7 items-center justify-center rounded-lg border border-neutral-300"><Trash2 className="size-3.5 text-neutral-900" aria-label="Revoke invitation" /></span></span>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"><Check className="size-4" aria-hidden />Invitation revoked</p>
                </Box></Example>
            </StoryPanel>
        ),
    },
]

const ASSIGNMENTS: (StoryStep & { panel: ReactNode })[] = [
    {
        id: "project", tag: "Project", title: "A project brief, written for the stack you choose",
        body: <>Four steps: the project details, the type and difficulty, the tech stack, then the assignment&apos;s deadline, credits and instructions. AI writes the brief.</>,
        panel: (
            <StoryPanel label="Create Project Assignment" takeaway="Fresh project work for every batch.">
                <Example><Box>
                    <p className="text-[14px] font-semibold text-neutral-900">Create Project Assignment</p>
                    <div className="mt-2"><Steps items={["Project Details", "Type & Difficulty", "Tech Stack", "Assignment"]} at={1} /></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">{["Full Stack", "Frontend", "Mobile App", "Programs", "AI/ML", "AI Agent", "Other"].map((t, i) => <Chip key={t} on={i === 0}>{t}</Chip>)}</div>
                    <p className={cn(MONO, "mt-3 text-[11.5px] text-neutral-600")}>Generating project structure...</p>
                </Box></Example>
            </StoryPanel>
        ),
    },
    {
        id: "mock", tag: "Voice mock", title: "A voice mock interview, by category and level",
        body: <>Basic information, the configuration, a knowledge base for the interviewer, then the assignment. Six categories, from technical to live coding, at four levels.</>,
        panel: (
            <StoryPanel label="Create Mock Interview" takeaway="Interview practice at any hour, without booking anyone.">
                <Example><Box>
                    <p className="text-[14px] font-semibold text-neutral-900">Create Mock Interview</p>
                    <div className="mt-2"><Steps items={["Basic Info", "Configuration", "Knowledge Base", "Assignment"]} at={1} /></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">{["Technical", "Behavioral", "HR Round", "System Design", "Live Coding", "General"].map((t, i) => <Chip key={t} on={i === 0}>{t}</Chip>)}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">{["Beginner", "Intermediate", "Advanced", "Expert"].map((t, i) => <Chip key={t} on={i === 1}>{t}</Chip>)}</div>
                </Box></Example>
            </StoryPanel>
        ),
    },
    {
        id: "assessment", tag: "Assessment", title: "A quiz or a code test, with a time limit",
        body: <>A quiz, a coding test or both, on a topic or language, with a time limit. Generate the questions with AI or write them yourself, and turn on live mode for a surprise test in class.</>,
        panel: (
            <StoryPanel label="Create Assessment" takeaway="Checked work, on the clock.">
                <Example><Box>
                    <p className="text-[14px] font-semibold text-neutral-900">Create Assessment</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{["Quiz", "Coding", "Mixed"].map((t, i) => <Chip key={t} on={i === 1}>{t}</Chip>)}</div>
                    <div className="mt-3"><Field k="Topic / Language" v="Python" /><Field k="Time Limit (minutes)" v="45" /><Field k="Questions" v="AI Generate" /></div>
                    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-neutral-900"><Check className="size-4" aria-hidden />Live Session Mode</p>
                </Box></Example>
            </StoryPanel>
        ),
    },
    {
        id: "deliver", tag: "Being built", title: "Sending it to a class, and results back",
        body: <>This is the part being built: creating classes, the work reaching each enrolled student&apos;s ShipItHQ account, and who started, finished and scored coming back to you. Until classes exist, the app says so when you assign.</>,
        panel: (
            <StoryPanel label="What is being built" takeaway="Design works today; delivery and results come next.">
                <div className="space-y-2.5">
                    <Box><p className="text-[13px] text-neutral-700">Select Classes</p><p className={cn(MONO, "mt-1.5 rounded-md bg-neutral-100 px-2.5 py-1.5 text-[12.5px] text-neutral-900")}>No classes found. Create classes first.</p></Box>
                    <div className="rounded-xl border border-dashed border-neutral-400 bg-white/70 p-4">
                        <p className={cn(MONO, "mb-2 inline-flex rounded-full bg-[#EFD9A0] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em] text-neutral-900")}>Being built</p>
                        <ul className="space-y-1.5 text-[13.5px] text-neutral-800"><li>Classes in each department</li><li>The work in each student&apos;s account, with its deadline</li><li>Started, finished and scores, per student</li></ul>
                    </div>
                </div>
            </StoryPanel>
        ),
    },
]

// The sub-headings live in app/uni/[feature]/page.tsx, a server file that cannot read this one's exports.
const STORIES: Record<string, { steps: typeof FACULTY }> = { faculty: { steps: FACULTY }, assignments: { steps: ASSIGNMENTS } }

export function UniFeatureStory({ slug }: { slug: string }) {
    const s = STORIES[slug]
    if (!s) return null
    return <ScrollStory steps={s.steps} panel={(i) => s.steps[i]?.panel ?? null} />
}
