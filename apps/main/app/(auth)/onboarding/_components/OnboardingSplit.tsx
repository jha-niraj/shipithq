"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FileText, ImagePlus } from "lucide-react"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { SigningOutScreen } from "@repo/ui/components/ui/signing-out-screen"
import toast from "@repo/ui/components/ui/sonner"
import {
    Chip, FilePick, OnboardingFrame, OnboardingStep, PanelMuted, StepFooter, type OnboardingPanel,
} from "@repo/ui/components/onboarding/split-onboarding"
import { signOut, useSession } from "@repo/auth/client"
import { useOptions } from "@/lib/use-options"
import { isSafeCallback } from "@/lib/urls"
import { rememberOptions } from "@/actions/(common)/options/options.action"
import { checkUsernameAvailability, completeOnboarding } from "@/actions/(main)/user/onboarding.action"
import { uploadResume } from "@/actions/(main)/user/resume.action"
import { uploadProfileImage } from "@/actions/(common)/shared/upload.action"
import { finalizeSignup } from "@/actions/(auth)/auth/signup.actions"
import { LEARNING_GOALS, SEMESTERS, suggestUsername, validateUsername } from "./onboarding-data"

/*
 * Onboarding (plan/auth AUTH-10, AUTH-12; Niraj's reference, 2026-10-01): the auth pages'
 * panel on the left, one question at a time on the right, built from the shared kit in
 * @repo/ui/components/onboarding/split-onboarding. The profile is saved at the learning goals
 * step, so leaving on the optional resume step still leaves a finished profile.
 */

type StepId = "username" | "avatar" | "university" | "semester" | "interests" | "resume"

const STEPS: { id: StepId; title: string; hint: string; optional?: boolean; panel: OnboardingPanel }[] = [
    { id: "username", title: "Pick your username", hint: "Your handle across ShipItHQ: your profile, projects and leaderboard.",
        panel: { headline: <>Let&apos;s set you <PanelMuted>up.</PanelMuted></>, sub: "Six quick questions. Everything can be changed later in Settings.", art: "terminal" } },
    { id: "avatar", title: "Add a profile photo", hint: "Optional. JPG, PNG or WebP, up to 5 MB.", optional: true,
        panel: { headline: <>Put a face <PanelMuted>to the work.</PanelMuted></>, sub: "Profiles with a photo get more replies from recruiters and peers.", art: "shield" } },
    { id: "university", title: "Where do you study?", hint: "Pick yours as you type, or type it if it isn't listed.", optional: true,
        panel: { headline: <>Find your <PanelMuted>classmates.</PanelMuted></>, sub: "We use it to show what students at your college are building.", art: "roster" } },
    { id: "semester", title: "Where are you right now?", hint: "So recommendations match where you are.", optional: true,
        panel: { headline: <>Right work, <PanelMuted>right time.</PanelMuted></>, sub: "A first-year and a final-year need different next steps.", art: "commit-graph" } },
    { id: "interests", title: "What do you want to get better at?", hint: "Pick as many as you like. This shapes what ShipItHQ recommends.",
        panel: { headline: <>Choose your <PanelMuted>direction.</PanelMuted></>, sub: "Projects, practice and paths follow what you pick here.", art: "contributions" } },
    { id: "resume", title: "Upload your resume", hint: "Optional. Your profile is already saved. It powers resume review, cover letters and interview prep. PDF or DOCX, up to 5 MB.", optional: true,
        panel: { headline: <>Almost <PanelMuted>there.</PanelMuted></>, sub: "Add your resume now, or later from your profile.", art: "otp-mail" } },
]

const LABEL_TO_GOAL_ID = new Map(LEARNING_GOALS.map((g) => [g.label, g.id]))

