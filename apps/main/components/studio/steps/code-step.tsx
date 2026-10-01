"use client";

import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
	Code, Play, RotateCcw, CheckCircle, XCircle, Save, Check
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import dynamic from "next/dynamic";
import { saveStep } from "@/actions/(main)/studios/studio.actions";
import toast from "@repo/ui/components/ui/sonner";
import type { StudioStep, CodeMetadata } from "@/types/studios";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { CodeSample } from "@/components/code-sample/code-sample-viewer";

const CodeEditor = dynamic(() => import("@/components/main/code-editor"), { ssr: false });

interface CodeStepProps {
	step: StudioStep;
	studioId?: string;
}

/** A CODE step: reference code to read when it names a sample (LJV-9), else the editor. */
export function CodeStep({ step, studioId }: CodeStepProps) {
	const meta = (step.metadata || {}) as Partial<CodeMetadata>;
	if (meta.sample) {
		return (
			<div className="space-y-2">
				{meta.note && <p className="text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{meta.note}</p>}
				<CodeSample sample={meta.sample} stage={meta.stage} file={meta.file} />
			</div>
		);
	}
	return <EditableCodeStep step={step} studioId={studioId} />;
}

function EditableCodeStep({ step, studioId }: CodeStepProps) {
	const metadata = useMemo(() => (step.metadata || {}) as Partial<CodeMetadata>, [step.metadata]);
	const [isRunning, setIsRunning] = useState(false);
	const [currentCode, setCurrentCode] = useState(step.content || "// Start coding here...");
	const [output, setOutput] = useState<string | null>(null);
	const [hasError, setHasError] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isSaved, setIsSaved] = useState(true);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const debouncedSave = useCallback(async (code: string) => {
		if (!studioId || code === step.content) return;
		setIsSaving(true);
		const result = await saveStep({
			studioId,
			stepId: step.id,
			type: "CODE",
			content: code,
			metadata: { ...metadata },
			source: "USER",
		});
		setIsSaving(false);
		if (result.success) {
			setIsSaved(true);
			setTimeout(() => setIsSaved(false), 2000);
		}
	}, [studioId, step.id, step.content, metadata]);

	const handleCodeChange = useCallback((code: string) => {
		setCurrentCode(code);
		setIsSaved(false);
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
		saveTimeoutRef.current = setTimeout(() => debouncedSave(code), 2000);
	}, [debouncedSave]);

	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
		};
	}, []);

	const handleRun = useCallback(async () => {
		setIsRunning(true);
		setOutput(null);
		setHasError(false);

		try {
			if (metadata.language === "javascript" || !metadata.language) {
				try {
					const logs: string[] = [];
					const originalLog = console.log;
					console.log = (...args: unknown[]) => {
						logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" "));
					};

					const result = eval(currentCode);
					console.log = originalLog;

					if (result !== undefined) {
						logs.push(`→ ${typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)}`);
					}
					setOutput(logs.join("\n") || "✅ Code executed successfully (no output)");
				} catch (err) {
					setHasError(true);
					setOutput(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
				}
			} else {
				setOutput("⚠️ Execution for this language is coming soon. Only JavaScript is supported client-side.");
			}

			// Save code state
			if (studioId) {
				await saveStep({
					studioId,
					stepId: step.id,
					type: "CODE",
					content: currentCode,
					metadata: { ...metadata, lastExecutedAt: new Date().toISOString() },
					source: "USER",
				});
			}
		} catch (error) {
			console.error("Code execution error:", error);
			toast.error("Failed to execute code");
		}

		setIsRunning(false);
	}, [currentCode, metadata, step.id, studioId]);

	const handleReset = useCallback(() => {
		setCurrentCode(step.content || "// Start coding here...");
		setOutput(null);
		setHasError(false);
	}, [step.content]);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="py-8"
		>
			<div className="rounded-2xl overflow-hidden bg-neutral-900">
				<div className="px-6 py-4 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center">
							<Code className="h-5 w-5 text-white" />
						</div>
						<div>
							<h3 className="font-semibold text-white">
								{metadata.problemTitle || "Code Block"}
							</h3>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								{metadata.language || "javascript"}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{isSaving && (
							<span className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
								<Save className="h-3 w-3 animate-pulse" />
								Saving...
							</span>
						)}
						{isSaved && !isSaving && (
							<span className="text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
								<Check className="h-3 w-3" />
								Saved
							</span>
						)}
						<Button
							size="sm"
							variant="ghost"
							className="text-neutral-600 dark:text-neutral-400 hover:text-white"
							onClick={handleReset}
						>
							<RotateCcw className="h-4 w-4" />
						</Button>
						<Button
							size="sm"
							className="gap-2 bg-neutral-800 hover:bg-neutral-700"
							onClick={handleRun}
							disabled={isRunning}
						>
							{
								isRunning ? (
									<InlineLoader size="sm" />
								) : (
									<Play className="h-4 w-4" />
								)
							}
							Run
						</Button>
					</div>
				</div>
				<div className="h-64">
					<CodeEditor
						height="100%"
						language={metadata.language || "javascript"}
						code={currentCode}
						onChange={handleCodeChange}
						showLanguageSelector={false}
						showCopyButton={false}
						showExpandButton={false}
					/>
				</div>
				{
					output !== null && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							className="border-t border-neutral-700"
						>
							<div className="px-4 py-2 bg-neutral-800/50 flex items-center gap-2 text-xs">
								{
									hasError ? (
										<XCircle className="h-3.5 w-3.5 text-red-400" />
									) : (
										<CheckCircle className="h-3.5 w-3.5 text-neutral-800 dark:text-neutral-200" />
									)
								}
								<span className={hasError ? "text-red-400" : "text-neutral-800 dark:text-neutral-200"}>
									Output
								</span>
							</div>
							<ScrollArea className="text-sm text-neutral-600 dark:text-neutral-400 font-mono whitespace-pre-wrap" viewportClassName="px-4 py-3 max-h-48" reflow>
								{output}
							</ScrollArea>
						</motion.div>
					)
				}
			</div>
		</motion.div>
	);
}