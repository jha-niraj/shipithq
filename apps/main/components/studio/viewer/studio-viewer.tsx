"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { MarkdownRenderer } from "@/components/common/markdown-renderer";
import { QuizStep } from "../steps/quiz-step";
import { NoteStep } from "../steps/note-step";
import { CodeStep } from "../steps/code-step";
import { ImageStep } from "../steps/image-step";
import { VideoStep } from "../steps/video-step";
import { DocumentStep } from "../steps/document-step";
import { ProjectStep } from "../steps/project-step";
import { MockInterviewStep } from "../steps/mock-interview-step";
import { FlashcardStep } from "../steps/flashcard-step";
import {
	FileText, FileQuestion, StickyNote, Sparkles
} from "lucide-react";
import type { StudioWithSteps, StudioStep, QuizMetadata } from "@/types/studios";
import { getStudioWithSteps } from "@/actions/(main)/studios/studio.actions";
import { getQuizById } from "@/actions/(main)/studios/ai-generation.actions";
import { useStudioStore } from "@/app/store/studioStore";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface StudioViewerProps {
	studio?: StudioWithSteps;
	studioId?: string;
	className?: string;
	/** External text from text selection - will pre-fill the AI input as EXPLANATION */
	externalPrompt?: string | null;
	/** Callback when external prompt has been consumed */
	onExternalPromptConsumed?: () => void;
	/** Ref callback for triggering reload from parent */
	onRefresh?: (refreshFn: () => void) => void;
	/** Use the container's whole width instead of a centred 4xl column (a panel, e.g. Pathfinder). */
	fullWidth?: boolean;
}