export default function OnboardingSplit() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session, refetch } = useSession()
    const colleges = useOptions(["university"] as const)

    const [i, setI] = useState(0)
    const [username, setUsername] = useState("")
    const [avatar, setAvatar] = useState<File | null>(null)
    const [university, setUniversity] = useState("")
    const [semester, setSemester] = useState("")
    const [interests, setInterests] = useState<string[]>([])
    const [resume, setResume] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [leaving, setLeaving] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const saved = useRef(false)

    // The handle starts from the signed-in name or email.
    useEffect(() => {
        if (!username) setUsername(suggestUsername(session?.user?.name || session?.user?.email))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.name, session?.user?.email])

    const step = STEPS[i]!
    const matches = useMemo(() => {
        const q = university.trim().toLowerCase()
        if (!q) return []
        return colleges.university.filter((c) => c.toLowerCase().includes(q) && c.toLowerCase() !== q).slice(0, 6)
    }, [university, colleges.university])

    /** The profile, the photo and the signup side effects. Runs once, at the learning goals step. */
    const saveProfile = async () => {
        if (saved.current) return
        let image: string | undefined
        if (avatar) {
            try {
                const fd = new FormData()
                fd.append("file", avatar)
                const r = await uploadProfileImage(fd)
                if (r.success && r.url) image = r.url
            } catch {
                toast.warning("Profile photo upload failed - you can add one later from your profile.")
            }
        }
        void rememberOptions([{ kind: "university", values: [university] }])
        await completeOnboarding({
            username: username.trim(),
            university: university.trim() || undefined,
            semester: semester || undefined,
            image,
            learningPreferences: interests.map((l) => LABEL_TO_GOAL_ID.get(l)).filter((id): id is string => Boolean(id)),
        })
        await finalizeSignup(null)
        await refetch()
        saved.current = true
    }

    /** Into the app: a full navigation, because the session cookie just changed. */
    const finish = () => {
        setLeaving(true)
        const parked = searchParams.get("callbackUrl") ?? sessionStorage.getItem("sso_callback")
        sessionStorage.removeItem("sso_callback")
        window.location.assign(isSafeCallback(parked) ? parked : "/home")
    }

    // Back is closed once the profile is saved: the steps before it are already stored.
    const canGoBack = i > 0 && !saved.current
    const back = () => { if (canGoBack) { setError(null); setI(i - 1) } }

    const next = async (skip = false) => {
        if (busy) return
        setError(null)
        setBusy(true)
        try {
            if (step.id === "username") {
                const bad = validateUsername(username)
                if (bad) return setError(bad)
                const r = await checkUsernameAvailability(username.trim())
                if (!r.available) return setError(r.message)
            }
            if (step.id === "interests") {
                if (!interests.length) return setError("Pick at least one.")
                await saveProfile()
            }
            if (step.id === "resume") {
                if (!skip && resume) {
                    try {
                        await uploadResume(resume, undefined, { draftName: "My resume" })
                    } catch {
                        toast.warning("Resume upload failed - you can upload it later from your profile.")
                    }
                }
                return finish()
            }
            if (skip) {
                if (step.id === "avatar") setAvatar(null)
                if (step.id === "university") setUniversity("")
                if (step.id === "semester") setSemester("")
            }
            setI((n) => Math.min(STEPS.length - 1, n + 1))
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong. Try again.")
        } finally {
            setBusy(false)
        }
    }

    const logout = async () => {
        if (loggingOut) return
        setLoggingOut(true)
        try {
            // Held at least 1.2s so the goodbye screen never flashes.
            await Promise.all([signOut(), new Promise((r) => setTimeout(r, 1200))])
        } catch {
            // even if the sign-out call fails, send them to the sign-in screen
        }
        router.push("/signin")
    }

    if (loggingOut) return <SigningOutScreen />

    if (leaving) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-white px-6 dark:bg-neutral-950">
                <div className="text-center">
                    <InlineLoader size="lg" />
                    <p className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">Setting up your workspace</p>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">One moment - this only happens once.</p>
                </div>
            </div>
        )
    }

    return (
        <OnboardingFrame
            panel={step.panel}
            panelKey={step.id}
            steps={STEPS.length}
            current={i}
            onJump={saved.current ? undefined : (n) => { setError(null); setI(n) }}
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
                footer={
                    <StepFooter
                        onBack={canGoBack ? back : undefined}
                        onSkip={step.optional ? () => void next(true) : undefined}
                        onNext={() => void next()}
                        nextLabel={step.id === "resume" ? "Finish" : "Continue"}
                        busy={busy}
                    />
                }
            >
                {step.id === "username" && (
                    <Input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. nirajbuilds" aria-label="Username" />
                )}
                {step.id === "avatar" && (
                    <FilePick image accept="image/jpeg,image/jpg,image/png,image/webp" file={avatar} onPick={setAvatar} onError={setError}
                        icon={<ImagePlus className="size-5" />} label="Choose a photo" />
                )}
                {step.id === "university" && (
                    <div>
                        <Input autoFocus value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Start typing your college" aria-label="College" />
                        {matches.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {matches.map((m) => <Chip key={m} on={false} onClick={() => setUniversity(m)}>{m}</Chip>)}
                            </div>
                        )}
                    </div>
                )}
                {step.id === "semester" && (
                    <div className="flex flex-wrap gap-2">
                        {SEMESTERS.map((s) => <Chip key={s} on={semester === s} onClick={() => setSemester(semester === s ? "" : s)}>{s}</Chip>)}
                    </div>
                )}
                {step.id === "interests" && (
                    <div className="flex flex-wrap gap-2">
                        {LEARNING_GOALS.map((g) => {
                            const on = interests.includes(g.label)
                            return <Chip key={g.id} on={on} onClick={() => setInterests(on ? interests.filter((x) => x !== g.label) : [...interests, g.label])}>{g.label}</Chip>
                        })}
                    </div>
                )}
                {step.id === "resume" && (
                    <FilePick accept=".pdf,.doc,.docx" file={resume} onPick={setResume} onError={setError}
                        icon={<FileText className="size-5" />} label="Choose your resume" />
                )}
            </OnboardingStep>
        </OnboardingFrame>
    )
}
