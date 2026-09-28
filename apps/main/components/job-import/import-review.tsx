"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { ArrowRight, Bold, Check, CircleAlert, Globe, Heading3, List, ListOrdered, Lock, Redo2, RefreshCw, Trash2, Undo2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmDialog } from "@repo/ui/components/ui/confirm-dialog"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { buildImport, cancelImport, rereadImport, saveImportReview, type ImportAllowance, type ImportFacts, type ImportView } from "@/actions/(main)/jobs/import.action"
import { jobDocToText, jobTextToHtml } from "@/lib/job-import/editor-text"

/*
 * The review step (plan/job-import JI-14): what was read, for the student to check before
 * any AI runs. The title, company and location as fields; the posting in a rich editor;
 * every edit saved on its own (debounced). Build (JI-15) is where the cap or the credits
 * apply, so the public/private choice lives here, not on the first page.
 */

const SAVE_AFTER_MS = 1200
const MIN_TEXT = 200

type SaveState = "saved" | "dirty" | "saving" | "error"

export function ImportReview({ view, allowance, onChange }: { view: ImportView; allowance: ImportAllowance; onChange: (v: ImportView) => void }) {
    const router = useRouter()
    const [facts, setFacts] = useState<ImportFacts>(view.facts ?? { title: "", company: view.companyName ?? "", location: "" })
    const [text, setText] = useState(view.sourceText ?? "")
    const [save, setSave] = useState<SaveState>("saved")
    const [savedAt, setSavedAt] = useState<string>(view.updatedAt)
    const canAffordPrivate = allowance.credits >= allowance.privatePrice
    const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(allowance.publicLeft > 0 || !canAffordPrivate ? "PUBLIC" : "PRIVATE")
    const [busy, setBusy] = useState<"build" | null>(null)
    const [confirm, setConfirm] = useState<"reread" | "discard" | null>(null)

    // The latest values, for the debounced save and the flush before Build.
    const latest = useRef({ facts, text })
    latest.current = { facts, text }
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const flush = useCallback(async (): Promise<boolean> => {
        if (timer.current) { clearTimeout(timer.current); timer.current = null }
        setSave("saving")
        const r = await saveImportReview(view.id, latest.current)
        if (!r.success) { setSave("error"); return false }
        setSave("saved")
        setSavedAt(r.data.savedAt)
        return true
    }, [view.id])

    const schedule = useCallback(() => {
        setSave("dirty")
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => void flush(), SAVE_AFTER_MS)
    }, [flush])

    // Unsaved edits when the tab closes: ask the browser to hold on.
    useEffect(() => {
        const warn = (e: BeforeUnloadEvent) => { if (timer.current) { e.preventDefault(); void flush() } }
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [flush])
    // Leaving inside the app (a link, the back button): save what's pending.
    useEffect(() => () => { if (timer.current) void saveImportReview(view.id, latest.current) }, [view.id])

    const editor = useEditor({
        immediatelyRender: false,
        shouldRerenderOnTransaction: true,
        extensions: [
            StarterKit.configure({ heading: { levels: [3] }, codeBlock: false, code: false, blockquote: false, horizontalRule: false, link: false, underline: false }),
            Placeholder.configure({ placeholder: "The posting: the role, what you'd do, what they ask for." }),
        ],
        content: jobTextToHtml(view.sourceText ?? ""),
        editorProps: {
            attributes: {
                "aria-label": "The job posting",
                class: cn(
                    "min-h-[22rem] px-5 py-4 text-sm leading-6 text-neutral-800 focus:outline-none dark:text-neutral-200",
                    "[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-neutral-900 dark:[&_h3]:text-white [&_h3:first-child]:mt-0",
                    "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li_p]:my-0.5",
                    "[&_strong]:font-semibold [&_strong]:text-neutral-900 dark:[&_strong]:text-white",
                    "[&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-neutral-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
                ),
            },
        },
        onUpdate: ({ editor: ed }) => {
            setText(jobDocToText(ed.getJSON()))
            schedule()
        },
    })

    const setFact = (k: keyof ImportFacts, v: string) => {
        setFacts((f) => ({ ...f, [k]: v }))
        schedule()
    }

    const length = text.trim().length
    const ready = length >= MIN_TEXT && facts.company.trim().length >= 2 && facts.title.trim().length >= 2
        && (visibility === "PUBLIC" ? allowance.publicLeft > 0 : canAffordPrivate)

    const build = async () => {
        setBusy("build")
        if (!(await flush())) { setBusy(null); toast.error("Couldn't save your edits. Try again."); return }
        const r = await buildImport(view.id, visibility)
        if (!r.success) {
            setBusy(null)
            if (r.code === "DAILY_LIMIT" && canAffordPrivate) setVisibility("PRIVATE")
            toast.error(r.error)
            return
        }
        if (r.data.kind === "import" && r.data.importId !== view.id) {
            toast.success("Someone already built this job. It's free to practise.")
            router.push(`/jobs/import/${r.data.importId}`)
            return
        }
        onChange({ ...view, facts, sourceText: text, companyName: facts.company, title: view.title ?? facts.title, status: "QUEUED", step: "Reading the job", draft: false, visibility, progress: 0 })
    }

    const reread = async () => {
        const r = await rereadImport(view.id)
        if (!r.success) { toast.error(r.error); throw new Error(r.error) }
        if (timer.current) { clearTimeout(timer.current); timer.current = null }
        onChange({ ...view, status: "QUEUED", step: "Reading the job", sourceText: null, facts: null, error: null })
    }
    const discard = async () => {
        if (timer.current) { clearTimeout(timer.current); timer.current = null }
        const r = await cancelImport(view.id)
        if (!r.success) { toast.error(r.error); throw new Error(r.error) }
        router.push("/jobs/import")
    }

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="review-facts">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
                    <div>
                        <h2 id="review-facts" className="text-sm font-semibold text-neutral-900 dark:text-white">Check what we read</h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Fix anything that's wrong or missing. Your rounds are built from exactly this.</p>
                    </div>
                    <SaveBadge state={save} at={savedAt} onRetry={() => void flush()} />
                </div>
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
                    <Field id="fact-title" label="Job title" value={facts.title} onChange={(v) => setFact("title", v)} placeholder="e.g. Software Engineer I" />
                    <Field id="fact-company" label="Company" value={facts.company} onChange={(v) => setFact("company", v)} placeholder="Who is hiring?" />
                    <Field id="fact-location" label="Location" value={facts.location} onChange={(v) => setFact("location", v)} placeholder="City, or Remote" optional />
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" aria-label="The posting">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                    <Toolbar editor={editor} />
                    <p className={cn("px-2 text-xs tabular-nums", length < MIN_TEXT ? "text-rose-600 dark:text-rose-400" : "text-neutral-500 dark:text-neutral-400")}>
                        {length.toLocaleString("en")} characters{length < MIN_TEXT ? `, ${MIN_TEXT} needed` : ""}
                    </p>
                </div>
                <EditorContent editor={editor} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-200 px-5 py-3 text-xs dark:border-neutral-800">
                    {view.sourceUrl && (
                        <>
                            <a href={view.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline underline-offset-2 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Open the posting</a>
                            <button type="button" onClick={() => setConfirm("reread")} className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                                <RefreshCw className="h-3.5 w-3.5" /> Read the page again
                            </button>
                        </>
                    )}
                    <button type="button" onClick={() => setConfirm("discard")} className="ml-auto inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                        <Trash2 className="h-3.5 w-3.5" /> Discard
                    </button>
                </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="review-build">
                <div>
                    <h2 id="review-build" className="text-sm font-semibold text-neutral-900 dark:text-white">Build the rounds</h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Building is the only charge; each round then costs what every practice round does.</p>
                </div>
                <div role="radiogroup" aria-label="Who can practise it" className="grid gap-2 sm:grid-cols-2">
                    <Choice
                        selected={visibility === "PUBLIC"}
                        disabled={allowance.publicLeft === 0}
                        onSelect={() => setVisibility("PUBLIC")}
                        icon={<Globe className="h-4 w-4" />}
                        title="Public · free"
                        body={allowance.publicLeft > 0
                            ? `Any student can practise it too. ${allowance.publicLeft} of ${allowance.publicPerDay} left in the last 24 hours.`
                            : `You've built ${allowance.publicPerDay} in the last 24 hours. Try again later, or build privately.`}
                    />
                    <Choice
                        selected={visibility === "PRIVATE"}
                        disabled={!canAffordPrivate}
                        onSelect={() => setVisibility("PRIVATE")}
                        icon={<Lock className="h-4 w-4" />}
                        title={`Private · ${allowance.privatePrice} credits`}
                        body={canAffordPrivate
                            ? `Only you see it. Refunded if we can't build it. You have ${allowance.credits} credits.`
                            : `Only you see it. You have ${allowance.credits} credits.`}
                    />
                </div>
                {!ready && busy === null && (
                    <p className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                        <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                        {facts.title.trim().length < 2 ? "Add the job title."
                            : facts.company.trim().length < 2 ? "Add the company's name."
                                : length < MIN_TEXT ? "The posting needs the role, what you'd do and what they ask for."
                                    : "Pick how to build it."}
                    </p>
                )}
                <Button type="button" disabled={!ready || busy !== null} onClick={() => void build()} className="gap-1.5">
                    {busy === "build" ? <InlineLoader size="sm" /> : <ArrowRight className="h-4 w-4" />} Looks right, build the rounds
                </Button>
            </section>

            <ConfirmDialog
                open={confirm === "reread"}
                onOpenChange={(o) => !o && setConfirm(null)}
                title="Read the page again?"
                description="Your edits to the fields and the posting are replaced by a fresh read of the link. Reading is free."
                confirmLabel="Read again"
                tone="danger"
                onConfirm={reread}
            />
            <ConfirmDialog
                open={confirm === "discard"}
                onOpenChange={(o) => !o && setConfirm(null)}
                title="Discard this import?"
                description="Nothing was built or charged. You can import the same job again later."
                confirmLabel="Discard"
                tone="danger"
                onConfirm={discard}
            />
        </div>
    )
}

