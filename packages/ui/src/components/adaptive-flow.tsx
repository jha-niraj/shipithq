"use client"

// ─────────────────────────────────────────────────────────────────────────────
// AdaptiveFlow: a one-question-at-a-time flow whose next question is not known
// until the current answer has been given.
//
// A sibling of TypeformFlow in look (rail on the left, one question on the
// right, the same option buttons and easing) but not in shape: TypeformFlow is
// a fixed overlay over a static step list, and this renders INLINE wherever it
// is mounted and receives each question from the outside as it arrives. The
// component owns nothing about where questions come from. It shows the current
// turn, collects an answer, and shows a skeleton while the next turn is on its
// way.
//
// Used by the per-sub-module onboarding (plan/module-onboarding, MO-3).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, CornerDownLeft, RefreshCw } from "lucide-react"
import { Shimmer, ShimmerStyles } from "./skeleton-kit"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { cn } from "../lib/utils"

export type AdaptiveQuestionKind = "single" | "multi" | "open"

export interface AdaptiveQuestion {
	text: string
	kind: AdaptiveQuestionKind
	options: string[]
	/** Optional one-line reason this question follows. Shown muted under the question. */
	why?: string
}

export interface AdaptiveTurn {
	/** Stable identity for the transition. Changes when the question changes. */
	index: number
	question: AdaptiveQuestion
}

export interface OpenInputProps {
	value: string
	onChange: (value: string) => void
	/** Submit the current value. The flow ignores empty values. */
	onSubmit: () => void
	disabled: boolean
	/** Set by the custom input when any of the text came from speech. */
	setViaVoice: (v: boolean) => void
	maxChars: number
}

