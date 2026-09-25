'use client'

import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@repo/ui/components/ui/sheet'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { Briefcase, Link2, ClipboardPaste } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import toast from '@repo/ui/components/ui/sonner'
import { createInterviewPrepGoal } from '@/actions/(main)/pathfinder/interview-prep.action'

/**
 * Create a Pathfinder goal from a job description.
 *
 * A SEPARATE sheet from `create-goal-sheet.tsx`, and that is a deliberate change
 * from what IP-5 originally proposed. The plan said to add a mode to the existing
 * wizard; the wizard turned out to be 814 lines of three-step flow whose every
 * field - category, level, group, duration - is chosen FOR the user here. Adding
 * a mode would have meant threading a branch through all three steps to skip
 * almost all of them, which is more risk to a working flow than a small sheet of
 * its own. The amendment is recorded in plan/interview-prep/tasks.md.
 *
 * A right-side panel, like every other sheet in this app now.
 */

interface CreateInterviewPrepSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type Mode = 'paste' | 'url'

const MIN_DESCRIPTION_CHARS = 200

export function CreateInterviewPrepSheet({ open, onOpenChange }: CreateInterviewPrepSheetProps) {
    const router = useRouter()
    const [mode, setMode] = useState<Mode>('paste')
    const [position, setPosition] = useState('')
    const [jobDescription, setJobDescription] = useState('')
    const [jobUrl, setJobUrl] = useState('')
    const [counts, setCounts] = useState({ technical: 8, behavioral: 8, coding: 3 })
    const [submitting, setSubmitting] = useState(false)

    const total = counts.technical + counts.behavioral + counts.coding
    // Mirrors `Math.ceil(total / 2)` in the action. Shown BEFORE the click,
    // because a generation that silently spends credits is the complaint this
    // whole module exists to stop repeating.
    const creditCost = Math.ceil(total / 2)

    const reset = () => {
        setMode('paste')
        setPosition('')
        setJobDescription('')
        setJobUrl('')
        setCounts({ technical: 8, behavioral: 8, coding: 3 })
    }

    const handleSubmit = async () => {
        if (!position.trim()) {
            toast.error('Which role is this for?')
            return
        }
        if (mode === 'paste' && jobDescription.trim().length < MIN_DESCRIPTION_CHARS) {
            toast.error(`Paste at least ${MIN_DESCRIPTION_CHARS} characters of the posting.`)
            return
        }
        if (mode === 'url' && !jobUrl.trim()) {
            toast.error('Paste a link to the posting, or switch to pasting the text.')
            return
        }

        setSubmitting(true)
        try {
            const result = await createInterviewPrepGoal({
                position: position.trim(),
                // Only ONE of these is sent. Sending both would let a stale
                // textarea silently win over the URL the user just typed.
                ...(mode === 'paste'
                    ? { jobDescription: jobDescription.trim() }
                    : { jobUrl: jobUrl.trim() }),
                counts,
            })

            if (!result.success) {
                toast.error(result.error)
                return
            }

            // The goal exists even when the generation job failed to dispatch, so
            // this navigates either way and only the message differs.
            if (result.jobError) {
                toast.error(`Goal created, but generation could not start: ${result.jobError}`)
            } else {
                toast.success('Generating your interview questions...')
            }
            reset()
            onOpenChange(false)
            router.push(`/pathfinder/${result.slug}`)
        } catch {
            toast.error('Something went wrong')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-xl">
                <SheetHeader className="shrink-0 border-b border-neutral-200 p-6 dark:border-neutral-800">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                        <Briefcase className="h-5 w-5" />
                        Prep for a job
                    </SheetTitle>
                    <SheetDescription>
                        Paste a job posting and we will build a goal of the questions it is
                        likely to ask, with quizzes and coding problems you can work through.
                    </SheetDescription>
                </SheetHeader>

                {/* `min-w-0` matters: a long pasted description is one very wide
                    text node, and without it the flex child grows and the sheet
                    scrolls sideways. */}
                <ScrollArea reflow className="min-h-0 min-w-0 flex-1">
                    <div className="space-y-6 p-6">
                        <div className="space-y-2">
                            <Label htmlFor="ip-position">Role</Label>
                            <Input
                                id="ip-position"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                placeholder="e.g. Senior Backend Engineer"
                                disabled={submitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>The posting</Label>
                            {/* The shared segmented control (plan/ui-pass UI-2), not two bordered buttons. */}
                            <Tabs value={mode} onValueChange={(v) => !submitting && setMode(v as Mode)}>
                                <TabsList variant="segmented" size="sm">
                                    <TabsTrigger value="paste" icon={<ClipboardPaste />} disabled={submitting}>Paste the text</TabsTrigger>
                                    <TabsTrigger value="url" icon={<Link2 />} disabled={submitting}>From a link</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {mode === 'paste' ? (
                                <>
                                    <Textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        placeholder="Paste the full job description here..."
                                        className="min-h-40 resize-none"
                                        disabled={submitting}
                                    />
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {jobDescription.trim().length} characters
                                        {jobDescription.trim().length > 0 &&
                                            jobDescription.trim().length < MIN_DESCRIPTION_CHARS &&
                                            ` - need at least ${MIN_DESCRIPTION_CHARS}`}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Input
                                        value={jobUrl}
                                        onChange={(e) => setJobUrl(e.target.value)}
                                        placeholder="https://..."
                                        disabled={submitting}
                                    />
                                    {/* Said up front rather than after a failed scrape.
                                        LinkedIn and the other big boards serve a
                                        sign-in wall to anything without a session, so
                                        this is the common outcome, not an edge case. */}
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        LinkedIn, Glassdoor and Indeed usually serve a sign-in page to
                                        readers that are not logged in. If the link comes back blocked,
                                        paste the text instead.
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Label>How many questions</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {([
                                    ['technical', 'Technical'],
                                    ['behavioral', 'Behavioral'],
                                    ['coding', 'Coding'],
                                ] as const).map(([key, label]) => (
                                    <div key={key} className="space-y-1.5">
                                        <Label htmlFor={`ip-${key}`} className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                                            {label}
                                        </Label>
                                        <Input
                                            id={`ip-${key}`}
                                            type="number"
                                            min={0}
                                            max={20}
                                            value={counts[key]}
                                            onChange={(e) => {
                                                // Clamped on the way IN. An empty input
                                                // parses to NaN, and NaN in the total
                                                // makes the credit cost read "NaN".
                                                const n = Number.parseInt(e.target.value, 10)
                                                setCounts((c) => ({
                                                    ...c,
                                                    [key]: Number.isNaN(n) ? 0 : Math.max(0, Math.min(20, n)),
                                                }))
                                            }}
                                            disabled={submitting}
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {total} questions, {creditCost} credit{creditCost === 1 ? '' : 's'}.
                            </p>
                        </div>
                    </div>
                </ScrollArea>

                <div className="shrink-0 border-t border-neutral-200 p-6 dark:border-neutral-800">
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || total < 1}
                        className="w-full cursor-pointer"
                    >
                        {submitting ? (
                            <>
                                <InlineLoader size="sm" />
                                <span className="ml-2">Creating...</span>
                            </>
                        ) : (
                            `Generate ${total} questions`
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