function SaveBadge({ state, at, onRetry }: { state: SaveState; at: string; onRetry: () => void }) {
    if (state === "error") {
        return (
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                <CircleAlert className="h-3.5 w-3.5" /> Not saved. Retry
            </button>
        )
    }
    if (state === "saving" || state === "dirty") return <div className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"><InlineLoader size="sm" label="Saving" /> Saving</div>
    return (
        <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400" title={new Date(at).toLocaleString()}>
            <Check className="h-3.5 w-3.5" /> Saved
        </span>
    )
}

function Field({ id, label, value, onChange, placeholder, optional }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string; optional?: boolean }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {label}{optional && <span className="font-normal text-neutral-500"> (optional)</span>}
            </label>
            <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={120} autoComplete="off" />
        </div>
    )
}

function Toolbar({ editor }: { editor: Editor | null }) {
    const tools = [
        { label: "Bold", icon: Bold, active: editor?.isActive("bold"), run: () => editor?.chain().focus().toggleBold().run() },
        { label: "Heading", icon: Heading3, active: editor?.isActive("heading", { level: 3 }), run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
        { label: "Bullet list", icon: List, active: editor?.isActive("bulletList"), run: () => editor?.chain().focus().toggleBulletList().run() },
        { label: "Numbered list", icon: ListOrdered, active: editor?.isActive("orderedList"), run: () => editor?.chain().focus().toggleOrderedList().run() },
        { label: "Undo", icon: Undo2, active: false, run: () => editor?.chain().focus().undo().run() },
        { label: "Redo", icon: Redo2, active: false, run: () => editor?.chain().focus().redo().run() },
    ]
    return (
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Formatting">
            {tools.map((t, i) => (
                <span key={t.label} className="contents">
                    {i === 4 && <span aria-hidden className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-800" />}
                    <button
                        type="button"
                        aria-label={t.label}
                        title={t.label}
                        aria-pressed={t.active || undefined}
                        disabled={!editor}
                        onClick={t.run}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                            t.active && "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white",
                        )}
                    >
                        <t.icon className="h-4 w-4" />
                    </button>
                </span>
            ))}
        </div>
    )
}

export function Choice({ selected, disabled, onSelect, icon, title, body }: { selected: boolean; disabled: boolean; onSelect: () => void; icon: React.ReactNode; title: string; body: string }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                selected ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600",
            )}
        >
            <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white">{icon} {title}</span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">{body}</span>
        </button>
    )
}