export interface AdaptiveFlowProps {
	/** Left column on lg+. The flow gives it no props; the caller composes its widgets. */
	rail: React.ReactNode
	/** Compact strip shown ABOVE the question below lg, where the rail is hidden. */
	railCompact?: React.ReactNode
	/** The question to show. Null while the first question is loading. */
	turn: AdaptiveTurn | null
	/** True between answering and the next turn arriving. The slot shows a skeleton. */
	pending: boolean
	error: string | null
	/** Values to preselect when a turn is shown again (changing an earlier answer). */
	initialValues?: string[]
	/** Called once per answered turn. `viaVoice` is true when an open answer came from the mic. */
	onAnswer: (values: string[], viaVoice: boolean) => void
	onRetry: () => void
	/** Replaces the default text field for open questions (for example, to add a mic). */
	renderOpenInput?: (props: OpenInputProps) => React.ReactNode
	/** Shown in the question slot instead of a question, for example the finished summary. */
	slot?: React.ReactNode
	/** A line above the question, for example "Editing question 1 - back to question 8". */
	notice?: React.ReactNode
	/** 1-based, shown as "Question N". No total: the flow does not know it. */
	questionNumber: number
	/** Character cap for open answers. Defaults to 500. */
	openMaxChars?: number
	className?: string
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const LETTERS = "ABCDEFGHI"
const AUTO_ADVANCE_MS = 250

// Same variables TypeformFlow's themed mode sets, so the option buttons are the
// same buttons. Scoped to this root so nothing leaks into the page.
const THEME_VARS =
	"[--tf-accent:#171717] [--tf-accent-ink:#ffffff] [--tf-accent-tint:#17171712] " +
	"[--tf-surface:#ffffff] [--tf-border:#e5e5e5] " +
	"dark:[--tf-accent:#fafafa] dark:[--tf-accent-ink:#171717] dark:[--tf-accent-tint:#ffffff14] " +
	"dark:[--tf-surface:#161616] dark:[--tf-border:#2a2a2a]"

// Ink classes are Tailwind pairs, not the tf variables: the tf "dim" grey is
// 4.48:1 on white, and the "why" line is body text that has to clear 4.5:1.
const INK = "text-neutral-900 dark:text-neutral-50"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"

export function AdaptiveFlow({
	rail,
	railCompact,
	turn,
	pending,
	error,
	initialValues,
	onAnswer,
	onRetry,
	renderOpenInput,
	slot,
	notice,
	questionNumber,
	openMaxChars = 500,
	className,
}: AdaptiveFlowProps) {
	const reduceMotion = useReducedMotion()
	const variants = reduceMotion
		? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
		: {
				initial: { opacity: 0, y: 18 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: -18 },
			}

	return (
		<div className={cn("flex h-full min-h-0 w-full flex-col lg:flex-row", THEME_VARS, className)}>
			<ShimmerStyles />
			{/* A flex column so the rail can give its own list a scroller: a rail taller than the
			    page scrolls inside itself instead of pushing the page (MO-10). */}
			<aside className="hidden min-h-0 shrink-0 flex-col border-neutral-200 lg:flex lg:w-1/3 lg:max-w-sm lg:border-r dark:border-neutral-800">
				{rail}
			</aside>
			{railCompact && (
				<div className="shrink-0 border-b border-neutral-200 lg:hidden dark:border-neutral-800">{railCompact}</div>
			)}
			<section className="flex min-h-0 flex-1 flex-col overflow-y-auto">
				<div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8 sm:px-8">
					{notice && !slot && <div className="mb-5">{notice}</div>}
					<AnimatePresence mode="wait" initial={false}>
						{slot ? (
							<motion.div key="slot" {...variants} transition={{ duration: 0.35, ease: EASE }}>
								{slot}
							</motion.div>
						) : error ? (
							<motion.div key="error" {...variants} transition={{ duration: 0.3, ease: EASE }}>
								<ErrorState message={error} onRetry={onRetry} />
							</motion.div>
						) : pending || !turn ? (
							<motion.div key="pending" {...variants} transition={{ duration: 0.3, ease: EASE }}>
								<PendingQuestion questionNumber={questionNumber} />
							</motion.div>
						) : (
							<motion.div key={`turn-${turn.index}`} {...variants} transition={{ duration: 0.35, ease: EASE }}>
								<QuestionCard
									turn={turn}
									questionNumber={questionNumber}
									initialValues={initialValues}
									onAnswer={onAnswer}
									renderOpenInput={renderOpenInput}
									openMaxChars={openMaxChars}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</section>
		</div>
	)
}

function QuestionHeader({ number, text, why }: { number: number; text: string; why?: string }) {
	return (
		<div className="mb-6">
			<span className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>Question {number}</span>
			<h2 className={cn("mt-2 text-2xl font-semibold leading-snug tracking-tight sm:text-[26px]", INK)}>{text}</h2>
			{why && <p className={cn("mt-2 text-sm leading-relaxed", INK_DIM)}>{why}</p>}
		</div>
	)
}

function QuestionCard({
	turn,
	questionNumber,
	initialValues,
	onAnswer,
	renderOpenInput,
	openMaxChars,
}: {
	turn: AdaptiveTurn
	questionNumber: number
	initialValues?: string[]
	onAnswer: (values: string[], viaVoice: boolean) => void
	renderOpenInput?: (props: OpenInputProps) => React.ReactNode
	openMaxChars: number
}) {
	const { question } = turn
	const isMulti = question.kind === "multi"
	const isOpen = question.kind === "open"

	const [selected, setSelected] = useState<string[]>(() => initialValues ?? [])
	const [text, setText] = useState<string>(() => (isOpen ? (initialValues?.[0] ?? "") : ""))
	const [viaVoice, setViaVoice] = useState(false)
	const [sent, setSent] = useState(false)
	const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	// A new turn is a new card (the parent keys on turn.index), so this state is
	// fresh per question. The timer still needs clearing on unmount.
	useEffect(() => () => {
		if (advanceTimer.current) clearTimeout(advanceTimer.current)
	}, [])

	const send = useCallback((values: string[], voice: boolean) => {
		if (sent) return
		setSent(true)
		onAnswer(values, voice)
	}, [onAnswer, sent])

	const pickSingle = useCallback((opt: string) => {
		if (sent) return
		setSelected([opt])
		// Cancellable: a second click inside the window re-targets the pick
		// instead of sending the first one.
		if (advanceTimer.current) clearTimeout(advanceTimer.current)
		advanceTimer.current = setTimeout(() => send([opt], false), AUTO_ADVANCE_MS)
	}, [send, sent])

	const toggleMulti = useCallback((opt: string) => {
		if (sent) return
		setSelected((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]))
	}, [sent])

	const confirm = useCallback(() => {
		if (sent) return
		if (isOpen) {
			const v = text.trim()
			if (v) send([v.slice(0, openMaxChars)], viaVoice)
			return
		}
		if (selected.length > 0) send(selected, false)
	}, [isOpen, openMaxChars, selected, send, sent, text, viaVoice])

	// Keys 1..9 pick options; Enter confirms a multi or open answer. Ignored
	// while typing in the open field so digits are typed, not treated as picks.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null
			const typing = target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
			if (e.key === "Enter" && !e.shiftKey && (isMulti || (isOpen && !typing))) {
				e.preventDefault()
				confirm()
				return
			}
			if (typing || isOpen) return
			const n = Number.parseInt(e.key, 10)
			if (Number.isNaN(n) || n < 1 || n > question.options.length) return
			const opt = question.options[n - 1]
			if (!opt) return
			e.preventDefault()
			if (isMulti) toggleMulti(opt)
			else pickSingle(opt)
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [confirm, isMulti, isOpen, pickSingle, question.options, toggleMulti])

	return (
		<div aria-busy={sent}>
			<QuestionHeader number={questionNumber} text={question.text} why={question.why} />

			{isOpen ? (
				<div>
					{renderOpenInput ? (
						renderOpenInput({
							value: text,
							onChange: setText,
							onSubmit: confirm,
							disabled: sent,
							setViaVoice,
							maxChars: openMaxChars,
						})
					) : (
						<DefaultOpenInput
							value={text}
							onChange={setText}
							onSubmit={confirm}
							disabled={sent}
							setViaVoice={setViaVoice}
							maxChars={openMaxChars}
						/>
					)}
					<ConfirmRow onConfirm={confirm} disabled={sent || !text.trim()} hint="press Enter" />
				</div>
			) : (
				<div>
					<div className="space-y-2.5" role={isMulti ? "group" : "radiogroup"} aria-label={question.text}>
						{question.options.map((opt, i) => {
							const isSelected = selected.includes(opt)
							return (
								<button
									key={opt}
									type="button"
									role={isMulti ? "checkbox" : "radio"}
									aria-checked={isSelected}
									disabled={sent}
									onClick={() => (isMulti ? toggleMulti(opt) : pickSingle(opt))}
									className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-200 disabled:cursor-default"
									style={{
										borderColor: isSelected ? "var(--tf-accent)" : "var(--tf-border)",
										backgroundColor: isSelected ? "var(--tf-accent-tint)" : "var(--tf-surface)",
										transform: isSelected ? "scale(1.01)" : undefined,
									}}
								>
									<span
										className={cn(
											"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all duration-200",
											isSelected ? "" : "text-neutral-700 dark:text-neutral-300",
										)}
										style={{
											backgroundColor: isSelected ? "var(--tf-accent)" : "var(--tf-accent-tint)",
											color: isSelected ? "var(--tf-accent-ink)" : undefined,
										}}
									>
										{isSelected && isMulti ? <Check className="h-4 w-4" strokeWidth={2.5} /> : (LETTERS[i] ?? i + 1)}
									</span>
									<span className={cn("text-base font-medium", INK)}>{opt}</span>
								</button>
							)
						})}
					</div>
					{isMulti && (
						<ConfirmRow onConfirm={confirm} disabled={sent || selected.length === 0} hint="pick all that apply, then Enter" />
					)}
				</div>
			)}
		</div>
	)
}

function DefaultOpenInput({ value, onChange, onSubmit, disabled, maxChars }: OpenInputProps) {
	return (
		<div>
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
				placeholder="Type your answer"
				className="min-h-[88px] text-base"
			/>
			<div className={cn("mt-1 text-right text-xs", INK_DIM)}>{value.length}/{maxChars}</div>
		</div>
	)
}

function ConfirmRow({ onConfirm, disabled, hint }: { onConfirm: () => void; disabled: boolean; hint: string }) {
	return (
		<div className="mt-5 flex items-center gap-3">
			<Button type="button" onClick={onConfirm} disabled={disabled} className="h-10 rounded-xl px-5">
				OK
				<CornerDownLeft className="ml-2 h-3.5 w-3.5" />
			</Button>
			<span className={cn("text-xs", INK_DIM)}>{hint}</span>
		</div>
	)
}

function PendingQuestion({ questionNumber }: { questionNumber: number }) {
	return (
		<div aria-live="polite" aria-label="Preparing the next question">
			<span className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>Question {questionNumber}</span>
			<div className="mt-3 space-y-2">
				<Shimmer className="h-7 w-11/12 rounded-md" />
				<Shimmer className="h-7 w-3/5 rounded-md" delay={0.05} />
			</div>
			<Shimmer className="mt-3 h-4 w-2/3 rounded-md" delay={0.1} />
			<div className="mt-6 space-y-2.5">
				{Array.from({ length: 4 }).map((_, i) => (
					<Shimmer key={i} className="h-[58px] w-full rounded-xl" delay={0.12 + i * 0.05} />
				))}
			</div>
		</div>
	)
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div role="alert" className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
			<p className={cn("text-base font-medium", INK)}>{message}</p>
			<p className={cn("mt-1 text-sm", INK_DIM)}>Your answers so far are saved.</p>
			<Button type="button" variant="outline" onClick={onRetry} className="mt-4 h-10 rounded-xl">
				<RefreshCw className="mr-2 h-3.5 w-3.5" />
				Try again
			</Button>
		</div>
	)
}

export default AdaptiveFlow
