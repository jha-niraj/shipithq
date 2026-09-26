"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, MicOff } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { cn } from "@repo/ui/lib/utils"
import type { OpenInputProps } from "@repo/ui/components/adaptive-flow"
import { useDictation } from "@/hooks/useDictation"

const INK_DIM = "text-neutral-600 dark:text-neutral-400"

/**
 * The open-question input: a text field plus a microphone on the same Sarvam
 * dictation the practice mentor uses (plan/voice VO-13). Speech lands in the
 * field for the user to review; nothing is sent until OK.
 */
export function OpenAnswerInput({ value, onChange, onSubmit, disabled, setViaVoice, maxChars }: OpenInputProps) {
    const [micNotice, setMicNotice] = useState<string | null>(null)
    // The text that was in the field when recording started, so the transcript
    // replaces only what the mic added.
    const baseRef = useRef("")
    const dictation = useDictation({
        onText: (text) => {
            onChange(`${baseRef.current}${text}`.slice(0, maxChars))
            setViaVoice(true)
        },
    })
    const listening = dictation.status === "listening" || dictation.status === "transcribing"
    const connecting = dictation.status === "starting"
    useEffect(() => {
        if (dictation.error) setMicNotice(dictation.unavailable ? "The microphone is unavailable right now. You can still type." : dictation.error)
    }, [dictation.error, dictation.unavailable])

    // The mic must not outlive the question: the hook stops it on unmount, so the
    // next question's field is not filled with speech meant for this one.
    const toggleMic = async () => {
        if (dictation.status !== "idle") { await dictation.stop(); return }
        setMicNotice(null)
        baseRef.current = value ? `${value.trimEnd()} ` : ""
        await dictation.start()
    }

    return (
        <div>
            <div className="flex items-start gap-2">
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            onSubmit()
                        }
                    }}
                    disabled={disabled}
                    rows={3}
                    autoFocus
                    placeholder={listening ? "Listening. Speak, then review the text." : "Type your answer, or use the mic"}
                    className="min-h-[88px] flex-1 text-base"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={toggleMic}
                    disabled={disabled || connecting}
                    aria-pressed={listening}
                    aria-label={listening ? "Stop the microphone" : "Answer with the microphone"}
                    className={cn("h-11 w-11 shrink-0 rounded-xl", listening && "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900")}
                >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>
            <div className={cn("mt-1 flex items-center justify-between text-xs", INK_DIM)}>
                <span>
                    {listening ? (
                        <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                            Listening
                        </span>
                    ) : micNotice ?? ""}
                </span>
                <span>{value.length}/{maxChars}</span>
            </div>
        </div>
    )
}
