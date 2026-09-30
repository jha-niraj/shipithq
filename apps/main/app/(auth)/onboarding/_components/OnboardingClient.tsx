"use client"

import { useOptions } from "@/lib/use-options"
import { rememberOptions } from "@/actions/(common)/options/options.action"
import { useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { isSafeCallback } from "@/lib/urls"
import { AtSign, CalendarDays, Camera, FileText, GraduationCap, LogOut, Loader2, Target } from "lucide-react"
import {
	TypeformFlow, type FlowStep, type FlowFileValue,
} from "@repo/ui/components/typeform-flow"
import { signOut, useSession } from "@repo/auth/client"
import { SigningOutScreen } from "@repo/ui/components/ui/signing-out-screen"
import toast from "@repo/ui/components/ui/sonner"
import { checkUsernameAvailability, completeOnboarding } from "@/actions/(main)/user/onboarding.action"
import { uploadResume } from "@/actions/(main)/user/resume.action"
import { uploadProfileImage } from "@/actions/(common)/shared/upload.action"
import { finalizeSignup } from "@/actions/(auth)/auth/signup.actions"
import { OnboardingSidePanel } from "./onboarding-side-panel"
import { OnboardingShaderBg } from "./onboarding-shader-bg"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

const SEMESTERS = [
	"1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
	"5th Semester", "6th Semester", "7th Semester", "8th Semester",
	"Graduate", "Post-Graduate", "Other",
]

// Stored on `users.learningPreferences`. Labels are what the user picks; the ids
// are what we persist, so renaming a label never orphans existing rows.
const LEARNING_GOALS: Array<{ id: string; label: string }> = [
	{ id: "web-dev", label: "Web Development" },
	{ id: "mobile-dev", label: "Mobile Development" },
	{ id: "backend", label: "Backend Engineering" },
	{ id: "fullstack", label: "Full Stack" },
	{ id: "dsa", label: "Data Structures & Algorithms" },
	{ id: "system-design", label: "System Design" },
	{ id: "os-db", label: "OS & Databases" },
	{ id: "ai-ml", label: "AI & Machine Learning" },
	{ id: "cloud", label: "Cloud Computing" },
	{ id: "devops", label: "DevOps & CI/CD" },
	{ id: "cybersecurity", label: "Cybersecurity" },
	{ id: "blockchain", label: "Blockchain & Web3" },
	{ id: "game-dev", label: "Game Development" },
	{ id: "iot", label: "Internet of Things" },
	{ id: "qa-testing", label: "QA & Automation" },
	{ id: "ui-ux", label: "UI/UX Design" },
	{ id: "product-mgmt", label: "Product Management" },
	{ id: "technical-writing", label: "Technical Writing" },
]

const LABEL_TO_GOAL_ID = new Map(LEARNING_GOALS.map((g) => [g.label, g.id]))

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

function validateUsername(value: unknown): string | null {
	const v = String(value ?? "").trim()
	if (v.length < 3 || v.length > 20) return "Username must be between 3 and 20 characters."
	if (!USERNAME_RE.test(v)) return "Only letters, numbers, underscores and hyphens."
	return null
}

/** Suggest a handle from the signed-in name/email so the first field is never blank. */
function suggestUsername(source: string | null | undefined): string {
	const base = (source ?? "").split("@")[0] ?? ""
	const cleaned = base.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase().slice(0, 20)
	return cleaned.length >= 3 ? cleaned : ""
}

export default function OnboardingClient() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { data: session, refetch } = useSession()
	const [open, setOpen] = useState(true)
	const [loggingOut, setLoggingOut] = useState(false)
	// True from the moment the flow closes until the browser has actually left this route.
	// Without it the page renders NOTHING in that window - see the note on `handleClose`.
	const [leaving, setLeaving] = useState(false)
	const submittedRef = useRef(false)
	// The profile was saved (at the learning goals step); the resume after it is optional.
	const savedRef = useRef(false)

	// Built-ins at once, then the colleges other students added (UF-5).
	const colleges = useOptions(["university"] as const)

	const steps: FlowStep[] = useMemo(() => [
		{
			id: "welcome",
			type: "welcome",
			question: "Welcome to ShipItHQ",
			description:
				"Let's set up your developer profile. It takes about a minute - and everything here can be changed later in Settings.",
		},
		{
			id: "username",
			type: "short_text",
			icon: <AtSign />,
			question: "Pick your username",
			navLabel: "Username",
			description: "This is your handle across ShipItHQ - on your profile, projects and leaderboard.",
			placeholder: "e.g. nirajbuilds",
			required: true,
			validate: validateUsername,
			// Uniqueness lives on the server, so it can only be checked there. Runs
			// on advance, after the format check passes.
			validateAsync: async (value) => {
				const result = await checkUsernameAvailability(String(value ?? "").trim())
				return result.available ? null : result.message
			},
		},
		{
			id: "avatar",
			type: "file",
			icon: <Camera />,
			question: "Add a profile photo",
			navLabel: "Profile photo",
			description: "Optional - you can always add or change it later.",
			accept: "image/jpeg,image/jpg,image/png,image/webp",
			maxSizeMb: 5,
			slots: [{ id: "avatar", label: "Profile photo" }],
		},
		{
			id: "university",
			type: "short_text",
			icon: <GraduationCap />,
			question: "Where do you study?",
			navLabel: "University",
			description: "Pick yours as you type, or type it if it isn't listed. Leave it blank if it doesn't apply.",
			placeholder: "Start typing your college",
			// A choice with "Other" (plan/ui-forms UF-5): the list shows as you type.
			suggestions: colleges.university,
		},
		{
			id: "semester",
			type: "single_choice",
			icon: <CalendarDays />,
			question: "Where are you right now?",
			navLabel: "Semester",
			options: SEMESTERS,
			columns: 2,
		},
		{
			id: "interests",
			type: "multiple_choice",
			icon: <Target />,
			question: "What do you want to get better at?",
			navLabel: "Learning goals",
			description: "Pick as many as you like - this shapes what ShipItHQ recommends you.",
			options: LEARNING_GOALS.map((g) => g.label),
			columns: 3,
			required: true,
			// Saving happens HERE, not after the resume step (Niraj, 2026-09-28): the resume
			// is optional, so leaving on it must still leave a finished profile. A failed
			// save shows as this step's error and keeps the reader here.
			validateAsync: async (value, answers) => {
				try {
					await saveProfile({ ...answers, interests: value })
					return null
				} catch (error: unknown) {
					return error instanceof Error ? error.message : "Could not save your profile. Try again."
				}
			},
		},
		{
			id: "resume",
			type: "file",
			icon: <FileText />,
			question: "Upload your resume",
			navLabel: "Resume",
			description:
				"Optional. Your profile is already saved, so you can skip this and add it later from your profile. It powers the AI resume review, cover letters and interview prep. PDF or DOCX.",
			accept: ".pdf,.doc,.docx",
			maxSizeMb: 5,
			slots: [{ id: "resume", label: "Resume" }],
		},
	], [colleges.university])

	const initialAnswers = useMemo(
		() => ({ username: suggestUsername(session?.user?.name || session?.user?.email) }),
		[session?.user?.name, session?.user?.email],
	)

	/** Everything but the resume: the photo, the profile and the signup side effects. Runs once. */
	const saveProfile = async (answers: Record<string, unknown>) => {
		if (savedRef.current) return
		const avatarFiles = (answers.avatar as FlowFileValue) ?? {}

		// 1) Profile photo. Best-effort: a failed upload must never block the account.
		let imageUrl: string | undefined
		const avatarFile = avatarFiles.avatar
		if (avatarFile) {
			try {
				const fd = new FormData()
				fd.append("file", avatarFile)
				const result = await uploadProfileImage(fd)
				if (result.success && result.url) imageUrl = result.url
			} catch {
				toast.warning("Profile photo upload failed - you can add one later from your profile.")
			}
		}

		// 2) The profile itself. This one MUST succeed: throwing keeps the reader on the
		//    step with its error, instead of dropping them into an app that still thinks
		//    they haven't onboarded. It also refreshes the session cookie (see the action).
		const selectedLabels = (answers.interests as string[]) ?? []
		void rememberOptions([{ kind: "university", values: [String(answers.university ?? "")] }])
		await completeOnboarding({
			username: String(answers.username ?? "").trim(),
			university: String(answers.university ?? "").trim() || undefined,
			semester: (answers.semester as string) || undefined,
			image: imageUrl,
			learningPreferences: selectedLabels
				.map((label) => LABEL_TO_GOAL_ID.get(label))
				.filter((id): id is string => Boolean(id)),
		})

		// 3) Signup side effects (referral credit, activity, welcome mail). Idempotent, and
		//    the only place they run for users who arrived via Google or a magic link.
		await finalizeSignup(null)
		await refetch()
		savedRef.current = true
		// From here, closing the flow goes into the app: the profile is done.
		submittedRef.current = true
	}

	const handleSubmit = async (answers: Record<string, unknown>) => {
		// Normally already saved at the learning goals step; this covers any path that skipped it.
		await saveProfile(answers)

		// The resume, if they added one. Best-effort: `uploadResume` persists it and
		// dispatches the parse job off the request path.
		const resumeFile = ((answers.resume as FlowFileValue) ?? {}).resume
		if (resumeFile) {
			try {
				await uploadResume(resumeFile, undefined, { draftName: "My resume" })
			} catch {
				toast.warning("Resume upload failed - you can upload it later from your profile.")
			}
		}
		submittedRef.current = true
		// TypeformFlow shows its own "You're all set" screen; its Continue button
		// (or autoCloseMs) triggers onClose below, which routes into the app.
	}

	const handleClose = () => {
		setOpen(false)
		setLeaving(true)

		if (!submittedRef.current) {
			router.push("/signin")
			return
		}
		// A user who arrived from a pricing CTA still has to finish onboarding, so
		// the destination they came for is parked rather than jumped to directly.
		// Hand it back now that setup is done. Two sources: `?callbackUrl=` when
		// middleware bounced an already-signed-in user here, and sessionStorage
		// when they came through the register page.
		const parked =
			searchParams.get("callbackUrl") ?? sessionStorage.getItem("sso_callback")
		sessionStorage.removeItem("sso_callback")
		const destination = isSafeCallback(parked) ? parked : "/home"

		// A FULL navigation, not router.push.
		//
		// This is the one moment in the product where the session cookie has just changed
		// - `completeOnboarding` set onboardingCompleted and `finalizeSignup` ran - and the
		// destination is behind middleware that reads that cookie. A client-side push
		// reuses the router cache and can be evaluated against the pre-update session,
		// which bounces /home straight back to /onboarding. The flow is closed by then, so
		// what the user sees is a blank page, and only a manual refresh recovers it.
		//
		// `assign` costs one full page load, once, at the end of signup. That is a fair
		// price for the last step of onboarding landing somewhere every time.
		window.location.assign(destination)
	}

	const handleLogout = async () => {
		if (loggingOut) return
		setLoggingOut(true)
		try {
			// Held at least 1.2s so the goodbye screen (JP-27) never flashes.
			await Promise.all([signOut(), new Promise((r) => setTimeout(r, 1200))])
		} catch {
			// even if the sign-out call fails, send them to the sign-in screen
		}
		router.push("/signin")
	}

	// Logging out: the goodbye screen until the sign-in page takes over (JP-27).
	if (loggingOut) return <SigningOutScreen />

	// TypeformFlow renders null when closed, and this component renders nothing else - so
	// between the flow closing and the browser leaving the route, the page was BLANK. That
	// window is not instant: it spans a middleware check and a full page load.
	if (leaving) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-neutral-950">
				<div className="text-center">
					<InlineLoader size="lg" />
					<p className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">
						{submittedRef.current ? "Setting up your workspace" : "Taking you back"}
					</p>
					<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
						{submittedRef.current
							? "One moment - this only happens once."
							: "Returning you to sign in."}
					</p>
				</div>
			</div>
		)
	}

	return (
		<TypeformFlow
			isOpen={open}
			onClose={handleClose}
			steps={steps}
			initialAnswers={initialAnswers}
			onSubmit={handleSubmit}
			themed
			renderSidePanel={(nav) => <OnboardingSidePanel nav={nav} />}
			persistKey="shipithq-onboarding-draft"
			background={<OnboardingShaderBg />}
			headerRight={
				<button
					type="button"
					onClick={handleLogout}
					disabled={loggingOut}
					className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
				>
					{loggingOut
						? <><InlineLoader size="sm" /> Logging out…</>
						: <><LogOut className="h-3.5 w-3.5" /> Log out</>}
				</button>
			}
			autoCloseMs={3500}
			submitLabel="Finish setup"
			thankYouTitle="You're all set!"
			thankYouDesc="Welcome to ShipItHQ. Let's get you building."
		/>
	)
}
