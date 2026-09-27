"use client"

import {
	useEffect, useRef, useCallback, useState, useMemo, type KeyboardEvent, type ReactNode,
} from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
	X, ArrowUp, Check, Upload, FileText, Trash2, ChevronDown, Search, MapPin,
} from "lucide-react"
import { NEPAL_PROVINCES, INDIA_STATES, type LocationValue } from "./ui/location-selector"
import { COUNTRIES, CountryPhoneInput } from "./ui/country-phone-input"
import { ScrollArea } from "./ui/scroll-area"

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlowStepType =
	| "welcome"
	| "short_text"
	| "long_text"
	| "single_choice"
	| "multiple_choice"
	| "email"
	| "phone"
	| "number"
	| "file"
	| "location"
	| "country_phone"

/** A named upload slot inside a "file" step (e.g. Logo, Registration Certificate). */
export interface FlowFileSlot {
	id: string
	label: string
	/** Optional per-slot override; falls back to the step-level accept. */
	accept?: string
}

/** The value stored for a "file" step: one File per slot id. */
export type FlowFileValue = Record<string, File>

/** The value stored for a "location" step. */
export type FlowLocationValue = LocationValue & { address?: string }

export interface FlowStep {
	id: string
	type: FlowStepType
	question: string
	description?: string
	placeholder?: string
	required?: boolean
	options?: string[]
	/** When set, the choices are computed from the answers so far (e.g. boards by country). */
	dynamicOptions?: (answers: Record<string, unknown>) => string[]
	/** Lay the choice options out in a 2-column grid instead of a single-column stack.
	 *  Use for long lists (grade, subjects) so they take roughly half the vertical space
	 *  and do not force the pane to scroll. Applies to single_choice / multiple_choice only. */
	columns?: 1 | 2 | 3
	/** Shown above the question, one per step (Niraj, 2026-09-28: not the same arrow on every step). */
	icon?: ReactNode
	/** For a "country_phone" step: the id of a "location" step whose selected country
	 *  pre-fills the phone's dial code, so the student does not have to re-pick it. */
	countrySourceStepId?: string
	/** Short label shown in the side-panel step list. Falls back to `question`. */
	navLabel?: string
	validate?: (value: unknown) => string | null
	/** Server-checked validation, run on advance AFTER `validate` passes (so a
	 *  malformed value never costs a round trip). Return an error string to block
	 *  the step, or null to allow it. Use for uniqueness checks - a username, a
	 *  slug - where the answer only exists on the server. The OK button shows a
	 *  checking state while it runs. */
	/** Runs on advance, after `validate`. Gets every answer so far too, for a step that saves them. */
	validateAsync?: (value: unknown, answers: Record<string, unknown>) => Promise<string | null>
	// ── "file" step config ──
	/** Named upload slots. If omitted, a single unnamed slot (id === step.id) is used. */
	slots?: FlowFileSlot[]
	/** Accepted file types, e.g. "image/*,.pdf". Applies to every slot without its own. */
	accept?: string
	/** Per-file size ceiling in MB. Defaults to 5. */
	maxSizeMb?: number
}

/** Navigation state handed to a custom side panel so it can render + jump between steps. */
export interface FlowNav {
	/** Real (non-welcome) steps in order. */
	realSteps: FlowStep[]
	/** Index of the current step within realSteps (-1 on the welcome screen). */
	realIdx: number
	/** Furthest real-step index the user has reached (for gating forward jumps). */
	maxRealIdx: number
	/** 0..1 progress across the real steps. */
	progress: number
	/** True once the final step has been submitted. */
	isDone: boolean
	/** Jump to a real step by its realSteps index (only allowed up to maxRealIdx). */
	goToRealStep: (realIndex: number) => void
	/** The current answers map. */
	answers: Record<string, unknown>
}

export interface TypeformFlowProps {
	isOpen: boolean
	onClose: () => void
	steps: FlowStep[]
	onSubmit: (answers: Record<string, unknown>) => Promise<void> | void
	onStepChange?: (stepId: string, answers: Record<string, unknown>) => void
	/** Pre-populate the answers map (e.g. editing an existing profile, or a school-assigned
	 *  grade). Read once when the flow opens; changes afterwards don't re-seed a live flow. */
	initialAnswers?: Record<string, unknown>
	title?: string
	submitLabel?: string
	thankYouTitle?: string
	thankYouDesc?: string
	accentColor?: string
	/** Enable the professional neutral theme with full light/dark support. */
	themed?: boolean
	/** Custom left panel (rendered at w-1/3 on lg+). When set, the built-in counter and
	 *  Back button are hidden - the panel owns navigation via the FlowNav it receives. */
	renderSidePanel?: (nav: FlowNav) => React.ReactNode
	/** Decorative layer rendered behind the content column (e.g. a shader wash). A readable
	 *  scrim is placed over it automatically so inputs stay legible. */
	background?: React.ReactNode
	/** Replaces the top-right close (X). Use for a Log Out / custom action. */
	headerRight?: React.ReactNode
	/** Hide the top-right close (X) entirely (ignored when headerRight is set). */
	hideClose?: boolean
	/** When set, the "You're all set" screen auto-triggers onClose after this many ms. */
	autoCloseMs?: number
	/** When set, answers + position autosave to localStorage under this key. On reopen the
	 *  flow resumes at the first unfilled required step (welcome is skipped). Cleared on submit.
	 *  File answers are not persisted (they can't be serialized). */
	persistKey?: string
}

// ─── Animation variants ───────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const stepVariants = {
	enter: (dir: number) => ({
		y: dir > 0 ? 60 : -60,
		opacity: 0,
	}),
	center: {
		y: 0,
		opacity: 1,
		transition: { duration: 0.3, ease: EASE },
	},
	exit: (dir: number) => ({
		y: dir > 0 ? -60 : 60,
		opacity: 0,
		transition: { duration: 0.25, ease: EASE },
	}),
}

// ─── Letter badge map ─────────────────────────────────────────────────────────

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// ─── Helper: validate email ───────────────────────────────────────────────────

