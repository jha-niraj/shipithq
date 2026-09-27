"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    extractJobDescription, generateCoverLetterQuestions, generateAndSaveCoverLetter,
    getCoverLetter, deleteCoverLetter, saveCoverLetterDraft
} from "@/actions/(main)/ai/cover-letter.action"
import { awaitBackgroundJob } from "@/hooks/use-background-job"
import { creditErrorMessage, priceSuffix } from "@/lib/credits/notify"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/ui/radio-group"
import { Badge } from "@repo/ui/components/ui/badge"
import {
    Download, Copy, Mic, Square, Trash2, ArrowLeft, Sparkles,
    FileText, Wand2, CheckCircle2, ChevronRight, Clock, PenLine
} from "lucide-react"
import toast from "@repo/ui/components/ui/sonner"
import { whisperTranscribe } from "@/actions/(main)/ai/whisper.action"
import { usePDF } from "react-to-pdf"
import { MarkdownRenderer } from "@/components/common/markdown-renderer"
import { Card, CardContent } from "@repo/ui/components/ui/card"
import { CoverLetterHistoryItem, CoverLetterQuestion } from "@/types/aitools/cover-letter"
import { DotmSquare11 } from "@repo/ui/components/ui/dotm-square-11"
import { OptionSelect } from "@repo/ui/components/ui/option-select"
import { StickyAside } from "@repo/ui/components/ui/sticky-action-bar"
import { rememberOptions } from "@/actions/(common)/options/options.action"
import { useOptions } from "@/lib/use-options"

// ── Loading overlay ──────────────────────────────────────────────────────────
function LoadingOverlay({ message, sub }: { message: string; sub?: string }) {
    return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm rounded-2xl gap-4">
            <DotmSquare11 size={48} dotSize={6} speed={1.4} />
            <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{message}</p>
                {sub && <p className="text-xs text-neutral-500 dark:text-neutral-400">{sub}</p>}
            </div>
        </div>
    )
}

// ── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
    const steps = [
        { n: 1, label: "Job details", icon: FileText },
        { n: 2, label: "Tailor", icon: Wand2 },
        { n: 3, label: "Your letter", icon: CheckCircle2 },
    ]
    return (
        <div className="flex items-center gap-0 mb-6">
            {
                steps.map((s, i) => {
                    const Icon = s.icon
                    const done = current > s.n
                    const active = current === s.n
                    return (
                        <div key={s.n} className="flex items-center">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? "bg-neutral-900 text-white dark:bg-white dark:text-black" :
                                done ? "text-neutral-500 dark:text-neutral-400" :
                                    "text-neutral-600 dark:text-neutral-400"
                                }`}>
                                <Icon className="w-3.5 h-3.5" />
                                <span>{s.label}</span>
                            </div>
                            {
                                i < steps.length - 1 && (
                                    <ChevronRight className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 mx-1" />
                                )
                            }
                        </div>
                    )
                })
            }
        </div>
    )
}

// ── Main component ───────────────────────────────────────────────────────────
export function CoverLetterClient({
    initialCoverLetters, selectedId
}: {
    initialCoverLetters: CoverLetterHistoryItem[]
    selectedId: string | undefined
}) {
    const router = useRouter()
    const [step, setStep] = useState(selectedId ? 3 : 1)

    // Step 1
    const [jobUrl, setJobUrl] = useState("")
    const [jobDescription, setJobDescription] = useState("")
    const [jobTitle, setJobTitle] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [tone, setTone] = useState("Professional")
    const [isExtracting, setIsExtracting] = useState(false)
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)

    // Step 2
    const [questions, setQuestions] = useState<CoverLetterQuestion[]>([])
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
    const [isGeneratingLetter, setIsGeneratingLetter] = useState(false)
    const [generationPhase, setGenerationPhase] = useState("")
    const [draftId, setDraftId] = useState<string | null>(null)

    // Step 3
    const [generatedContent, setGeneratedContent] = useState("")
    const { toPDF, targetRef } = usePDF({ filename: "cover_letter.pdf" })

    // History
    const [history, setHistory] = useState<CoverLetterHistoryItem[]>(initialCoverLetters)
    // plan/ui-forms UF-3, UF-8, UF-9: company and title as selects with "Other", the
    // step's actions sticky, the letters column sticky beside the steps.
    const options = useOptions(["company", "job_title"] as const)

    const fetchLetter = useCallback(async (id: string) => {
        const res = await getCoverLetter(id)
        if (res.success && res.coverLetter) {
            const letter = res.coverLetter
            if (!letter.generatedContent) {
                // Draft: restore state to step 2
                setJobUrl(letter.jobUrl || "")
                setJobDescription(letter.jobDescription || "")
                setJobTitle(letter.jobTitle || "")
                setCompanyName(letter.companyName || "")
                setTone(letter.tone || "Professional")
                const qs = Array.isArray(letter.questions) ? (letter.questions as unknown as CoverLetterQuestion[]) : []
                setQuestions(qs)
                setAnswers({})
                setDraftId(letter.id)
                setStep(2)
            } else {
                setGeneratedContent(letter.generatedContent)
                setStep(3)
            }
        } else {
            toast.error("Cover letter not found")
            router.push("/ai/resume/cover-letter")
        }
    }, [router])

    useEffect(() => {
        if (selectedId) fetchLetter(selectedId)
    }, [selectedId, fetchLetter])

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const res = await deleteCoverLetter(id)
        if (res.success) {
            setHistory(h => h.filter(x => x.id !== id))
            if (selectedId === id) resetFlow()
            toast.success("Deleted")
        } else {
            toast.error("Failed to delete")
        }
    }

    const resetFlow = () => {
        router.push("/ai/resume/cover-letter")
        setStep(1)
        setJobUrl("")
        setJobDescription("")
        setJobTitle("")
        setCompanyName("")
        setQuestions([])
        setAnswers({})
        setGeneratedContent("")
        setDraftId(null)
    }

    const handleExtract = async () => {
        if (!jobUrl) return toast.error("Please enter a job URL")
        setIsExtracting(true)
        const res = await extractJobDescription(jobUrl)
        setIsExtracting(false)
        if (!res.success) return toast.error(res.error)
        setJobDescription(res.description || "")
        setJobTitle(res.title || "")
        handleGenerateQuestions(res.description || "")
    }

    const handleGenerateQuestions = async (jd: string) => {
        setIsGeneratingQuestions(true)
        void rememberOptions([{ kind: "company", values: [companyName] }, { kind: "job_title", values: [jobTitle] }])
        const res = await generateCoverLetterQuestions(jd)
        if (!res.success || !res.jobId) {
            setIsGeneratingQuestions(false)
            return toast.error(creditErrorMessage(res, "Could not generate questions"))
        }

        // Follows the same worker path as writing the letter, one step later in
        // this same screen. It used to be an inline call, which meant these two
        // adjacent buttons waited differently and only one of them refunded.
        const outcome = await awaitBackgroundJob<{ questions?: CoverLetterQuestion[] }>(
            res.jobId,
            (_progress, phaseLabel) => { if (phaseLabel) setGenerationPhase(phaseLabel) },
        )
        setIsGeneratingQuestions(false)
        setGenerationPhase("")

        if (!outcome.ok) return toast.error(outcome.error)

        const qs = outcome.result?.questions ?? []
        if (qs.length === 0) return toast.error("No questions could be generated from that job description")

        setQuestions(qs)
        setStep(2)

        // Save as draft so user can resume later
        const draftRes = await saveCoverLetterDraft({
            jobUrl,
            companyName: companyName || "",
            jobTitle: jobTitle || "",
            jobDescription: jd,
            tone,
            questions: qs,
        })
        if (draftRes.success && draftRes.draftId) {
            setDraftId(draftRes.draftId)
            setHistory(prev => [{
                id: draftRes.draftId!,
                companyName: companyName || null,
                jobTitle: jobTitle || null,
                createdAt: new Date(),
                isDraft: true,
            }, ...prev])
        }
    }

    const handleGenerateLetter = async () => {
        setIsGeneratingLetter(true)
        const res = await generateAndSaveCoverLetter({
            jobUrl,
            companyName: companyName || "The Company",
            jobTitle: jobTitle || "The Position",
            jobDescription,
            tone,
            questions,
            answers,
            draftId: draftId ?? undefined,
        })
        if (!res.success || !res.jobId) {
            setIsGeneratingLetter(false)
            return toast.error(creditErrorMessage(res, "Could not generate the cover letter"))
        }

        // Writing the letter runs on the worker now - a gpt-4o pass over a whole
        // JD and profile does not fit in a request. Follow the job instead. The
        // credit hold settles or refunds when this poll first sees a terminal
        // status, so closing the tab no longer charges for nothing.
        const outcome = await awaitBackgroundJob<{ content?: string }>(
            res.jobId,
            (_progress, phaseLabel) => { if (phaseLabel) setGenerationPhase(phaseLabel) },
        )
        setIsGeneratingLetter(false)
        setGenerationPhase("")

        if (!outcome.ok) return toast.error(outcome.error)

        setGeneratedContent(outcome.result?.content || "")
        setStep(3)
        // Update history: replace draft entry with completed letter
        setHistory(prev => [{
            id: res.coverLetterId!,
            companyName: companyName || "The Company",
            jobTitle: jobTitle || "The Position",
            createdAt: new Date(),
            isDraft: false,
        }, ...prev.filter(h => h.id !== (draftId ?? res.coverLetterId))])
        router.push(`/ai/resume/cover-letter?id=${res.coverLetterId}`)
    }

    const isLoading = isExtracting || isGeneratingQuestions || isGeneratingLetter

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
            {/* ── Main area ── */}
            <div className="lg:col-span-3 space-y-0">
                <StepIndicator current={step} />

                {/* ── Step 1: Job Details ── */}
                {step === 1 && (
                    <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
                        {(isExtracting || isGeneratingQuestions) && (
                            <LoadingOverlay
                                message={isExtracting ? "Extracting job details…" : "Generating tailored questions…"}
                                sub="This takes 10-20 seconds"
                            />
                        )}

                        {/* Job Link */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Job link
                            </Label>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Paste the job posting URL and we&apos;ll auto-extract the role details.</p>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    placeholder="https://company.com/careers/..."
                                    value={jobUrl}
                                    onChange={e => setJobUrl(e.target.value)}
                                    disabled={isLoading}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleExtract}
                                    disabled={isLoading || !jobUrl}
                                    className="shrink-0"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Read the posting
                                </Button>
                            </div>
                        </div>

                        {/* Company + Title */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    Company <span className="text-neutral-600 dark:text-neutral-400 font-normal">(optional)</span>
                                </Label>
                                <OptionSelect value={companyName} onChange={setCompanyName} options={options.company} placeholder="e.g. Razorpay" disabled={isLoading} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    Job title <span className="text-neutral-600 dark:text-neutral-400 font-normal">(optional, overrides the posting)</span>
                                </Label>
                                <OptionSelect value={jobTitle} onChange={setJobTitle} options={options.job_title} placeholder="e.g. Frontend Engineer" disabled={isLoading} />
                            </div>
                        </div>

                        {/* Tone */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Tone
                            </Label>
                            <Select value={tone} onValueChange={setTone} disabled={isLoading}>
                                <SelectTrigger className="w-full sm:w-64">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Professional">Professional & Direct</SelectItem>
                                    <SelectItem value="Enthusiastic">Highly Enthusiastic</SelectItem>
                                    <SelectItem value="Creative">Creative & Bold</SelectItem>
                                    <SelectItem value="Academic">Academic & Methodical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Manual JD fallback */}
                        <div className="pt-4 border-t border-dashed border-neutral-200 dark:border-neutral-800 space-y-1.5">
                            <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Or paste the job description
                            </Label>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Use this if the URL extraction fails.</p>
                            <Textarea
                                className="text-sm h-32 mt-1"
                                placeholder="Paste the full job description here…"
                                value={jobDescription}
                                onChange={e => setJobDescription(e.target.value)}
                                disabled={isLoading}
                            />
                            <div className="flex justify-end pt-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateQuestions(jobDescription)}
                                    disabled={!jobDescription || isLoading}
                                >
                                    Use this description{priceSuffix("cover_letter_questions")}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Tailor ── */}
                {step === 2 && (
                    <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-6">
                        {isGeneratingLetter && (
                            <LoadingOverlay
                                message="Crafting your cover letter…"
                                sub="Personalising with your answers - takes ~20 seconds"
                            />
                        )}

                        <div>
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Tailor your letter</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Answer a few questions about your experience specific to this role.</p>
                        </div>

                        {questions.map((q, idx) => (
                            <QuestionRenderer
                                key={q.id}
                                question={q}
                                index={idx}
                                value={answers[q.id]}
                                onChange={(val: string | string[]) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                            />
                        ))}

                        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center justify-between rounded-b-2xl border-t border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
                            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                                Back
                            </Button>
                            <Button onClick={handleGenerateLetter} disabled={isGeneratingLetter}>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Write my letter{priceSuffix("cover_letter_generate")}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Generated Letter ── */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Button variant="outline" size="sm" onClick={resetFlow}>
                                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                                New letter
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedContent)
                                        toast.success("Copied to clipboard")
                                    }}
                                >
                                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                                    Copy
                                </Button>
                                <Button size="sm" onClick={() => toPDF()}>
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    Download PDF
                                </Button>
                            </div>
                        </div>

                        <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800">
                            <CardContent className="pt-6">
                                <div ref={targetRef} className="prose prose-sm dark:prose-invert max-w-none p-2">
                                    <MarkdownRenderer content={generatedContent} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* ── History sidebar ── */}
            <StickyAside as="div" className="lg:col-span-1 space-y-3">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Letters</span>
                    {history.length > 0 && (
                        <Badge variant="secondary" className="text-xs ml-auto">{history.length}</Badge>
                    )}
                </div>

                {history.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 p-6 text-center">
                        <FileText className="w-8 h-8 text-neutral-600 dark:text-neutral-400 mx-auto mb-2" />
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">No letters generated yet.</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Complete Step 1 to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((h: CoverLetterHistoryItem) => (
                            <div
                                key={h.id}
                                onClick={() => {
                                    if (h.isDraft) {
                                        router.push(`/ai/resume/cover-letter?id=${h.id}`)
                                    } else {
                                        router.push(`/ai/resume/cover-letter?id=${h.id}`)
                                    }
                                }}
                                className={`group p-3 rounded-xl border cursor-pointer transition-colors ${selectedId === h.id
                                    ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white"
                                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="overflow-hidden flex-1">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            {h.isDraft && (
                                                <Badge className="text-xs px-1 h-3.5 bg-neutral-50 text-neutral-800 border-neutral-200 dark:bg-neutral-800/20 dark:text-neutral-100 dark:border-neutral-800/40">
                                                    <PenLine className="w-2.5 h-2.5 mr-0.5" />
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                        <p className={`text-xs font-semibold truncate ${selectedId === h.id ? "text-white dark:text-black" : "text-neutral-800 dark:text-neutral-200"}`}>
                                            {h.jobTitle || "Untitled role"}
                                        </p>
                                        <p className={`text-xs truncate mt-0.5 ${selectedId === h.id ? "text-white/75 dark:text-neutral-900/70" : "text-neutral-500"}`}>
                                            {h.isDraft ? "Continue from step 2 →" : (h.companyName || "Unknown company")}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${selectedId === h.id ? "hover:bg-white/20 text-white/75 dark:text-neutral-900/70" : "text-neutral-600 hover:text-red-500"}`}
                                        onClick={(e) => handleDelete(h.id, e)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </StickyAside>
        </div>
    )
}

// ── Voice button (shared) ────────────────────────────────────────────────────
function VoiceButton({
    onTranscribed,
    compact = false,
}: {
    onTranscribed: (text: string) => void
    compact?: boolean
}) {
    const [recording, setRecording] = useState(false)
    const [loading, setLoading] = useState(false)
    const [liveText, setLiveText] = useState("")
    const mediaRef = useRef<MediaRecorder | null>(null)
    const recognitionRef = useRef<unknown>(null)

    const start = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            const chunks: Blob[] = []
            recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop())
                setLiveText("")
                if (!chunks.length) { setLoading(false); return toast.error("No audio recorded") }
                const blob = new Blob(chunks, { type: "audio/webm" })
                const reader = new FileReader()
                reader.onloadend = async () => {
                    const base64 = (reader.result as string).split(",")[1]
                    if (!base64) { setLoading(false); return }
                    const res = await whisperTranscribe(base64, "audio/webm")
                    setLoading(false)
                    if (res.success && res.text) {
                        onTranscribed(res.text)
                        toast.success("Voice captured")
                    } else {
                        toast.error(res.error ?? "Transcription failed")
                    }
                }
                reader.readAsDataURL(blob)
            }
            // Live preview using WebSpeech API
            if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
                 
                const SR = (window as any).webkitSpeechRecognition
                const sr = new SR() as {
                    continuous: boolean; interimResults: boolean; start(): void; stop(): void
                    onresult: ((e: { resultIndex: number; results: { [k: number]: { [k: number]: { transcript: string } }; length: number } }) => void) | null
                }
                sr.continuous = true
                sr.interimResults = true
                sr.onresult = (e) => {
                    let interim = ""
                    for (let i = e.resultIndex; i < e.results.length; i++) {
                        interim += e.results[i]![0]!.transcript
                    }
                    setLiveText(interim)
                }
                sr.start()
                recognitionRef.current = sr
            }
            recorder.start()
            mediaRef.current = recorder
            setRecording(true)
            setLoading(true)
        } catch {
            toast.error("Microphone access denied")
        }
    }

    const stop = () => {
        mediaRef.current?.stop()
        const r = recognitionRef.current as { stop?: () => void } | null
        r?.stop?.()
        setRecording(false)
    }

    return (
        <div className="flex flex-col gap-1">
            <Button
                type="button"
                variant={recording ? "destructive" : "outline"}
                size="sm"
                className={compact ? "h-7 gap-1.5 text-xs" : "h-8 gap-2 text-xs"}
                disabled={loading && !recording}
                onClick={recording ? stop : start}
            >
                {recording ? (
                    <><Square className="w-3 h-3" /> Stop</>
                ) : loading ? (
                    <><DotmSquare11 size={14} dotSize={2} speed={1.4} /> Processing…</>
                ) : (
                    <><Mic className="w-3 h-3" /> Voice</>
                )}
            </Button>
            {liveText && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 italic truncate max-w-xs">{liveText}</p>
            )}
        </div>
    )
}

// ── Question renderer ────────────────────────────────────────────────────────
function QuestionRenderer({
    question, index, value, onChange
}: {
    question: CoverLetterQuestion
    index: number
    value: string | string[] | undefined
    onChange: (val: string | string[]) => void
}) {
    if (question.type === "SINGLE") {
        return (
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <Label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {index + 1}. {question.text}
                    </Label>
                    <VoiceButton
                        compact
                        onTranscribed={(text) => {
                            // match spoken answer to nearest option
                            const lower = text.toLowerCase()
                            const match = question.options?.find((o) => lower.includes(o.toLowerCase()))
                            if (match) onChange(match)
                            else toast.info(`Heard: "${text}" - please select manually`)
                        }}
                    />
                </div>
                <RadioGroup value={value as string | undefined} onValueChange={onChange} className="space-y-2">
                    {question.options?.map((opt: string) => (
                        <div key={opt} className="flex items-center gap-2">
                            <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
                            <Label htmlFor={`${question.id}-${opt}`} className="text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                {opt}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        )
    }

    if (question.type === "MULTIPLE") {
        const toggleMulti = (opt: string, checked: boolean) => {
            const current = (value as string[]) || []
            onChange(checked ? [...current, opt] : current.filter((x) => x !== opt))
        }
        return (
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <Label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {index + 1}. {question.text}
                    </Label>
                    <VoiceButton
                        compact
                        onTranscribed={(text) => {
                            const lower = text.toLowerCase()
                            const matched = question.options?.filter((o) => lower.includes(o.toLowerCase())) ?? []
                            if (matched.length) {
                                onChange([...new Set([...((value as string[]) || []), ...matched])])
                            } else {
                                toast.info(`Heard: "${text}" - please select manually`)
                            }
                        }}
                    />
                </div>
                <div className="space-y-2">
                    {question.options?.map((opt: string) => (
                        <div key={opt} className="flex items-center gap-2">
                            <Checkbox
                                id={`${question.id}-${opt}`}
                                checked={((value as string[]) || []).includes(opt)}
                                onCheckedChange={(checked) => toggleMulti(opt, checked as boolean)}
                            />
                            <Label htmlFor={`${question.id}-${opt}`} className="text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                {opt}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // TEXTAREA - free-form answer with voice
    return (
        <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
                <Label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {index + 1}. {question.text}
                </Label>
                <VoiceButton
                    compact
                    onTranscribed={(text) => onChange(((value as string) || "") + (value ? "\n" : "") + text)}
                />
            </div>
            <Textarea
                value={(value as string) || ""}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                placeholder="Type or speak your answer…"
            />
        </div>
    )
}
