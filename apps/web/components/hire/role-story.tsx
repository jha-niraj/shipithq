"use client"

import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import { ScrollStory, StoryPanel, type StoryStep } from "@/components/story/scroll-story"

/**
 * /hire's story (plan/web/story ST-9; Niraj, 2026-10-07): one role and one candidate, from the
 * company's chair. It replaces "How it works", "What your candidate sees" and the workspace tour.
 * Labels are the apps' own, checked 2026-10-07:
 *
 *   post      apps/hiring jobs/new/job-form-content.tsx (the five steps, "The rounds candidates take",
 *             "Draft one with AI", "Publish", "Job published"); pipeline-section.tsx ("By ShipItHQ")
 *   rounds    apps/hiring pipelines/[id]/_components/pipeline-builder.tsx ("Hard gate" / "Advisory"
 *             and their hints, "Pass mark", "Time limit", "Retake cool-down", "HARD 60" chips);
 *             pool-sheet.tsx ("Each attempt draws n at random from what you tick here", Quant /
 *             Logical / Verbal); the aptitude bank is 320 questions (packages/db seed/aptitude)
 *   publish   public jobs only reach the apps/main jobs feed and the company page (feed.ts,
 *             public-page.ts); there is no invite-only control in the form yet, so none is claimed
 *   send      apps/main jobs/[slug]/rounds/send/send-client.tsx ("Which attempt per round", "The
 *             company sees the attempt you choose and how many attempts you made, not the others.",
 *             consent, "Send to {company}"); candidates pay their own round credits (lib/hiring/runs.ts)
 *   review    apps/hiring results/[jobSlug]/sends-workspace.tsx (New / Viewed / Invited / Declined,
 *             Overview and a tab per round, "Round n · attempt x of y", pastes and tab leaves, "The
 *             candidate agreed to share exactly this.", Compare up to three); packages/ui
 *             hiring/send-view.tsx ("Code (language)", "Written answer", "Transcript", "Diagram",
 *             "Email stays private until {company} invites.")
 *   decide    decide-panel.tsx ("Why (for the team)", "Redraft with this note", "Send invite");
 *             Outcome: Interviewing, Offer, Hired, Not selected
 * There is no applicant board, shortlist, notes or take-home in the app, so none appears here.
 * The role, the candidate and the scores are an example, labelled as one.
 */