function isValidEmail(val: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

// ─── Helper: file accept + size ───────────────────────────────────────────────

/** Match a File against an accept string like "image/*,.pdf,image/png". */
function matchesAccept(file: File, accept?: string): boolean {
	if (!accept) return true
	const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
	if (tokens.length === 0) return true
	const name = file.name.toLowerCase()
	const mime = file.type.toLowerCase()
	return tokens.some((tok) => {
		if (tok.startsWith(".")) return name.endsWith(tok)
		if (tok.endsWith("/*")) return mime.startsWith(tok.slice(0, -1))
		return mime === tok
	})
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Resolve the choices for a step (dynamic wins over static). */
function resolveOptions(step: FlowStep, answers: Record<string, unknown>): string[] {
	if (step.dynamicOptions) return step.dynamicOptions(answers)
	return step.options ?? []
}

/** Has this step got a usable answer? (Used to resume a draft at the first gap.) */
function isStepAnswered(step: FlowStep, answers: Record<string, unknown>): boolean {
	const v = answers[step.id]
	switch (step.type) {
		case "welcome":
			return true
		case "multiple_choice":
			return Array.isArray(v) && v.length > 0
		case "location": {
			const loc = v as FlowLocationValue | undefined
			return !!loc?.country && !!loc?.address?.trim()
		}
		case "file": {
			const f = v as FlowFileValue | undefined
			return !!f && Object.keys(f).length > 0
		}
		default:
			return typeof v === "string" ? v.trim() !== "" : v != null
	}
}

/** Index of the first required step still missing an answer, or -1 if all are filled. */
function firstIncompleteRequiredIdx(steps: FlowStep[], answers: Record<string, unknown>): number {
	for (let i = 0; i < steps.length; i++) {
		const s = steps[i]
		if (!s || s.type === "welcome") continue
		if (s.required && !isStepAnswered(s, answers)) return i
	}
	return -1
}

// ─── Theme CSS variables ──────────────────────────────────────────────────────
// Every colour in this component reads a CSS var, so the two themes differ ONLY in
// how the vars are set. Non-themed consumers get the exact original light look via
// inline vars (no dark: overrides), so their appearance never changes.

const THEMED_VAR_CLASSES =
	"[--tf-accent:#171717] [--tf-accent-ink:#ffffff] [--tf-accent-tint:#17171712] " +
	"[--tf-surface:#ffffff] [--tf-bg:#fafaf9] [--tf-text:#171717] [--tf-text-dim:#737373] [--tf-border:#e5e5e5] [--tf-scrim:rgba(250,250,249,0.28)] " +
	"dark:[--tf-accent:#fafafa] dark:[--tf-accent-ink:#171717] dark:[--tf-accent-tint:#ffffff14] " +
	"dark:[--tf-surface:#161616] dark:[--tf-bg:#0a0a0a] dark:[--tf-text:#fafafa] dark:[--tf-text-dim:#a3a3a3] dark:[--tf-border:#2a2a2a] dark:[--tf-scrim:rgba(10,10,10,0.58)]"

// ─── Main Component ───────────────────────────────────────────────────────────

export function TypeformFlow({
	isOpen,
	onClose,
	steps,
	onSubmit,
	onStepChange,
	initialAnswers,
	title,
	submitLabel = "Submit",
	thankYouTitle = "You're all set!",
	thankYouDesc = "We'll be in touch soon.",
	accentColor = "#171717",
	themed = false,
	renderSidePanel,
	background,
	headerRight,
	hideClose = false,
	autoCloseMs,
	persistKey,
}: TypeformFlowProps) {
	const [currentIdx, setCurrentIdx] = useState(0)
	const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers ?? {})
	const [maxIdx, setMaxIdx] = useState(0)
	const [direction, setDirection] = useState(1)
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	// Kept separate from isSubmitting so a server-side field check ("is this
	// username free?") reads as "Checking…" rather than claiming the whole form
	// is being submitted - the two happen at different points in the flow.
	const [isChecking, setIsChecking] = useState(false)
	const [isDone, setIsDone] = useState(false)
	// When persisting, gate the content until the draft has been read so we resume at the
	// right step without flashing the welcome screen first.
	const [restored, setRestored] = useState(false)

	// Ref mirror of answers so validation/auto-advance never read a stale closure.
	// (The single_choice bug: onChange + setTimeout(goNext) captured pre-select answers,
	//  so the just-picked value looked "missing" and threw a required error.)
	const answersRef = useRef(answers)
	// Latest seed values, read (not depended on) by the open-reset effect so a caller
	// can pass a freshly-built object every render without thrashing the flow.
	const initialAnswersRef = useRef(initialAnswers)
	initialAnswersRef.current = initialAnswers
	// Latest steps, read inside the open-time restore effect without making it a dependency
	// (consumers may pass a fresh steps array each render).
	const stepsRef = useRef(steps)
	stepsRef.current = steps
	const inputRef = useRef<HTMLInputElement | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement | null>(null)
	const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const currentStep = steps[currentIdx]
	// Real steps excluding welcome
	const realSteps = useMemo(() => steps.filter((s) => s.type !== "welcome"), [steps])
	const realIdx = realSteps.findIndex((s) => s.id === currentStep?.id)
	const totalReal = realSteps.length
	const maxRealIdx = useMemo(() => {
		const maxStep = steps[maxIdx]
		if (!maxStep) return realSteps.length - 1
		const i = realSteps.findIndex((s) => s.id === maxStep.id)
		return i === -1 ? realSteps.length - 1 : i
	}, [maxIdx, steps, realSteps])

	// ── Restore draft (or reset) when opened ─────────────────────────────────
	useEffect(() => {
		if (!isOpen) return
		setDirection(1)
		setError(null)
		setIsSubmitting(false)
		setIsDone(false)

		const s = stepsRef.current
		// Caller-supplied seed is the base; a saved draft (if any) layers on top of it, so a
		// resumed draft wins per-field but seeded fields the user never reached are kept.
		const seed = initialAnswersRef.current ?? {}
		let nextAnswers: Record<string, unknown> = seed
		let resumeIdx = 0
		let resumeMax = 0
		if (persistKey) {
			try {
				const raw = window.localStorage.getItem(persistKey)
				if (raw) {
					const saved = JSON.parse(raw) as { answers?: Record<string, unknown>; currentIdx?: number; maxIdx?: number }
					nextAnswers = { ...seed, ...(saved.answers ?? {}) }
					// Resume at the first unfilled required step; if all are done, at where they left off.
					const inc = firstIncompleteRequiredIdx(s, nextAnswers)
					const savedIdx = typeof saved.currentIdx === "number" ? saved.currentIdx : 1
					resumeIdx = inc !== -1 ? inc : Math.min(s.length - 1, Math.max(savedIdx, 1))
					resumeMax = Math.max(saved.maxIdx ?? 0, resumeIdx)
				}
			} catch {
				// corrupt draft - start fresh
			}
		}
		setAnswers(nextAnswers)
		answersRef.current = nextAnswers
		setCurrentIdx(resumeIdx)
		setMaxIdx(resumeMax)
		setRestored(true)
	}, [isOpen, persistKey])

	// ── Autosave the draft (skip File values - they can't be serialized) ──────
	useEffect(() => {
		if (!persistKey || !isOpen || isDone || !restored) return
		try {
			const json = JSON.stringify(
				{ answers, currentIdx, maxIdx },
				(_k, v) => (typeof File !== "undefined" && v instanceof File ? undefined : v),
			)
			window.localStorage.setItem(persistKey, json)
		} catch {
			// storage full / unavailable - non-fatal
		}
	}, [persistKey, isOpen, isDone, restored, answers, currentIdx, maxIdx])

	// ── Clear the draft once the flow is submitted ───────────────────────────
	useEffect(() => {
		if (isDone && persistKey) {
			try { window.localStorage.removeItem(persistKey) } catch { /* ignore */ }
		}
	}, [isDone, persistKey])

	// ── Body scroll lock ─────────────────────────────────────────────────────
	useEffect(() => {
		if (isOpen) {
			const prev = document.body.style.overflow
			document.body.style.overflow = "hidden"
			return () => {
				document.body.style.overflow = prev
			}
		}
	}, [isOpen])

	// ── Auto-focus on step change ────────────────────────────────────────────
	useEffect(() => {
		if (!isOpen || isDone) return
		const timer = setTimeout(() => {
			inputRef.current?.focus()
			textareaRef.current?.focus()
		}, 320)
		return () => clearTimeout(timer)
	}, [currentIdx, isOpen, isDone])

	// ── Error auto-clear ─────────────────────────────────────────────────────
	const showError = useCallback((msg: string) => {
		setError(msg)
		if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
		errorTimerRef.current = setTimeout(() => setError(null), 2500)
	}, [])

	// ── Answer writers (keep the ref in sync) ────────────────────────────────
	const setAnswer = useCallback((id: string, value: unknown) => {
		setAnswers((prev) => {
			const next = { ...prev, [id]: value }
			answersRef.current = next
			return next
		})
	}, [])

	const toggleMultiAnswer = useCallback((id: string, opt: string) => {
		setAnswers((prev) => {
			const cur = (prev[id] as string[]) ?? []
			const updated = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]
			const next = { ...prev, [id]: updated }
			answersRef.current = next
			return next
		})
	}, [])

	// ── Validate current step (reads the ref, not stale state) ───────────────
	const validateCurrent = useCallback(async (): Promise<boolean> => {
		if (!currentStep) return true
		const val = answersRef.current[currentStep.id]

		if (currentStep.required) {
			if (val === undefined || val === null || val === "") {
				showError("This field is required.")
				return false
			}
			if (currentStep.type === "multiple_choice") {
				const arr = val as string[]
				if (!arr || arr.length === 0) {
					showError("Please select at least one option.")
					return false
				}
			}
			if (currentStep.type === "file") {
				const files = val as FlowFileValue | undefined
				if (!files || Object.keys(files).length === 0) {
					showError("Please upload at least one file.")
					return false
				}
			}
			if (currentStep.type === "location") {
				const loc = val as FlowLocationValue | undefined
				if (!loc || !loc.country) {
					showError("Please select a country.")
					return false
				}
				if (!loc.address || !loc.address.trim()) {
					showError("Please enter an address.")
					return false
				}
			}
		}

		if (currentStep.type === "email" && val) {
			if (!isValidEmail(val as string)) {
				showError("Please enter a valid email address.")
				return false
			}
		}

		if (currentStep.validate) {
			const msg = currentStep.validate(val)
			if (msg) {
				showError(msg)
				return false
			}
		}

		// Server-checked last, and only once the cheap checks pass.
		if (currentStep.validateAsync) {
			setIsChecking(true)
			try {
				const msg = await currentStep.validateAsync(val, answersRef.current)
				if (msg) {
					showError(msg)
					return false
				}
			} catch {
				showError("Couldn't check that just now. Please try again.")
				return false
			} finally {
				setIsChecking(false)
			}
		}

		return true
	}, [currentStep, showError])

	// ── goNext ────────────────────────────────────────────────────────────────
	const goNext = useCallback(async () => {
		if (!currentStep) return
		if (!(await validateCurrent())) return

		if (currentIdx === steps.length - 1) {
			// Last step → submit
			setIsSubmitting(true)
			try {
				await onSubmit(answersRef.current)
				setIsDone(true)
			} catch {
				showError("Something went wrong. Please try again.")
			} finally {
				setIsSubmitting(false)
			}
			return
		}

		setDirection(1)
		const nextIdx = currentIdx + 1
		setCurrentIdx(nextIdx)
		setMaxIdx((m) => Math.max(m, nextIdx))
		const nextStep = steps[nextIdx]
		if (nextStep) {
			onStepChange?.(nextStep.id, answersRef.current)
		}
	}, [currentStep, currentIdx, steps, validateCurrent, onSubmit, onStepChange, showError])

	// ── goBack ────────────────────────────────────────────────────────────────
	const goBack = useCallback(() => {
		if (currentIdx === 0) return
		setDirection(-1)
		setCurrentIdx((p) => p - 1)
		setError(null)
	}, [currentIdx])

	// ── goToRealStep (side-panel jump) ───────────────────────────────────────
	const goToRealStep = useCallback((realIndex: number) => {
		const target = realSteps[realIndex]
		if (!target) return
		const absIdx = steps.findIndex((s) => s.id === target.id)
		if (absIdx === -1 || absIdx > maxIdx) return // never jump past the furthest reached step
		setDirection(absIdx >= currentIdx ? 1 : -1)
		setCurrentIdx(absIdx)
		setError(null)
	}, [realSteps, steps, maxIdx, currentIdx])

	// ── Keyboard handler ──────────────────────────────────────────────────────
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			if (isDone) return

			if (e.key === "Escape") {
				e.preventDefault()
				onClose()
				return
			}

			if (!currentStep) return

			// single/multiple choice: letter keys
			if (
				currentStep.type === "single_choice" ||
				currentStep.type === "multiple_choice"
			) {
				const opts = resolveOptions(currentStep, answersRef.current)
				const key = e.key.toUpperCase()
				const letterIdx = LETTERS.indexOf(key)
				if (
					letterIdx !== -1 &&
					letterIdx < opts.length &&
					!e.ctrlKey &&
					!e.metaKey &&
					!e.altKey
				) {
					e.preventDefault()
					const opt = opts[letterIdx]
					if (opt === undefined) return
					if (currentStep.type === "single_choice") {
						setAnswer(currentStep.id, opt)
						setTimeout(() => void goNext(), 320)
					} else {
						toggleMultiAnswer(currentStep.id, opt)
					}
					return
				}
			}

			if (e.key === "Enter") {
				if (currentStep.type === "long_text") {
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault()
						void goNext()
					}
					// plain Enter → newline (default textarea behavior)
					return
				}
				e.preventDefault()
				void goNext()
				return
			}

			if (e.shiftKey && e.key === "Enter") {
				e.preventDefault()
				goBack()
				return
			}

			if (e.key === "Backspace") {
				// only go back if field is empty
				const val = answersRef.current[currentStep.id]
				if (
					(val === undefined || val === "" || val === null) &&
					currentStep.type !== "long_text" &&
					currentStep.type !== "file" &&
					currentStep.type !== "location"
				) {
					goBack()
				}
			}
		},
		[isDone, currentStep, goNext, goBack, onClose, setAnswer, toggleMultiAnswer],
	)

	if (!isOpen) return null

	// ── Progress (1-based, real steps only) ──────────────────────────────────
	const progressCount = realIdx + 1
	const progress = isDone ? 1 : totalReal > 0 ? progressCount / totalReal : 0
	const hasSidePanel = !!renderSidePanel
	// Gate the step content until a persisted draft has been read (no welcome flash).
	const ready = !persistKey || restored

	const nav: FlowNav = {
		realSteps,
		realIdx,
		maxRealIdx,
		progress,
		isDone,
		goToRealStep,
		answers,
	}

	// Non-themed consumers keep the exact original palette via inline vars (no dark override).
	const inlineVars = themed
		? undefined
		: ({
			"--tf-accent": accentColor,
			"--tf-accent-ink": "#ffffff",
			"--tf-accent-tint": accentColor + "26",
			"--tf-surface": "#ffffff",
			"--tf-bg": "#fffbf5",
			"--tf-text": "#171717",
			"--tf-text-dim": "#737373",
			"--tf-border": "#e5e5e5",
			"--tf-scrim": "rgba(255,251,245,0.82)",
		} as React.CSSProperties)

	return (
		<div
			className={`fixed inset-0 z-[200] ${themed ? THEMED_VAR_CLASSES : ""}`}
			onKeyDown={handleKeyDown}
			tabIndex={-1}
			style={{ outline: "none", ...(inlineVars ?? {}) }}
		>
			{/* backdrop */}
			<div className="absolute inset-0 bg-black/85" />

			{/* overlay panel */}
			<div className="absolute inset-0 flex" style={{ backgroundColor: "var(--tf-bg)" }}>
				{/* Custom side panel (owns navigation when present) */}
				{hasSidePanel && (
					<aside className="hidden lg:block w-1/3 max-w-[440px] shrink-0">
						{renderSidePanel(nav)}
					</aside>
				)}

				{/* Content column */}
				<div className="relative flex-1 flex flex-col min-w-0" style={{ backgroundColor: background ? undefined : "var(--tf-surface)" }}>
					{/* Optional decorative background (e.g. shader) + a readability scrim over it */}
					{background && (
						<>
							<div className="absolute inset-0 z-0 overflow-hidden">{background}</div>
							<div className="absolute inset-0 z-0" style={{ background: "var(--tf-scrim)" }} />
						</>
					)}
					{/* Progress bar */}
					<div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ backgroundColor: "var(--tf-accent-tint)" }}>
						<motion.div
							className="h-full origin-left"
							initial={{ scaleX: 0 }}
							animate={{ scaleX: progress }}
							transition={{ duration: 0.4, ease: EASE }}
							style={{ transformOrigin: "left", backgroundColor: "var(--tf-accent)" }}
						/>
					</div>

					{/* Top bar */}
					<div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 relative z-10">
						{/* counter - the side panel owns this on lg+, so only show it on mobile there */}
						<div className="min-w-[60px]">
							{!isDone && currentStep?.type !== "welcome" && (
								<span className={`text-sm font-mono ${hasSidePanel ? "lg:hidden" : ""}`} style={{ color: "var(--tf-text-dim)" }}>
									<span className="font-semibold" style={{ color: "var(--tf-text)" }}>{progressCount}</span>
									{" / "}
									{totalReal}
								</span>
							)}
						</div>

						{/* title */}
						{title && !hasSidePanel && (
							<span className="text-sm font-semibold truncate max-w-xs" style={{ color: "var(--tf-text-dim)" }}>
								{title}
							</span>
						)}

						{/* close, or a custom top-right action (e.g. Log Out) */}
						{headerRight ? (
							<div className="ml-auto">{headerRight}</div>
						) : !hideClose ? (
							<button
								onClick={onClose}
								className="w-9 h-9 rounded-xl flex items-center justify-center transition-all ml-auto cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
								style={{ color: "var(--tf-text-dim)" }}
								aria-label="Close"
							>
								<X className="w-5 h-5" />
							</button>
						) : null}
					</div>

					{/* Content */}
					{/* tf-center-scroll: Radix wraps viewport children in a
					    `display: table` box, which kills percentage heights - so the
					    old `flex min-h-full items-center` wrapper never actually
					    centred and the step sat at the top of the panel. See the rule
					    in styles/globals.css. */}
					<ScrollArea className="tf-center-scroll relative z-10 flex-1 min-h-0 w-full">
						{/* 768px, up from 576 (Niraj, 2026-09-28): room for 3-column choices on every step. */}
						<div className="max-w-3xl w-full mx-auto px-6 py-8">
							<AnimatePresence mode="wait" custom={direction}>
								{!ready ? null : isDone ? (
									<ThankYouScreen
										key="done"
										title={thankYouTitle}
										desc={thankYouDesc}
										onClose={onClose}
										autoCloseMs={autoCloseMs}
									/>
								) : currentStep ? (
									<motion.div
										key={currentStep.id}
										custom={direction}
										variants={stepVariants}
										initial="enter"
										animate="center"
										exit="exit"
									>
										<StepContent
											step={currentStep}
											answers={answers}
											value={answers[currentStep.id]}
											onChange={(val) => setAnswer(currentStep.id, val)}
											onToggleMulti={(opt) => toggleMultiAnswer(currentStep.id, opt)}
											onNext={goNext}
											inputRef={inputRef}
											textareaRef={textareaRef}
											isSubmitting={isSubmitting}
											error={error}
										/>
									</motion.div>
								) : null}
							</AnimatePresence>
						</div>
					</ScrollArea>

					{/* Bottom bar */}
					{!isDone && (
						<div className="relative z-10 flex items-center justify-between px-6 py-5 shrink-0">
							{/* Back - the side panel owns this on lg+, so only show it on mobile there */}
							<div>
								{currentIdx > 0 && (
									<button
										onClick={goBack}
										className={`flex items-center gap-1.5 text-sm transition-colors font-medium cursor-pointer hover:opacity-80 ${hasSidePanel ? "lg:hidden" : ""}`}
										style={{ color: "var(--tf-text-dim)" }}
									>
										<ArrowUp className="w-4 h-4" />
										Back
									</button>
								)}
							</div>

							{/* OK + enter hint */}
							{currentStep?.type !== "welcome" && (
								<div className="flex items-center gap-3">
									<button
										onClick={() => void goNext()}
										disabled={isSubmitting || isChecking}
										className="px-6 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all disabled:opacity-60 shadow-sm cursor-pointer"
										style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-accent-ink)" }}
									>
										{isChecking
											? "Checking…"
											: isSubmitting
												? "Submitting…"
												: currentIdx === steps.length - 1
													? submitLabel
													: "OK"}
									</button>
									{currentStep?.type !== "single_choice" && (
										<span className="text-xs hidden sm:block" style={{ color: "var(--tf-text-dim)" }}>
											press{" "}
											<kbd className="px-1.5 py-0.5 rounded border font-mono text-xs" style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-dim)" }}>
												{currentStep?.type === "long_text" ? "Ctrl+↵" : "↵ Enter"}
											</kbd>
										</span>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

// ─── Thank You Screen ─────────────────────────────────────────────────────────

function ThankYouScreen({
	title,
	desc,
	onClose,
	autoCloseMs,
}: {
	title: string
	desc: string
	onClose: () => void
	autoCloseMs?: number
}) {
	// Optional auto-redirect once the success moment has played.
	useEffect(() => {
		if (!autoCloseMs) return
		const t = setTimeout(onClose, autoCloseMs)
		return () => clearTimeout(t)
	}, [autoCloseMs, onClose])

	return (
		<motion.div
			key="thankyou"
			initial={{ opacity: 0, scale: 0.94 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.45, ease: EASE }}
			className="text-center py-10"
		>
			<SuccessAnimation />
			<h2 className="mt-8 text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: "var(--tf-text)" }}>
				{title}
			</h2>
			<p className="text-lg leading-relaxed mb-9" style={{ color: "var(--tf-text-dim)" }}>{desc}</p>
			<button
				onClick={onClose}
				className="px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm cursor-pointer"
				style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-accent-ink)" }}
			>
				Continue
			</button>
			{autoCloseMs ? (
				<p className="mt-4 text-xs" style={{ color: "var(--tf-text-dim)" }}>Taking you to your dashboard…</p>
			) : null}
		</motion.div>
	)
}

// A complex-but-meaningful success mark: a ring draws closed, a checkmark writes itself,
// halos pulse outward (a "launch"), sparks orbit, and small bars rise (growth / analytics).
function SuccessAnimation() {
	const accent = "var(--tf-accent)"
	const sparks = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2)
	return (
		<div className="mx-auto h-32 w-32">
			<svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
				{/* pulsing halos */}
				{[0, 1].map((i) => (
					<motion.circle
						key={`halo-${i}`}
						cx="100" cy="100" r="62" fill="none" stroke={accent} strokeWidth="1.5"
						initial={{ scale: 0.7, opacity: 0.5 }}
						animate={{ scale: 1.5, opacity: 0 }}
						transition={{ duration: 2.2, ease: "easeOut", repeat: Infinity, delay: 0.6 + i * 1.1 }}
						style={{ transformOrigin: "100px 100px" }}
					/>
				))}

				{/* soft disc */}
				<motion.circle
					cx="100" cy="100" r="60" fill={accent} fillOpacity={0.08}
					initial={{ scale: 0 }} animate={{ scale: 1 }}
					transition={{ delay: 0.1, type: "spring", stiffness: 140, damping: 14 }}
					style={{ transformOrigin: "100px 100px" }}
				/>

				{/* ring draws closed */}
				<motion.circle
					cx="100" cy="100" r="60" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"
					initial={{ pathLength: 0, rotate: -90 }}
					animate={{ pathLength: 1 }}
					transition={{ delay: 0.15, duration: 0.9, ease: EASE }}
					style={{ transformOrigin: "100px 100px", rotate: -90 }}
				/>

				{/* rising bars (growth / analytics) */}
				{[0, 1, 2].map((i) => (
					<motion.rect
						key={`bar-${i}`}
						x={86 + i * 10} width="6" rx="2" fill={accent} fillOpacity={0.9}
						initial={{ height: 0, y: 118 }}
						animate={{ height: [0, 14 + i * 8], y: [118, 118 - (14 + i * 8)] }}
						transition={{ delay: 0.7 + i * 0.12, duration: 0.5, ease: EASE }}
					/>
				))}

				{/* checkmark writes itself */}
				<motion.path
					d="M74 102 L92 120 L128 78" fill="none" stroke={accent} strokeWidth="7"
					strokeLinecap="round" strokeLinejoin="round"
					initial={{ pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={{ delay: 1.05, duration: 0.5, ease: EASE }}
				/>

				{/* orbiting sparks */}
				<motion.g
					initial={{ rotate: 0 }} animate={{ rotate: 360 }}
					transition={{ duration: 9, ease: "linear", repeat: Infinity }}
					style={{ transformOrigin: "100px 100px" }}
				>
					{sparks.map((a, i) => (
						<motion.circle
							key={`spark-${i}`}
							cx={100 + Math.cos(a) * 84} cy={100 + Math.sin(a) * 84} r="3" fill={accent}
							initial={{ opacity: 0, scale: 0 }}
							animate={{ opacity: [0, 1, 0.4], scale: 1 }}
							transition={{ delay: 1.2 + i * 0.06, duration: 0.6, ease: EASE }}
						/>
					))}
				</motion.g>
			</svg>
		</div>
	)
}

// ─── Step Content ─────────────────────────────────────────────────────────────

interface StepContentProps {
	step: FlowStep
	answers: Record<string, unknown>
	value: unknown
	onChange: (val: unknown) => void
	onToggleMulti: (opt: string) => void
	onNext: () => void
	inputRef: React.RefObject<HTMLInputElement | null>
	textareaRef: React.RefObject<HTMLTextAreaElement | null>
	isSubmitting: boolean
	error: string | null
}

function StepContent({
	step,
	answers,
	value,
	onChange,
	onToggleMulti,
	onNext,
	inputRef,
	textareaRef,
	isSubmitting,
	error,
}: StepContentProps) {
	const [inputFocused, setInputFocused] = useState(false)

	// Common question header
	const header = (
		<div className="mb-8">
			{step.type !== "welcome" && step.icon && (
				<div className="mb-4 flex size-10 items-center justify-center rounded-xl [&_svg]:size-5" style={{ backgroundColor: "var(--tf-accent-tint)", color: "var(--tf-accent)" }}>
					{step.icon}
				</div>
			)}
			<h2 className="text-3xl md:text-4xl font-display font-bold leading-tight" style={{ color: "var(--tf-text)" }}>
				{step.question}
			</h2>
			{step.description && (
				<p className="mt-3 text-lg leading-relaxed" style={{ color: "var(--tf-text-dim)" }}>
					{step.description}
				</p>
			)}
		</div>
	)

	// Input classes - border colour handled via inline style on focus
	const inputBaseCls =
		"w-full bg-transparent border-0 border-b-2 outline-none text-2xl md:text-3xl font-display pb-3 pt-1 transition-colors duration-200"
	const inputBorderStyle = {
		borderColor: inputFocused ? "var(--tf-accent)" : "var(--tf-border)",
		color: "var(--tf-text)",
	}

	if (step.type === "welcome") {
		return (
			<div className="py-4">
				{header}
				<button
					onClick={onNext}
					disabled={isSubmitting}
					className="mt-2 inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base active:scale-95 transition-all shadow-sm cursor-pointer"
					style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-accent-ink)" }}
				>
					Let&apos;s Start →
				</button>
			</div>
		)
	}

	if (
		step.type === "short_text" ||
		step.type === "email" ||
		step.type === "phone" ||
		step.type === "number"
	) {
		return (
			<div className="py-4">
				{header}
				<input
					ref={inputRef}
					type={
						step.type === "email"
							? "email"
							: step.type === "phone"
								? "tel"
								// number renders as a plain text input (numeric keyboard, digit-only)
								// so there's no native up/down spinner cluttering the field.
								: "text"
					}
					inputMode={step.type === "number" || step.type === "phone" ? "numeric" : undefined}
					value={(value as string) ?? ""}
					onChange={(e) => onChange(step.type === "number" ? e.target.value.replace(/[^0-9]/g, "") : e.target.value)}
					onFocus={() => setInputFocused(true)}
					onBlur={() => setInputFocused(false)}
					placeholder={step.placeholder ?? "Type your answer here…"}
					className={`${inputBaseCls} placeholder:opacity-40`}
					style={inputBorderStyle}
					autoComplete="off"
					spellCheck={false}
				/>
				<ErrorMessage error={error} />
			</div>
		)
	}

	if (step.type === "long_text") {
		return (
			<div className="py-4">
				{header}
				<textarea
					ref={textareaRef}
					value={(value as string) ?? ""}
					onChange={(e) => onChange(e.target.value)}
					onFocus={() => setInputFocused(true)}
					onBlur={() => setInputFocused(false)}
					placeholder={step.placeholder ?? "Type your answer here…"}
					rows={4}
					className="w-full bg-transparent border-0 border-b-2 outline-none text-xl md:text-2xl font-display pb-3 pt-1 placeholder:opacity-40 transition-colors duration-200 resize-none leading-relaxed"
					style={inputBorderStyle}
				/>
				<p className="text-sm mt-2" style={{ color: "var(--tf-text-dim)" }}>
					Press{" "}
					<kbd className="px-1.5 py-0.5 rounded border font-mono text-xs" style={{ borderColor: "var(--tf-border)" }}>
						Ctrl+Enter
					</kbd>{" "}
					to continue
				</p>
				<ErrorMessage error={error} />
			</div>
		)
	}

	if (step.type === "single_choice" || step.type === "multiple_choice") {
		const opts = resolveOptions(step, answers)
		const isMulti = step.type === "multiple_choice"
		const selected = isMulti
			? ((value as string[]) ?? [])
			: (value as string) ?? ""

		return (
			<div className="py-4">
				{header}
				<div className={step.columns === 3 ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : step.columns === 2 ? "grid grid-cols-2 gap-2" : "space-y-2"}>
					{opts.map((opt, i) => {
						const letter = LETTERS[i] ?? String(i + 1)
						const isSelected = isMulti
							? (selected as string[]).includes(opt)
							: selected === opt

						return (
							<button
								key={opt}
								type="button"
								onClick={() => {
									if (isMulti) {
										onToggleMulti(opt)
									} else {
										onChange(opt)
										setTimeout(() => onNext(), 320)
									}
								}}
								className="group flex w-full min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors duration-150 cursor-pointer"
								style={{
									borderColor: isSelected ? "var(--tf-accent)" : "var(--tf-border)",
									backgroundColor: isSelected ? "var(--tf-accent-tint)" : "var(--tf-surface)",
								}}
							>
								<span
									className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-mono font-bold shrink-0 transition-colors duration-150"
									style={{
										backgroundColor: isSelected ? "var(--tf-accent)" : "var(--tf-accent-tint)",
										color: isSelected ? "var(--tf-accent-ink)" : "var(--tf-text-dim)",
									}}
								>
									{isSelected && isMulti ? (
										<Check className="w-3.5 h-3.5" strokeWidth={2.5} />
									) : (
										letter
									)}
								</span>
								<span
									className="min-w-0 text-[14px] font-medium leading-snug transition-colors duration-150"
									style={{ color: "var(--tf-text)" }}
								>
									{opt}
								</span>
							</button>
						)
					})}
				</div>
				<ErrorMessage error={error} />
			</div>
		)
	}

	if (step.type === "country_phone") {
		// Pre-fill the dial code from the country the student already picked in the
		// linked location step. CountryPhoneInput reads defaultCountryCode on mount,
		// and this step is always reached AFTER the location step, so the country is set.
		const src = step.countrySourceStepId
			? (answers[step.countrySourceStepId] as FlowLocationValue | undefined)
			: undefined
		return (
			<div className="py-4">
				{header}
				<CountryPhoneInput
					value={(value as string) ?? ""}
					onChange={(e164) => onChange(e164)}
					defaultCountryCode={src?.country || "NP"}
				/>
				<ErrorMessage error={error} />
			</div>
		)
	}

	if (step.type === "location") {
		return <LocationStep value={value} onChange={onChange} header={header} error={error} />
	}

	if (step.type === "file") {
		return <FileStep step={step} value={value} onChange={onChange} header={header} error={error} />
	}

	return null
}

// ─── Inline searchable select (used by the location step) ─────────────────────

function InlineSelect({
	label,
	placeholder,
	options,
	value,
	onChange,
	searchable = false,
	renderOption,
}: {
	label: string
	placeholder: string
	options: string[]
	value: string
	onChange: (v: string) => void
	searchable?: boolean
	renderOption?: (opt: string) => React.ReactNode
}) {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState("")
	// Keyboard-highlighted row (arrow keys move it, Enter selects it).
	const [activeIdx, setActiveIdx] = useState(0)
	const ref = useRef<HTMLDivElement>(null)
	const activeItemRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		function handler(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener("mousedown", handler)
		return () => document.removeEventListener("mousedown", handler)
	}, [])

	const filtered = search
		? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
		: options

	// Reset the highlight to the top whenever the list opens or the query changes.
	useEffect(() => { setActiveIdx(0) }, [open, search])
	// Keep the highlighted row scrolled into view as it moves.
	useEffect(() => { activeItemRef.current?.scrollIntoView({ block: "nearest" }) }, [activeIdx])

	// Arrow keys move the highlight; Enter selects; Escape closes. stopPropagation is
	// essential - otherwise Enter/Escape bubble to the flow's root handler and would
	// advance the step / close the whole modal instead of acting on this dropdown.
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!open) return
		if (e.key === "ArrowDown") {
			e.preventDefault(); e.stopPropagation()
			setActiveIdx((i) => Math.min(filtered.length - 1, i + 1))
		} else if (e.key === "ArrowUp") {
			e.preventDefault(); e.stopPropagation()
			setActiveIdx((i) => Math.max(0, i - 1))
		} else if (e.key === "Home") {
			e.preventDefault(); e.stopPropagation(); setActiveIdx(0)
		} else if (e.key === "End") {
			e.preventDefault(); e.stopPropagation(); setActiveIdx(Math.max(0, filtered.length - 1))
		} else if (e.key === "Enter") {
			e.preventDefault(); e.stopPropagation()
			const opt = filtered[activeIdx]
			if (opt !== undefined) { onChange(opt); setOpen(false) }
		} else if (e.key === "Escape") {
			e.preventDefault(); e.stopPropagation(); setOpen(false)
		}
	}

	return (
		<div className="space-y-1.5">
			<label className="text-sm font-medium" style={{ color: "var(--tf-text-dim)" }}>{label}</label>
			<div ref={ref} className="relative">
				<button
					type="button"
					onClick={() => { setOpen((o) => !o); setSearch("") }}
					className="flex items-center gap-2 w-full rounded-xl border px-4 py-3 text-left transition-colors cursor-pointer"
					style={{ borderColor: "var(--tf-border)", backgroundColor: "var(--tf-surface)" }}
				>
					<span className="flex-1 truncate text-base" style={{ color: value ? "var(--tf-text)" : "var(--tf-text-dim)" }}>
						{value || placeholder}
					</span>
					<ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--tf-text-dim)" }} />
				</button>

				{open && (
					<div
						onKeyDown={onKeyDown}
						className="absolute z-50 top-full mt-2 left-0 right-0 rounded-xl border p-2 shadow-xl"
						style={{ borderColor: "var(--tf-border)", backgroundColor: "var(--tf-surface)" }}
					>
						{searchable && (
							<div className="relative mb-2">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--tf-text-dim)" }} />
								<input
									autoFocus
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder={`Search ${label.toLowerCase()}…`}
									className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm outline-none"
									style={{ borderColor: "var(--tf-border)", backgroundColor: "var(--tf-bg)", color: "var(--tf-text)" }}
								/>
							</div>
						)}
						<ScrollArea viewportClassName="max-h-56">
							{filtered.length === 0 ? (
								<p className="px-3 py-3 text-sm text-center" style={{ color: "var(--tf-text-dim)" }}>No results</p>
							) : (
								filtered.map((opt, i) => {
									const isSel = value === opt
									const isActive = i === activeIdx
									return (
										<button
											key={opt}
											ref={isActive ? activeItemRef : undefined}
											type="button"
											onClick={() => { onChange(opt); setOpen(false) }}
											onMouseEnter={() => setActiveIdx(i)}
											className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-left rounded-lg transition-colors cursor-pointer"
											style={{ color: "var(--tf-text)", fontWeight: isSel ? 600 : 400, backgroundColor: isActive ? "var(--tf-accent-tint)" : undefined }}
										>
											<span className="flex-1 min-w-0 truncate">{renderOption ? renderOption(opt) : opt}</span>
											{isSel && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tf-accent)" }} />}
										</button>
									)
								})
							)}
						</ScrollArea>
					</div>
				)}
			</div>
		</div>
	)
}