// Skeleton component for pending steps
function PendingStepSkeleton({ type, prompt }: { type: string; prompt: string }) {
	const getIcon = () => {
		switch (type) {
			case "EXPLANATION": return <FileText className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />;
			case "QUIZ": return <FileQuestion className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />;
			case "NOTE": return <StickyNote className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />;
			default: return <Sparkles className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />;
		}
	};

	const getLabel = () => {
		switch (type) {
			case "EXPLANATION": return "Generating explanation";
			case "QUIZ": return "Creating quiz";
			case "NOTE": return "Saving note";
			default: return "Generating content";
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			className="py-6"
		>
			<div className="rounded-2xl border border-neutral-200 dark:border-neutral-800/40 bg-gradient-to-br from-neutral-50/80 to-pink-50/50 dark:from-neutral-900/20 dark:to-pink-950/10 p-6 overflow-hidden relative">
				{/* Animated shimmer overlay */}
				<motion.div
					className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent"
					animate={{ x: ["-100%", "100%"] }}
					transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
				/>

				<div className="relative z-10">
					{/* Header */}
					<div className="flex items-center gap-3 mb-4">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 dark:bg-neutral-800/50 shadow-sm">
							{getIcon()}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
									{getLabel()}...
								</span>
								<InlineLoader size="sm" className="text-neutral-900 dark:text-neutral-100" />
							</div>
							<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
								&quot;{prompt}&quot;
							</p>
						</div>
					</div>

					{/* Skeleton lines */}
					<div className="space-y-3">
						<div className="h-4 bg-neutral-200/60 dark:bg-neutral-700/30 rounded-lg w-full animate-pulse" />
						<div className="h-4 bg-neutral-200/60 dark:bg-neutral-700/30 rounded-lg w-5/6 animate-pulse" style={{ animationDelay: "0.1s" }} />
						<div className="h-4 bg-neutral-200/60 dark:bg-neutral-700/30 rounded-lg w-4/6 animate-pulse" style={{ animationDelay: "0.2s" }} />
						<div className="h-4 bg-neutral-200/60 dark:bg-neutral-700/30 rounded-lg w-3/4 animate-pulse" style={{ animationDelay: "0.3s" }} />
						{type === "EXPLANATION" && (
							<>
								<div className="h-4 bg-neutral-200/60 dark:bg-neutral-700/30 rounded-lg w-full animate-pulse" style={{ animationDelay: "0.4s" }} />
								<div className="h-4 bg-neutral-200/60 dark:bg-neutral-700/30 rounded-lg w-2/3 animate-pulse" style={{ animationDelay: "0.5s" }} />
							</>
						)}
						{type === "QUIZ" && (
							<div className="mt-4 space-y-2">
								{[1, 2, 3, 4].map((i) => (
									<div key={i} className="h-10 bg-neutral-200/40 dark:bg-neutral-700/20 rounded-xl animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</motion.div>
	);
}

// Error skeleton for failed pending steps
function ErrorStepSkeleton({ errorMessage }: { errorMessage?: string }) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="py-4"
		>
			<div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/10 p-4">
				<p className="text-sm text-red-600 dark:text-red-400">
					{errorMessage || "Failed to generate content. Please try again."}
				</p>
			</div>
		</motion.div>
	);
}

export function StudioViewer({
	studio: initialStudio,
	studioId,
	className,
	onRefresh,
	fullWidth = false,
}: StudioViewerProps) {
	const [quizData, setQuizData] = useState<Record<string, unknown>>({});
	const [initialLoading, setInitialLoading] = useState(!initialStudio);

	// Zustand store
	const storeSteps = useStudioStore((s) => s.steps);
	const pendingSteps = useStudioStore((s) => s.pendingSteps);
	const initialize = useStudioStore((s) => s.initialize);
	const setStudio = useStudioStore((s) => s.setStudio);
	const storeStudioId = useStudioStore((s) => s.studioId);

	// Use store steps if available, otherwise fall back to initial
	const steps = useMemo(() => storeSteps.length > 0 || storeStudioId ? storeSteps : (initialStudio?.steps || []), [storeSteps, storeStudioId, initialStudio]);

	// Allow fetching by studioId
	const fetchStudio = useCallback(async () => {
		if (!studioId && !initialStudio) return;
		if (initialStudio && !storeStudioId) {
			initialize(initialStudio);
			setInitialLoading(false);
			return;
		}
		if (!studioId) return;

		setInitialLoading(true);
		try {
			const result = await getStudioWithSteps(studioId);
			if (result.success && result.studio) {
				initialize(result.studio);
			}
		} catch (err) {
			console.error("Failed to load studio:", err);
		} finally {
			setInitialLoading(false);
		}
	}, [studioId, initialStudio, initialize, storeStudioId]);

	useEffect(() => {
		fetchStudio();
	}, [fetchStudio]);

	// Expose refresh function to parent 
	useEffect(() => {
		if (onRefresh) {
			onRefresh(fetchStudio);
		}
	}, [onRefresh, fetchStudio]);

	// Update store when initialStudio changes
	useEffect(() => {
		if (initialStudio) {
			setStudio(initialStudio);
		}
	}, [initialStudio, setStudio]);

	useEffect(() => {
		if (steps.length === 0) return;
		const loadQuizData = async () => {
			const quizSteps = steps.filter((s) => s.type === "QUIZ");
			if (quizSteps.length === 0) return;

			const quizDataMap: Record<string, unknown> = {};

			for (const step of quizSteps) {
				const metadata = step.metadata as unknown as QuizMetadata;
				if (metadata.quizId && !quizData[metadata.quizId]) {
					try {
						const result = await getQuizById(metadata.quizId);
						if (result.success && result.quiz) {
							quizDataMap[metadata.quizId] = result.quiz;
						}
					} catch (err) {
						console.error("Failed to load quiz:", err);
					}
				}
			}

			if (Object.keys(quizDataMap).length > 0) {
				setQuizData((prev) => ({ ...prev, ...quizDataMap }));
			}
		};

		loadQuizData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [steps]);

	const studioForRender = useStudioStore((s) => s.studio) || initialStudio;

	const renderStep = (step: StudioStep, _index: number) => {
		if (!studioForRender) return null;
		switch (step.type) {
			case "EXPLANATION":
				return (
					<motion.div
						key={step.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="py-8"
					>
						<div className="prose prose-neutral dark:prose-invert max-w-none">
							<MarkdownRenderer content={step.content || ""} />
						</div>
						{
							step.source === "AI" && (step.metadata as { prompt?: string })?.prompt && (
								<div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
									<p className="text-xs text-neutral-500 dark:text-neutral-400">
										Generated from: &quot;{(step.metadata as { prompt?: string }).prompt}&quot;
									</p>
								</div>
							)
						}
					</motion.div>
				);

			case "QUIZ": {
				const metadata = step.metadata as unknown as QuizMetadata;
				return (
					<QuizStep
						key={step.id}
						step={step}
						quizData={quizData[metadata.quizId] as { id: string; title: string; questions: Array<{ id: string; question: string; options: string[]; correctAnswer: number; explanation?: string }> } | undefined}
					/>
				);
			}

			case "NOTE":
				return <NoteStep key={step.id} step={step} studioId={studioForRender.id} />;

			case "CODE":
				return <CodeStep key={step.id} step={step} studioId={studioForRender.id} />;

			case "IMAGE":
				return <ImageStep key={step.id} step={step} />;

			case "VIDEO":
				return <VideoStep key={step.id} step={step} />;

			case "DOCUMENT":
				return <DocumentStep key={step.id} step={step} />;

			case "PROJECT":
				return <ProjectStep key={step.id} step={step} />;

			case "MOCK_INTERVIEW":
				return <MockInterviewStep key={step.id} step={step} />;

			case "FLASHCARD":
				return <FlashcardStep key={step.id} step={step} />;

			default:
				return null;
		}
	};

	if (initialLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<InlineLoader size="lg" className="text-neutral-900 dark:text-neutral-100" />
			</div>
		);
	}

	const hasNoContent = steps.length === 0 && pendingSteps.length === 0;

	if (hasNoContent) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<div className="h-20 w-20 rounded-full bg-neutral-100 dark:bg-neutral-900/30 flex items-center justify-center mb-4">
					<span className="text-4xl">📝</span>
				</div>
				<h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
					No content yet
				</h3>
				<p className="text-neutral-600 dark:text-neutral-400 max-w-md">
					Start adding content using the AI panel below. Ask for explanations,
					quizzes, code challenges, and more!
				</p>
			</div>
		);
	}

	return (
		<ScrollArea className={className}>
			<div className={fullWidth ? "w-full px-6 py-8" : "max-w-4xl mx-auto px-6 py-8"}>
				<AnimatePresence mode="popLayout">
					{
						steps.map((step, index) => (
							<motion.div
								key={step.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ delay: index * 0.1 }}
							>
								{renderStep(step, index)}

								{
									index < steps.length - 1 && (
										<div className="flex items-center gap-4 py-4">
											<div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
											<span className="text-xs text-neutral-600 dark:text-neutral-400">
												Step {index + 1} of {steps.length}
											</span>
											<div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
										</div>
									)
								}
							</motion.div>
						))
					}

					{/* Pending steps (skeletons) */}
					{pendingSteps.map((pending) => (
						pending.status === "generating" ? (
							<PendingStepSkeleton
								key={pending.id}
								type={pending.type}
								prompt={pending.prompt}
							/>
						) : (
							<ErrorStepSkeleton
								key={pending.id}
								errorMessage={pending.errorMessage}
							/>
						)
					))}
				</AnimatePresence>
			</div>
		</ScrollArea>
	);
}