const Box = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("rounded-xl bg-white p-4 ring-1 ring-neutral-200", className)}>{children}</div>
)
const Cap = ({ children }: { children: ReactNode }) => (
    <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>{children}</p>
)
const Example = ({ children }: { children: ReactNode }) => (
    <div><p className={cn(MONO, "mb-3 text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Example role · Backend SDE-1</p>{children}</div>
)
const Btn = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => (
    <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium", dark ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-900")}>{children}</span>
)
const Chip = ({ children, on = false }: { children: ReactNode; on?: boolean }) => (
    <span className={cn("rounded-md px-2 py-1 text-[12px] font-medium", on ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700")}>{children}</span>
)
const Row = ({ k, v }: { k: ReactNode; v: ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13.5px]"><span className="text-neutral-700">{k}</span><span className="shrink-0 tabular-nums text-neutral-900">{v}</span></div>
)

const ROUNDS: [string, string][] = [["Aptitude", "HARD 60"], ["Coding (DSA)", "HARD 60"], ["System design", "ADV 60"], ["Behavioural interview", "ADV 60"]]

const STEPS: (StoryStep & { panel: ReactNode })[] = [
    {
        id: "rounds", tag: "New job · Pipeline", title: "Pick the rounds candidates take",
        body: <>Start from a pipeline by ShipItHQ, draft one with AI, or build it round by round. Aptitude, coding, system design, a behavioural interview or a culture conversation.</>,
        panel: (
            <StoryPanel label="The rounds candidates take" takeaway="The interview is designed once, before anyone applies.">
                <Example>
                    <Box>
                        <Cap>The rounds candidates take</Cap>
                        <ol className="mt-3 space-y-2">
                            {ROUNDS.map(([r, g], i) => (
                                <li key={r} className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-[13.5px]">
                                    <span className={cn(MONO, "text-[11px] text-neutral-600")}>{i + 1}</span>
                                    <span className="min-w-0 text-neutral-900">{r}</span>
                                    <span className={cn(MONO, "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10.5px]", g.startsWith("HARD") ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700")}>{g}</span>
                                </li>
                            ))}
                        </ol>
                        <p className="mt-3 text-[12.5px] text-neutral-700">None fit? <span className="font-medium text-neutral-900 underline underline-offset-2">Draft one with AI</span></p>
                    </Box>
                </Example>
            </StoryPanel>
        ),
    },
    {
        id: "gates", tag: "Each round", title: "Write the pass mark first",
        body: <>A hard gate locks the next round below the pass mark; an advisory round is scored and shown to you but never blocks. Aptitude draws fresh questions each attempt from a pool you tick, out of 320.</>,
        panel: (
            <StoryPanel label="One round's settings" takeaway="Every candidate meets the same bar, written down before the first one applies.">
                <Example>
                    <Box>
                        <p className="text-[14px] font-semibold text-neutral-900">Aptitude</p>
                        <div className="mt-2 flex gap-1.5"><Chip on>Hard gate</Chip><Chip>Advisory</Chip></div>
                        <p className="mt-1.5 text-[12.5px] text-neutral-700">Below the pass mark, the next round stays locked.</p>
                        <div className="mt-2 border-t border-neutral-100 pt-1"><Row k="Pass mark" v="60" /><Row k="Time limit" v="25 min" /><Row k="Retake cool-down" v="7 days" /></div>
                        <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-[12.5px] text-neutral-800">Pool: Quant · Logical · Verbal. Each attempt draws 20 at random from what you tick here.</p>
                    </Box>
                </Example>
            </StoryPanel>
        ),
    },
    {
        id: "publish", tag: "Review · Publish", title: "Publish, and developers see it",
        body: <>Five short steps: the pipeline, the job, location and pay, skills and details, then review. A public job appears in the jobs feed developers already use on ShipItHQ, and on your company page.</>,
        panel: (
            <StoryPanel label="Publishing a job" takeaway="It reaches people who are already practising for this kind of role.">
                <Box>
                    <div className="flex flex-wrap gap-1.5">{["Pipeline", "The job", "Location and pay", "Skills and details", "Review"].map((s) => <Chip key={s} on={s === "Review"}>{s}</Chip>)}</div>
                    <div className="mt-4 flex flex-wrap gap-2"><Btn>Save draft</Btn><Btn dark>Publish</Btn></div>
                    <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"><Check className="size-4" aria-hidden />Job published</p>
                </Box>
            </StoryPanel>
        ),
    },
    {
        id: "candidate", tag: "The candidate", title: "One candidate takes your rounds",
        body: <>In order, behind your gates, paying for their own attempts, so an applicant never costs you. When they are done, they pick which attempt of each round to send, and agree to share exactly that.</>,
        panel: (
            <StoryPanel label="The candidate sends results" takeaway="Nothing reaches you until the candidate sends it.">
                <Example>
                    <Box>
                        <Cap>Which attempt per round</Cap>
                        <ul className="mt-2">{[["Aptitude", "attempt 1 · 72"], ["Coding (DSA)", "attempt 2 · 86"], ["System design", "attempt 1 · 68"], ["Behavioural interview", "attempt 1 · 74"]].map(([r, a]) => <li key={r}><Row k={r} v={a} /></li>)}</ul>
                        <p className="mt-2 text-[12.5px] leading-5 text-neutral-700">The company sees the attempt you choose and how many attempts you made, not the others.</p>
                        <div className="mt-3"><Btn dark>Send to your company</Btn></div>
                    </Box>
                </Example>
            </StoryPanel>
        ),
    },
    {
        id: "read", tag: "Results", title: "You read what they did",
        body: <>An overview, then a tab for each round: the code and its language, written answers, the transcript, the diagram, the rubric scores, and how often they pasted or left the tab. Compare up to three side by side.</>,
        panel: (
            <StoryPanel label="One candidate's results" takeaway="The work itself, not a description of it.">
                <Example>
                    <Box>
                        <div className="flex flex-wrap gap-1.5">{["Overview", "Round 1", "Round 2", "Round 3", "Round 4"].map((s) => <Chip key={s} on={s === "Round 2"}>{s}</Chip>)}</div>
                        <p className={cn(MONO, "mt-3 text-[11px] text-neutral-600")}>Round 2 · attempt 2 of 2 · 0 pastes · 1 tab leaves</p>
                        <p className="mt-2 text-[12.5px] font-medium text-neutral-900">Code (Python)</p>
                        <pre className={cn(MONO, "mt-1 overflow-x-auto rounded-lg bg-neutral-50 px-3 py-2 text-[12px] leading-5 text-neutral-800")}>{"def top_k(nums, k):\n    counts = Counter(nums)\n    return [n for n, _ in counts.most_common(k)]"}</pre>
                        <p className="mt-3 text-[12px] text-neutral-700">The candidate agreed to share exactly this. Email stays private until you invite.</p>
                    </Box>
                </Example>
            </StoryPanel>
        ),
    },
    {
        id: "decide", tag: "Decide", title: "Invite or decline, then record it",
        body: <>Write why, for your team, and the message to the candidate is drafted from your note; redraft it until it reads right. After an invite, record the outcome: interviewing, offer, hired or not selected.</>,
        panel: (
            <StoryPanel label="Deciding on a candidate" takeaway="Every candidate gets an answer, and you keep the record.">
                <Example>
                    <Box>
                        <p className="text-[12.5px] font-medium text-neutral-900">Why (for the team)</p>
                        <p className="mt-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800">Clean coding round, clear trade-offs in design. Meet for the system design deep dive.</p>
                        <div className="mt-3 flex flex-wrap gap-2"><Btn>Redraft with this note</Btn><Btn dark>Send invite</Btn></div>
                        <div className="mt-4 border-t border-neutral-100 pt-3"><Cap>Outcome</Cap><div className="mt-2 flex flex-wrap gap-1.5">{["Interviewing", "Offer", "Hired", "Not selected"].map((s) => <Chip key={s} on={s === "Interviewing"}>{s}</Chip>)}</div></div>
                    </Box>
                </Example>
            </StoryPanel>
        ),
    },
]

export function RoleStory() {
    return <ScrollStory steps={STEPS} panel={(i) => STEPS[i]?.panel ?? null} />
}