// ─── Location step (country → province → district → address) ──────────────────

const LOCATION_COUNTRY_PRIORITY = ["NP", "IN", "US", "GB", "AE", "CA", "AU"]

function LocationStep({
	value,
	onChange,
	header,
	error,
}: {
	value: unknown
	onChange: (val: unknown) => void
	header: React.ReactNode
	error: string | null
}) {
	const loc = (value as FlowLocationValue) ?? { country: "" }

	// Country options as "Flag Name" labels, priority countries first.
	const countryLabelToCode = useMemo(() => {
		const map = new Map<string, string>()
		for (const c of COUNTRIES) map.set(`${c.flag}  ${c.name}`, c.code)
		return map
	}, [])
	const countryLabels = useMemo(() => {
		const priority = COUNTRIES.filter((c) => LOCATION_COUNTRY_PRIORITY.includes(c.code))
		const rest = COUNTRIES.filter((c) => !LOCATION_COUNTRY_PRIORITY.includes(c.code))
		return [...priority, ...rest].map((c) => `${c.flag}  ${c.name}`)
	}, [])
	const codeToCountryLabel = useCallback((code: string) => {
		const c = COUNTRIES.find((x) => x.code === code)
		return c ? `${c.flag}  ${c.name}` : ""
	}, [])

	const isNP = loc.country === "NP"
	const isIN = loc.country === "IN"
	const provinceOptions = isNP ? Object.keys(NEPAL_PROVINCES) : isIN ? INDIA_STATES : []
	const districtOptions = isNP && loc.province ? (NEPAL_PROVINCES[loc.province] ?? []) : []

	const setCountry = (label: string) => {
		const code = countryLabelToCode.get(label) ?? ""
		onChange({ country: code, province: undefined, district: undefined, address: loc.address })
	}
	const setProvince = (prov: string) => onChange({ ...loc, province: prov, district: undefined })
	const setDistrict = (dist: string) => onChange({ ...loc, district: dist })
	const setAddress = (addr: string) => onChange({ ...loc, address: addr })

	return (
		<div className="py-4">
			{header}
			<div className="space-y-4">
				<InlineSelect
					label="Country"
					placeholder="Select country"
					options={countryLabels}
					value={loc.country ? codeToCountryLabel(loc.country) : ""}
					onChange={setCountry}
					searchable
				/>

				{provinceOptions.length > 0 && (
					<InlineSelect
						label={isNP ? "Province" : "State"}
						placeholder={isNP ? "Select province" : "Select state"}
						options={provinceOptions}
						value={loc.province ?? ""}
						onChange={setProvince}
						searchable
					/>
				)}

				{isNP && loc.province && (
					<InlineSelect
						label="District"
						placeholder="Select district"
						options={districtOptions}
						value={loc.district ?? ""}
						onChange={setDistrict}
						searchable
					/>
				)}

				{loc.country && (
					<div className="space-y-1.5">
						<label className="text-sm font-medium" style={{ color: "var(--tf-text-dim)" }}>Address</label>
						<div className="flex items-center gap-2 w-full rounded-xl border px-4 py-3" style={{ borderColor: "var(--tf-border)", backgroundColor: "var(--tf-surface)" }}>
							<MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--tf-text-dim)" }} />
							<input
								value={loc.address ?? ""}
								onChange={(e) => setAddress(e.target.value)}
								placeholder="e.g. Kalanki, Ward 14, Kathmandu"
								className="flex-1 bg-transparent outline-none text-base placeholder:opacity-40"
								style={{ color: "var(--tf-text)" }}
							/>
						</div>
					</div>
				)}
			</div>
			<ErrorMessage error={error} />
		</div>
	)
}

