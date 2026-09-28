"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { ArrowRight, BookOpen, Flame, Sparkles, Trophy, type LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/components/ui/dialog"
import { Button } from "@repo/ui/components/ui/button"

/**
 * "Sign in to do this" (plan/incidents INC-1, INC-29): a dialog that sends the reader to
 * /signin or /register and back to where they were (`callbackUrl`), instead of throwing
 * them onto the sign-in page. Public pages inside the shell (Incidents) use it for every
 * action; the sidebar uses it for ShipItHQ AI.
 *
 * A tiny external store, so any component can open it (`openSignInPrompt`) and the one
 * host mounted in the app shell renders it.
 */

export type SignInPrompt = {
    callback: string
    eyebrow?: string
    title?: string
    body?: string
    perks?: { icon: LucideIcon; text: string }[]
}

let current: SignInPrompt | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function openSignInPrompt(p: SignInPrompt) { current = p; emit() }
export function closeSignInPrompt() { current = null; emit() }

function useCurrent() {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => current, () => null)
}

const DEFAULT_PERKS = [
    { icon: Sparkles, text: "Harbor, the AI that knows the page you are on" },
    { icon: Trophy, text: "XP and your level across practice, projects and Incidents" },
    { icon: BookOpen, text: "Your progress, kept between visits" },
]

export const INCIDENT_PERKS = [
    { icon: Trophy, text: "XP for every call you get right, into your ShipItHQ level" },
    { icon: Flame, text: "A streak, badges and a readiness score per topic" },
    { icon: BookOpen, text: "Your place in every case, kept between visits" },
]

export function SignInPromptDialog({ prompt, onClose }: { prompt: SignInPrompt | null; onClose: () => void }) {
    const q = prompt ? `?callbackUrl=${encodeURIComponent(prompt.callback)}` : ""
    const perks = prompt?.perks ?? DEFAULT_PERKS
    return (
        <Dialog open={prompt !== null} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0">
                <div className="border-b border-neutral-200 bg-neutral-50 px-6 pb-5 pt-6 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">{prompt?.eyebrow ?? "ShipItHQ"}</p>
                    <DialogTitle className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                        {prompt?.title ?? "Sign in to continue"}
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                        {prompt?.body ?? "It takes a moment, and you come straight back to this page."}
                    </DialogDescription>
                </div>
                <ul className="space-y-3 px-6 py-5">
                    {perks.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-start gap-3 text-sm leading-5 text-neutral-700 dark:text-neutral-300">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800"><Icon className="size-3.5" aria-hidden /></span>
                            <span className="pt-1">{text}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-col gap-2 border-t border-neutral-200 px-6 py-5 sm:flex-row-reverse dark:border-neutral-800">
                    <Button asChild className="h-10 flex-1 rounded-xl">
                        <Link href={`/signin${q}`} onClick={onClose}>Sign in <ArrowRight className="ml-1.5 size-4" aria-hidden /></Link>
                    </Button>
                    <Button asChild variant="outline" className="h-10 flex-1 rounded-xl">
                        <Link href={`/register${q}`} onClick={onClose}>Create a free account</Link>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

/** Mounted once in the app shell. */
export function SignInPromptHost() {
    const prompt = useCurrent()
    return <SignInPromptDialog prompt={prompt} onClose={closeSignInPrompt} />
}
