"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, MicOff } from "lucide-react"
import { useScribe } from "@elevenlabs/react"
import { Button } from "@repo/ui/components/ui/button"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { cn } from "@repo/ui/lib/utils"
import type { OpenInputProps } from "@repo/ui/components/adaptive-flow"
import { getScribeToken } from "@/actions/(main)/practice"

const INK_DIM = "text-neutral-600 dark:text-neutral-400"

/**
 * The open-question input: a text field plus a microphone on the ElevenLabs
 * Scribe real-time transcription the practice mentor already uses. Speech
 * lands in the field for the user to review; nothing is sent until OK.
 */
export function OpenAnswerInput({ value, onChange, onSubmit, disabled, setViaVoice, maxChars }: OpenInputProps) {
    const [micNotice, setMicNotice] = useState<string | null>(null)
    const [connecting, setConnecting] = useState(false)
    // The text that was in the field when recording started, so partial
    // transcripts replace only what the mic added.
    const baseRef = useRef("")

    const scribe = useScribe({
        onPartialTranscript: (data) => {
            onChange(`${baseRef.current}${data.text}`.slice(0, maxChars))
        },
        onCommittedTranscript: (data) => {
            const committed = data.text.trim()
            if (!committed) return
            baseRef.current = `${baseRef.current}${committed} `
            onChange(baseRef.current.slice(0, maxChars))
            setViaVoice(true)
        },
    })

    // The mic must not outlive the question: unmounting stops it so the next
    // question's field is not filled with speech meant for this one.
    useEffect(() => () => {
        if (scribe.isConnected) scribe.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const toggleMic = async () => {
        if (scribe.isConnected) {
            scribe.disconnect()
            return
        }
        setMicNotice(null)
        setConnecting(true)
        try {
            const token = await getScribeToken()
            if (!token.success) {
                setMicNotice("The microphone is unavailable right now. You can still type.")
                return
            }
            baseRef.current = value ? `${value.trimEnd()} ` : ""
            await scribe.connect({
                token: token.token,
                microphone: { echoCancellation: true, noiseSuppression: true },
            })
        } catch {
            setMicNotice("Microphone access was blocked. You can still type.")
        } finally {
            setConnecting(false)
        }
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
                    placeholder={scribe.isConnected ? "Listening. Speak, then review the text." : "Type your answer, or use the mic"}
                    className="min-h-[88px] flex-1 text-base"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={toggleMic}
                    disabled={disabled || connecting}
                    aria-pressed={scribe.isConnected}
                    aria-label={scribe.isConnected ? "Stop the microphone" : "Answer with the microphone"}
                    className={cn("h-11 w-11 shrink-0 rounded-xl", scribe.isConnected && "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900")}
                >
                    {scribe.isConnected ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>
            <div className={cn("mt-1 flex items-center justify-between text-xs", INK_DIM)}>
                <span>
                    {scribe.isConnected ? (
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