// ─── File step ────────────────────────────────────────────────────────────────

function FileStep({
	step,
	value,
	onChange,
	header,
	error,
}: {
	step: FlowStep
	value: unknown
	onChange: (val: unknown) => void
	header: React.ReactNode
	error: string | null
}) {
	const slots: FlowFileSlot[] = step.slots ?? [{ id: step.id, label: step.question }]
	const maxSizeMb = step.maxSizeMb ?? 5
	const files = (value as FlowFileValue) ?? {}
	const [localError, setLocalError] = useState<string | null>(null)

	const pick = (slotId: string, accept: string | undefined, file: File | undefined) => {
		if (!file) return
		if (!matchesAccept(file, accept)) {
			setLocalError(`"${file.name}" is not an accepted file type.`)
			return
		}
		if (file.size > maxSizeMb * 1024 * 1024) {
			setLocalError(`"${file.name}" is larger than ${maxSizeMb} MB.`)
			return
		}
		setLocalError(null)
		onChange({ ...files, [slotId]: file })
	}

	const remove = (slotId: string) => {
		const next = { ...files }
		delete next[slotId]
		onChange(next)
	}

	return (
		<div className="py-4">
			{header}
			<div className="space-y-3">
				{slots.map((slot) => {
					const accept = slot.accept ?? step.accept
					const file = files[slot.id]
					return (
						<div key={slot.id}>
							<p className="text-sm font-medium mb-1.5" style={{ color: "var(--tf-text-dim)" }}>{slot.label}</p>
							{file ? (
								<div
									className="flex items-center gap-3 px-4 py-3 rounded-xl border-2"
									style={{ borderColor: "var(--tf-accent)", backgroundColor: "var(--tf-surface)" }}
								>
									<span
										className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
										style={{ backgroundColor: "var(--tf-accent-tint)" }}
									>
										<FileText className="w-4 h-4" style={{ color: "var(--tf-accent)" }} />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium" style={{ color: "var(--tf-text)" }}>{file.name}</span>
										<span className="block text-xs" style={{ color: "var(--tf-text-dim)" }}>{formatBytes(file.size)}</span>
									</span>
									<button
										type="button"
										onClick={() => remove(slot.id)}
										className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 cursor-pointer"
										aria-label={`Remove ${slot.label}`}
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							) : (
								<label
									className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
									style={{ borderColor: "var(--tf-border)", backgroundColor: "var(--tf-surface)" }}
								>
									<input
										type="file"
										accept={accept}
										className="hidden"
										onChange={(e) => {
											pick(slot.id, accept, e.target.files?.[0])
											e.target.value = ""
										}}
									/>
									<span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--tf-accent-tint)" }}>
										<Upload className="w-4 h-4" style={{ color: "var(--tf-text-dim)" }} />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-medium" style={{ color: "var(--tf-text)" }}>Choose file</span>
										<span className="block text-xs" style={{ color: "var(--tf-text-dim)" }}>
											{accept ? accept.replace(/,/g, ", ") : "Any file"} · up to {maxSizeMb} MB
										</span>
									</span>
								</label>
							)}
						</div>
					)
				})}
			</div>
			<ErrorMessage error={localError ?? error} />
		</div>
	)
}

// ─── Error message ────────────────────────────────────────────────────────────

function ErrorMessage({ error }: { error: string | null }) {
	return (
		<AnimatePresence>
			{error && (
				<motion.p
					initial={{ opacity: 0, y: -6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -4 }}
					transition={{ duration: 0.2 }}
					className="mt-3 text-sm text-red-500 font-medium"
				>
					{error}
				</motion.p>
			)}
		</AnimatePresence>
	)
}

export default TypeformFlow
