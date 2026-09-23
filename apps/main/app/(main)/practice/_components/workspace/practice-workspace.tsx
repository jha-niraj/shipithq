"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Clock, Send, CheckCircle2, AlertCircle, Play,
    Mic, MicOff, Volume2, VolumeX, Square,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { cn } from "@repo/ui/lib/utils";
import dynamic from "next/dynamic";
import { useTheme } from "@repo/ui/components/themeprovider";
import {
    usePracticeStore, type PracticeWorkspaceState,
} from "@/app/store/practiceStore";
import {
    saveSessionProgress,
} from "@/actions/(main)/practice";
import {
    assessPracticeWork, getMentorResponse,
} from "@/actions/(main)/practice";
import { speakMentorReply } from "@/actions/(main)/practice";
import { useDictation } from "@/hooks/useDictation";
import {
    executeCode, type ExecuteCodeResult, type TestCase,
} from "@/actions/(main)/practice/execute-code.action";
import CodeEditor from "@/components/main/code-editor";
import type {
    PracticeProblemDetail, PracticeSessionData, PracticeMode,
    PracticeChatMessage,
} from "@/types/practice";
import { getPathFromModule } from "@/types/practice";
import { MarkdownRenderer } from "@/components/common/markdown-renderer";
import { TextSelectionToolbar } from "@/components/common/text-selection-toolbar";
import toast from "@repo/ui/components/ui/sonner";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { SDComponentLibrary } from "./sd-component-library";
import { APITester } from "./api-tester";
import { CasesPanel, verdictForMentor } from "./cases-panel";
import { runSampleTests, submitSolution } from "@/actions/(main)/practice/judge.action";
import { requestMemoryUpdate } from "@/actions/(main)/practice/memory.action";
import { finishGuidedSession, applyGuidedCompletion } from "@/actions/(main)/practice/practice.action";
import { awaitBackgroundJob } from "@/hooks/use-background-job";
import { Flag } from "lucide-react";
import type { JudgeLanguage } from "@repo/db";
import type { PracticeJudgeResult } from "@/types/practice";
import { LANGUAGE_LABELS, hasTestsFor } from "@/lib/practice/starters";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import type { PracticeStage } from "@repo/db";
import { STAGE_GOALS, STAGE_LABELS, classOutline } from "@/lib/practice/mentor-prompt";
import { StageTracker } from "./stage-tracker";

const ExcalidrawCanvas = dynamic(
    () => import("./excalidraw-canvas"),
    {
        ssr: false,
        loading: () => (
            <div className="h-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 text-sm">
                Loading canvas...
            </div>
        ),
    }
);

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
    EASY: "text-neutral-700 dark:text-neutral-300",
    MEDIUM: "text-neutral-900 dark:text-neutral-100",
    HARD: "text-red-600 dark:text-red-400",
};

const DSA_LANGUAGES = ["javascript", "typescript", "python", "java", "cpp"];

interface PracticeWorkspaceProps {
    problem: PracticeProblemDetail;
    session: PracticeSessionData | null;
    mode: PracticeMode;
}

export function PracticeWorkspace({ problem, session, mode }: PracticeWorkspaceProps) {
    const router = useRouter();
    // resolvedTheme, not theme: "system" must follow the OS for the canvas too.
    const { resolvedTheme } = useTheme();
    const store = usePracticeStore();
    const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const problemPanelRef = useRef<HTMLDivElement>(null);
    const sendToChatRef = useRef<((message: string) => void) | null>(null);

    // Code execution state
    const [execResult, setExecResult] = useState<ExecuteCodeResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [showOutput, setShowOutput] = useState(false);

    // Judge state (DSA with a harness for the chosen language, PD-4)
    const [judgeResult, setJudgeResult] = useState<PracticeJudgeResult | null>(null);
    const [judgeBusy, setJudgeBusy] = useState<"run" | "submit" | null>(null);
    const [casesCollapsed, setCasesCollapsed] = useState(false);
    const usesJudge = hasTestsFor(problem, store.language);
    const testedLanguages = Object.keys(problem.judge.hasHarness).filter((l) => problem.judge.hasHarness[l as JudgeLanguage]);

    // A verdict belongs to the language it ran in; switching clears it.
    useEffect(() => {
        setJudgeResult(null);
    }, [store.language]);

    // ── Finishing a guided session (PD-13) ──
    const [finishing, setFinishing] = useState(false);
    const finishingRef = useRef(false);
    const finishSession = useCallback(async () => {
        if (!session || finishingRef.current) return;
        finishingRef.current = true;
        setFinishing(true);
        try {
            const live = usePracticeStore.getState();
            await saveSessionProgress(session.id, {
                code: live.code, cssCode: live.cssCode, canvasData: live.canvasData as object,
                language: live.language, chatHistory: live.chatHistory, totalTimeSeconds: live.elapsedSeconds,
            });
            live.markClean();
            const started = await finishGuidedSession(session.id);
            if (!started.success) {
                toast.error(started.error);
                return;
            }
            const done = await awaitBackgroundJob(started.jobId);
            if (!done.ok) {
                toast.error("The review did not finish. Try Finish again.");
                return;
            }
            const applied = await applyGuidedCompletion(session.id, started.jobId);
            if (!applied.success) {
                toast.error(applied.error);
                return;
            }
            usePracticeStore.getState().setStage("done");
            usePracticeStore.getState().addChatMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                content: applied.feedback,
                timestamp: new Date().toISOString(),
                stage: "reflect",
                isAssessment: true,
            });
            if (applied.firstCompletion) toast.success(applied.score === 100 ? "Solved optimally. XP added." : "Problem finished. XP added.");
            void requestMemoryUpdate(session.id);
        } finally {
            finishingRef.current = false;
            setFinishing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.id]);
    // "done" is in the list on purpose: a reflect job that failed leaves the stage
    // at done with the session still IN_PROGRESS, and the way out of that has to be
    // the same button, not a support message.
    const canFinish = mode === "ASSIST" && problem.module === "DSA" && session?.status !== "COMPLETED"
        && (store.stage === "optimise" || store.stage === "reflect" || store.stage === "done");

    const runJudge = useCallback(async (kind: "run" | "submit") => {
        if (!session || judgeBusy) return;
        if (!store.code.trim()) {
            toast.error("Write some code first!");
            return;
        }
        setJudgeBusy(kind);
        setCasesCollapsed(false);
        try {
            const result = kind === "run"
                ? await runSampleTests(session.id, store.code, store.language)
                : await submitSolution(session.id, store.code, store.language);
            setJudgeResult(result);
            // The server saved the code with the attempt.
            store.markClean();
            if (mode === "ASSIST") sendToChatRef.current?.(verdictForMentor(result));
        } catch {
            setJudgeResult({ status: "unavailable", kind, language: store.language, message: "The code runner is unavailable. Try again in a moment." });
        } finally {
            setJudgeBusy(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.id, judgeBusy, store.code, store.language, mode]);

    // Initialize store on mount
    useEffect(() => {
        if (session) {
            store.initialize(problem, session);
        }
        return () => {
            store.reset();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problem.id, session?.id]);

    // Timer
    useEffect(() => {
        if (store.isTimerRunning && session) {
            timerRef.current = setInterval(() => {
                store.incrementTimer();
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.isTimerRunning]);

    /*
     * Auto-save every 30 seconds, reading LIVE store state.
     *
     * This used to close over the store snapshot taken when the effect ran, so
     * `isDirty` was forever false and `code` forever "": the timer fired every 30
     * seconds and saved nothing. Twenty minutes of system-design canvas, or exam
     * code on a problem with no judge, went with the tab. Everything inside the
     * interval now comes from `getState()`, which is the current value by
     * definition.
     */
    useEffect(() => {
        if (!session) return;
        const save = async () => {
            const live = usePracticeStore.getState();
            if (!live.isDirty) return;
            live.setSaving(true);
            const ok = await saveSessionProgress(session.id, {
                code: live.code,
                cssCode: live.cssCode,
                canvasData: live.canvasData as object,
                language: live.language,
                chatHistory: live.chatHistory,
                totalTimeSeconds: live.elapsedSeconds,
            });
            // A failed save must not mark the work clean, or the next tick skips it.
            if (ok) live.markClean();
            live.setSaving(false);
        };
        autoSaveRef.current = setInterval(() => { void save(); }, 30000);
        // Leaving the page is the moment the unsaved work is about to be lost.
        const onHide = () => { if (document.visibilityState === "hidden") void save(); };
        document.addEventListener("visibilitychange", onHide);
        window.addEventListener("pagehide", onHide);
        return () => {
            document.removeEventListener("visibilitychange", onHide);
            window.removeEventListener("pagehide", onHide);
            void save();
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.id]);

    // A link, not a push: back to the list is a navigation, so it should be
    // middle-clickable and announce itself as a link (CLAUDE.md, Conventions).
    const backHref = `/practice/${getPathFromModule(problem.module)}`;
    const handleBack = () => router.push(backHref);

    /**
     * How long an exam attempt gets, by difficulty, in minutes. A decision, not a
     * constant to tune quietly: plan/practice-dsa, PD-17.
     */
    const EXAM_MINUTES: Record<string, number> = { EASY: 20, MEDIUM: 35, HARD: 50 };

    const formatTime = (seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    if (!session) {
        return (
            <div className="h-dvh flex items-center justify-center bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
                <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-3" />
                    <p className="text-sm">Please sign in to start practicing.</p>
                    <Button variant="outline" onClick={handleBack} className="mt-4">
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    /*
     * Below lg the three columns STACK.
     *
     * They were always horizontal, so on a 380px screen the statement got about
     * 95px and the mentor about 130px: the workspace simply did not work on a
     * phone. Vertical keeps all three, each scrolling and each resizable, which is
     * what a narrow screen can actually hold.
     */
    const [isNarrow, setIsNarrow] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1023px)");
        const update = () => setIsNarrow(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    // Recomputed every render; the store's one-second tick is what re-renders us.
    const examSeconds = (EXAM_MINUTES[problem.difficulty] ?? 35) * 60;
    const startedAtMs = session?.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const remainingSeconds = Math.round(examSeconds - (Date.now() - startedAtMs) / 1000);
    const overtime = remainingSeconds < 0;

    const isWebModule = problem.module === "WEB_FRONTEND" || problem.module === "WEB_BACKEND";
    const isSystemDesign = problem.module === "SYSTEM_DESIGN";

    return (
        // `--page-h` is the viewport minus the mobile bottom bar; `h-dvh` put the
        // composer and the Submit row underneath that bar.
        <div className="flex h-[var(--page-h,100dvh)] flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
            <header className="h-12 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 flex-shrink-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <Link
                        href={backHref}
                        aria-label="Back to the problem list"
                        title="Back to the problem list"
                        className="cursor-pointer text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="h-4 w-px bg-neutral-900 dark:bg-neutral-700" />
                    <h1 className="text-sm font-medium truncate max-w-[300px]">{problem.title}</h1>
                    <Badge variant="outline" className={cn("text-xs border-neutral-300 dark:border-neutral-700", DIFFICULTY_COLORS[problem.difficulty])}>
                        {problem.difficulty}
                    </Badge>
                    <Badge variant="outline" className={cn(
                        "text-xs border-neutral-300 dark:border-neutral-700",
                        mode === "EXAM" ? "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" : "text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-800"
                    )}>
                        {mode === "EXAM" ? "🔒 Exam" : "💡 Assist"}
                    </Badge>
                </div>
                <div className="flex items-center gap-3">
                    {/*
                     * The clock belongs to the exam, and to nothing else.
                     *
                     * Assist mode had one too, which turned learning into a race nobody
                     * asked for. And it counted the session's saved seconds, so a reload
                     * showed a number that had nothing to do with this attempt.
                     *
                     * The remaining time is worked out from the session's `startedAt`,
                     * which the server owns, so a reload, a second tab and a closed
                     * laptop all agree. Running out changes the reading, never the work:
                     * it says how far over you are and both buttons keep working.
                     */}
                    {mode === "EXAM" && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums",
                                overtime
                                    ? "border-red-300 text-red-600 dark:border-red-900 dark:text-red-400"
                                    : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200",
                            )}
                            title={`${EXAM_MINUTES[problem.difficulty] ?? 35} minutes for a ${problem.difficulty.toLowerCase()} problem`}
                        >
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {overtime ? `over by ${formatTime(-remainingSeconds)}` : `${formatTime(remainingSeconds)} left`}
                        </span>
                    )}
                    {
                        store.isSaving && (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 animate-pulse">Saving...</span>
                        )
                    }
                    {
                        !isSystemDesign && (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isRunning || judgeBusy !== null}
                                className="text-xs h-8 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                                onClick={async () => {
                                    if (usesJudge) {
                                        await runJudge("run");
                                        return;
                                    }
                                    if (!store.code.trim()) {
                                        toast.error("Write some code first!");
                                        return;
                                    }
                                    setIsRunning(true);
                                    setShowOutput(true);
                                    setExecResult(null);
                                    try {
                                        // DSA/coding problems use code-execution test cases (input/output pairs),
                                        // not API test cases - pass empty array and let AI evaluate output
                                        const testCases: TestCase[] = [];
                                        const result = await executeCode(
                                            store.code,
                                            store.language as Parameters<typeof executeCode>[1],
                                            testCases
                                        );
                                        setExecResult(result);
                                        // Send output to AI chat for Socratic evaluation
                                        if (mode === "ASSIST") {
                                            const outputSummary = result.stderr
                                                ? `stdout: ${result.stdout || "(none)"}\nstderr: ${result.stderr}`
                                                : result.stdout || "(no output)";
                                            const passInfo = result.testResults
                                                ? ` ${result.testResults.filter(t => t.passed).length}/${result.testResults.length} test cases passed.`
                                                : "";
                                            const chatMsg = `🔄 I ran my code (${store.language}).\nOutput: \`\`\`\n${outputSummary}\n\`\`\`${passInfo}\nPlease evaluate this output and guide me.`;
                                            sendToChatRef.current?.(chatMsg);
                                        }
                                    } catch (err) {
                                        setExecResult({ success: false, error: String(err) });
                                    } finally {
                                        setIsRunning(false);
                                    }
                                }}
                            >
                                {isRunning || judgeBusy === "run" ? <InlineLoader size="sm" className="mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                                {isRunning || judgeBusy === "run" ? "Running..." : "Run"}
                            </Button>
                        )
                    }
                    {
                        canFinish && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={finishSession}
                                disabled={finishing}
                                title={store.stage === "optimise" ? "Finish now at the brute-force score, or keep going for the optimal solution" : undefined}
                                className="text-xs h-8 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                            >
                                {finishing ? <><InlineLoader size="sm" className="mr-1.5" />Reviewing...</> : <><Flag className="h-3.5 w-3.5 mr-1.5" />Finish</>}
                            </Button>
                        )
                    }
                    {
                        usesJudge && mode === "ASSIST" ? (
                            <Button
                                size="sm"
                                onClick={() => runJudge("submit")}
                                disabled={judgeBusy !== null}
                                className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white text-xs h-8"
                            >
                                {judgeBusy === "submit" ? (
                                    <><InlineLoader size="sm" className="mr-1.5" />Submitting...</>
                                ) : (
                                    <><Send className="h-3.5 w-3.5 mr-1.5" />Submit</>
                                )}
                            </Button>
                        ) : (
                            <SubmitButton problem={problem} session={session} store={store} mode={mode} onJudgeResult={(r) => { setJudgeResult(r); setCasesCollapsed(false); }} />
                        )
                    }
                </div>
            </header>
            <PanelGroup orientation={isNarrow ? "vertical" : "horizontal"} className="h-[calc(var(--page-h,100dvh)-48px)]">
                <Panel defaultSize={isNarrow ? "30%" : "25%"} minSize="15%" maxSize={isNarrow ? "60%" : "40%"}>
                    <div className="h-full overflow-hidden relative" ref={problemPanelRef}>
                        <ProblemPanel problem={problem} requirementsMet={store.requirementsMet} />
                        {
                            mode === "ASSIST" && (
                                <TextSelectionToolbar
                                    containerRef={problemPanelRef}
                                    onAskAI={(text, prompt) => {
                                        const message = prompt || `Explain this: "${text}"`;
                                        sendToChatRef.current?.(message);
                                    }}
                                    onCopy={(text) => {
                                        navigator.clipboard.writeText(text);
                                        toast.success("Copied to clipboard!");
                                    }}
                                />
                            )
                        }
                    </div>
                </Panel>
                <PanelResizeHandle className={cn("bg-neutral-200 transition-colors dark:bg-neutral-800", isNarrow ? "h-1 w-full cursor-row-resize" : "w-1 cursor-col-resize")} />
                <Panel defaultSize={mode === "ASSIST" ? (isNarrow ? "40%" : "40%") : "70%"} minSize={isNarrow ? "20%" : "30%"}>
                    <div className="h-full overflow-hidden flex flex-col">
                        {
                            isSystemDesign ? (
                                <div className="flex-1 flex">
                                    <SDComponentLibrary
                                        onAddComponent={(comp) => {
                                            sendToChatRef.current?.(`I'm adding a ${comp.label} component to my design. What should I consider when using a ${comp.label}?`);
                                        }}
                                    />
                                    <div className="flex-1">
                                        <ExcalidrawCanvas
                                            initialData={store.canvasData}
                                            onChange={(data: { elements: unknown[]; appState: unknown }) => store.setCanvasData(data)}
                                            darkMode={resolvedTheme === "dark"}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {
                                        problem.module === "DSA" && (
                                            <EditorStrip
                                                usesJudge={usesJudge}
                                                signature={problem.judge.functionSignature}
                                                language={store.language}
                                                judgeStatus={problem.judge.judgeStatus}
                                                testedLanguages={testedLanguages}
                                            />
                                        )
                                    }
                                    <div className={cn(
                                        "overflow-hidden",
                                        // Frontend gets the live preview under it, backend the API
                                        // tester; the two used to add up to 140% of the column.
                                        problem.module === "WEB_FRONTEND" ? "h-[55%]" :
                                        problem.module === "WEB_BACKEND" ? "h-[60%]" :
                                        usesJudge ? "min-h-0 flex-1" :
                                        showOutput && execResult ? "h-[60%]" : "min-h-0 flex-1"
                                    )}>
                                        <CodeEditor
                                            code={store.code}
                                            language={store.language}
                                            height="100%"
                                            onChange={(val) => store.setCode(val)}
                                            onLanguageChange={(lang) => store.setLanguage(lang)}
                                            showLanguageSelector={problem.module === "DSA"}
                                            showCopyButton={true}
                                            showRunButton={true}
                                            onRun={usesJudge ? () => runJudge("run") : undefined}
                                            isRunning={usesJudge ? judgeBusy === "run" : undefined}
                                            enableExecution={!usesJudge}
                                            showExpandButton={false}
                                            allowedLanguages={problem.module === "DSA" ? DSA_LANGUAGES : ["javascript", "typescript"]}
                                            className="h-full rounded-none border-0"
                                        />
                                    </div>
                                    {
                                        usesJudge && (
                                            <CasesPanel
                                                samples={problem.judge.sampleTests}
                                                result={judgeResult}
                                                busy={judgeBusy}
                                                collapsed={casesCollapsed}
                                                onToggle={() => setCasesCollapsed((c) => !c)}
                                            />
                                        )
                                    }
                                    {!usesJudge && showOutput && !isWebModule && (
                                        <OutputPanel
                                            result={execResult}
                                            isRunning={isRunning}
                                            onClose={() => setShowOutput(false)}
                                        />
                                    )}
                                    {
                                        // A rendered HTML preview of server-side code says nothing;
                                        // the preview belongs to the frontend module only.
                                        problem.module === "WEB_FRONTEND" && (
                                            <div className="h-[45%] border-t border-neutral-200 dark:border-neutral-800">
                                                <WebPreview code={store.code} css={store.cssCode} />
                                            </div>
                                        )
                                    }
                                    {
                                        problem.module === "WEB_BACKEND" && problem.testCases && (
                                            <div className="h-[40%] min-h-0 border-t border-neutral-200 dark:border-neutral-800">
                                                <APITester
                                                    testCases={problem.testCases}
                                                    code={store.code}
                                                    onRunTest={async (tc, code) => {
                                                        const msg = `Analyze my code against this API test:\nMethod: ${tc.method} ${tc.path}\nExpected status: ${tc.expectedStatus}\nDescription: ${tc.description}${tc.body ? `\nRequest body: ${JSON.stringify(tc.body)}` : ""}\n\nMy code:\n\`\`\`\n${code}\n\`\`\`\n\nDoes my implementation handle this test case correctly? Answer with PASS or FAIL and explain why.`;
                                                        const result = await getMentorResponse(
                                                            problem.slug,
                                                            [],
                                                            msg,
                                                            code,
                                                            problem.module,
                                                            1
                                                        );
                                                        return result.success ? result.message : "Failed to analyze";
                                                    }}
                                                />
                                            </div>
                                        )
                                    }
                                </>
                            )
                        }
                    </div>
                </Panel>
                {
                    mode === "ASSIST" && (
                        <>
                            <PanelResizeHandle className={cn("bg-neutral-200 transition-colors dark:bg-neutral-800", isNarrow ? "h-1 w-full cursor-row-resize" : "w-1 cursor-col-resize")} />
                            <Panel defaultSize={isNarrow ? "30%" : "35%"} minSize="20%" maxSize={isNarrow ? "60%" : "50%"}>
                                <div className="h-full overflow-hidden">
                                    <ChatPanel problem={problem} store={store} session={session} sendToChatRef={sendToChatRef} onStageDone={finishSession} />
                                </div>
                            </Panel>
                        </>
                    )
                }
            </PanelGroup>
        </div>
    );
}

/**
 * One line above the DSA editor: the signature when the language has tests,
 * and an honest notice when it does not (PD-5). Themed like the rest of the
 * workspace (plan/practice-ui, UI-4).
 */
function EditorStrip({
    usesJudge,
    signature,
    language,
    judgeStatus,
    testedLanguages,
}: {
    usesJudge: boolean;
    signature: string | null;
    language: string;
    judgeStatus: PracticeProblemDetail["judge"]["judgeStatus"];
    testedLanguages: string[];
}) {
    // Nothing above the editor when the language has tests (Niraj, 2026-09-22:
    // "remove this element from here"). The signature was already the first line
    // of the starter code in the editor below it, so the strip repeated it and
    // cost a row of the editor's height.
    if (usesJudge) return null;
    const label = LANGUAGE_LABELS[language] ?? language;
    const tested = testedLanguages.map((l) => LANGUAGE_LABELS[l] ?? l).join(" or ");
    const message =
        judgeStatus === "ready"
            ? `No tests for ${label} yet. Run prints your program's output and the mentor reads it.${tested ? ` Switch to ${tested} for tests.` : ""}`
            : judgeStatus === "failed"
                ? "Tests could not be prepared for this problem. Run prints your program's output and the mentor reads it."
                : "Tests for this problem are still being prepared. Run prints your program's output for now.";
    return (
        <div role="note" className="flex min-h-9 shrink-0 items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-xs leading-snug text-neutral-700 dark:text-neutral-300">
            {message}
        </div>
    );
}

function ProblemPanel({
    problem,
    requirementsMet,
}: {
    problem: PracticeProblemDetail;
    requirementsMet: Record<string, boolean>;
}) {
    return (
        <ScrollArea className="w-full h-full">
            <div className="p-6 space-y-5">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{problem.title}</h2>
                    <Badge variant="outline" className={cn("text-xs", DIFFICULTY_COLORS[problem.difficulty])}>
                        {problem.difficulty}
                    </Badge>
                </div>
                <div className="prose dark:prose-invert prose-sm max-w-none">
                    <MarkdownRenderer
                        content={problem.description}
                        /*
                         * Body ink, not grey-on-black.
                         *
                         * `[&_li]:text-neutral-600` had no dark variant, so every bullet
                         * in the statement rendered #525252 on black - about 2.8:1, under
                         * half the 4.5:1 AA needs (Niraj, 2026-09-22: "the text are not
                         * showing properly"). Paragraphs were neutral-400, readable but
                         * washed out for the page's primary content.
                         */
                        className="[&>*:first-child]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-neutral-800 dark:[&_p]:text-neutral-200 [&_code]:text-xs [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-neutral-800 dark:[&_li]:text-neutral-200 [&_strong]:text-neutral-900 dark:[&_strong]:text-white"
                    />
                </div>
                <div>
                    <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                        Requirements
                    </h3>
                    <div className="space-y-1.5">
                        {
                            problem.requirements.map((req, i) => {
                                const met = requirementsMet[`req-${i}`] ?? false;
                                return (
                                    <div key={i} className="flex items-start gap-2">
                                        {
                                            met ? (
                                                <CheckCircle2 className="h-4 w-4 text-neutral-900 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-600 flex-shrink-0 mt-0.5" />
                                            )
                                        }
                                        <span className={cn("text-sm", met ? "text-neutral-600 dark:text-neutral-400" : "text-neutral-500 dark:text-neutral-400")}>
                                            {req}
                                        </span>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>

                {problem.hints.length > 0 && <HintsSection hints={problem.hints} />}

                {
                    problem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                            {
                                problem.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
                                        {tag}
                                    </Badge>
                                ))
                            }
                        </div>
                    )
                }
            </div>
        </ScrollArea>
    );
}

function HintsSection({ hints }: { hints: string[] }) {
    const [revealed, setRevealed] = useState(0);
    return (
        <div>
            <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Hints</h3>
            <div className="space-y-2">
                {
                    hints.slice(0, revealed).map((hint, i) => (
                        <p key={i} className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800">
                            💡 {hint}
                        </p>
                    ))
                }
                {
                    revealed < hints.length && (
                        <button
                            onClick={() => setRevealed((r) => r + 1)}
                            className="cursor-pointer text-xs text-neutral-800 dark:text-neutral-200 hover:text-neutral-600 transition-colors"
                        >
                            Reveal hint {revealed + 1} of {hints.length}
                        </button>
                    )
                }
            </div>
        </div>
    );
}

function WebPreview({ code, css }: { code: string; css: string }) {
    const srcDoc = `<!DOCTYPE html>
<html>
<head><style>${css}</style></head>
<body>${code}</body>
</html>`;

    return (
        <div className="h-full flex flex-col">
            <div className="h-8 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-3">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Live Preview</span>
            </div>
            <iframe srcDoc={srcDoc} className="flex-1 bg-white" sandbox="allow-scripts" title="Live Preview" />
        </div>
    );
}

function OutputPanel({
    result,
    isRunning,
    onClose,
}: {
    result: ExecuteCodeResult | null;
    isRunning: boolean;
    onClose: () => void;
}) {
    return (
        <div className="h-[40%] border-t border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-950">
            <div className="h-8 flex items-center justify-between px-3 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Output</span>
                    {result && !isRunning && (
                        <span className={cn(
                            "text-xs font-medium px-1.5 py-0.5 rounded",
                            result.exitCode === 0
                                ? "bg-neutral-100 dark:bg-neutral-900/50 text-neutral-800 dark:text-neutral-200"
                                : "bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                        )}>
                            {result.exitCode === 0 ? "✓ Exited 0" : `✗ Exit ${result.exitCode ?? "err"}`}
                        </span>
                    )}
                    {result?.executionTimeMs != null && (
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">{result.executionTimeMs}ms</span>
                    )}
                </div>
                <button onClick={onClose} className="cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 text-xs">✕</button>
            </div>
            <ScrollArea className="min-h-0 flex-1 font-mono text-xs" viewportClassName="p-3" reflow>
                {isRunning ? (
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <InlineLoader size="sm" />
                        <span>Running code...</span>
                    </div>
                ) : result ? (
                    <div className="space-y-3">
                        {result.error && !result.stdout && !result.stderr && (
                            <div className="text-red-600 dark:text-red-400">{result.error}</div>
                        )}
                        {result.stdout && (
                            <div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">STDOUT</div>
                                <pre className="text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-all">{result.stdout}</pre>
                            </div>
                        )}
                        {result.stderr && (
                            <div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">STDERR</div>
                                <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">{result.stderr}</pre>
                            </div>
                        )}
                        {result.testResults && result.testResults.length > 0 && (
                            <div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                    TEST CASES - {result.testResults.filter(t => t.passed).length}/{result.testResults.length} passed
                                </div>
                                <div className="space-y-1.5">
                                    {result.testResults.map((tc, i) => (
                                        <div key={i} className={cn(
                                            "rounded px-2.5 py-1.5 border",
                                            tc.passed
                                                ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/30"
                                                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                                        )}>
                                            <div className="flex items-center gap-1.5">
                                                <span className={tc.passed ? "text-neutral-800 dark:text-neutral-200" : "text-red-600 dark:text-red-400"}>
                                                    {tc.passed ? "✓" : "✗"}
                                                </span>
                                                <span className="text-neutral-600 dark:text-neutral-400 text-xs">
                                                    {tc.description ?? `Test ${i + 1}`}
                                                </span>
                                            </div>
                                            {!tc.passed && (
                                                <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-neutral-500 dark:text-neutral-400">Input: </span>
                                                        <span className="text-neutral-600 dark:text-neutral-400">{tc.input || "(none)"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-neutral-500 dark:text-neutral-400">Expected: </span>
                                                        <span className="text-neutral-800 dark:text-neutral-200">{tc.expectedOutput}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-neutral-500 dark:text-neutral-400">Got: </span>
                                                        <span className="text-red-600 dark:text-red-400">{tc.actualOutput || "(none)"}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-neutral-600 dark:text-neutral-400">Run your code to see output here.</span>
                )}
            </ScrollArea>
        </div>
    );
}

function ChatPanel({
    problem,
    store,
    session,
    sendToChatRef,
    onStageDone,
}: {
    problem: PracticeProblemDetail;
    store: PracticeWorkspaceState;
    session: PracticeSessionData;
    sendToChatRef: React.MutableRefObject<((message: string) => void) | null>;
    /** The mentor moved the session to done: run the closing review (PD-13). */
    onStageDone: () => void;
}) {
    const [input, setInput] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    /*
     * Speaking to the mentor (plan/practice-workspace, PW-5).
     *
     * Sarvam AI, through our own route: the browser records and the words so far
     * land in the composer every couple of seconds. The person presses Send, so a
     * misheard word is theirs to fix before the mentor ever sees it.
     */
    const spokeThisTurn = useRef(false);
    const dictation = useDictation({
        onText: (text) => {
            spokeThisTurn.current = true;
            setInput(text);
            store.setVoiceTranscript(text);
        },
    });

    /** The mentor answers out loud only when it was spoken to (Niraj, 2026-09-22). */
    const [muted, setMuted] = useState(false);

    // Auto-scroll to bottom on new messages.
    //
    // The ref is on the ScrollArea ROOT, and the root does not scroll - the Radix
    // viewport inside it does. Setting `scrollTop` on the root is a no-op that
    // fails silently, which is exactly what happened when this list stopped being
    // a bare `overflow-y-auto` div (JB-1).
    useEffect(() => {
        const viewport = scrollRef.current?.querySelector<HTMLElement>(
            "[data-radix-scroll-area-viewport]",
        );
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }, [store.chatHistory.length, store.isChatLoading]);

    // ── Start/Stop speaking ──
    // Stopping does NOT send: the words go into the box and wait, because a
    // transcript nobody checked is a turn the mentor answers wrongly.
    const toggleVoice = () => {
        if (dictation.isListening) {
            store.setVoiceActive(false);
            void dictation.stop();
            return;
        }
        store.setVoiceActive(true);
        setInput("");
        store.setVoiceTranscript("");
        void dictation.start();
    };

    // Guided mentor (DSA, ASSIST): the stage-aware route with memory (PD-6/7).
    const guided = problem.module === "DSA" && session.mode === "ASSIST";

    /** Replace one message's content through LIVE store state, never a render snapshot. */
    const patchMessage = (id: string, patch: Partial<PracticeChatMessage>) => {
        usePracticeStore.setState((state) => ({
            chatHistory: state.chatHistory.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
    };

    /**
     * Stream one mentor reply into a placeholder message. `open` asks the route
     * for the opening line (fresh session) or the resume line (returning user)
     * instead of answering a user message.
     */
    const streamMentor = useCallback(async (userMessage: string, opts: { open?: boolean } = {}) => {
        const live = usePracticeStore.getState();
        const history = live.chatHistory
            .filter((m) => !m.ephemeral && (m.role === "user" || m.role === "assistant") && m.content.trim())
            // The new user message was just added; the route appends it itself.
            .filter((m, i, arr) => !(i === arr.length - 1 && m.role === "user" && m.content === userMessage))
            .map((m) => ({ role: m.role, content: m.content }));

        const assistantMsgId = crypto.randomUUID();
        store.addChatMessage({
            id: assistantMsgId,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
            ...(opts.open && history.length > 0 ? { ephemeral: true } : {}),
        });
        store.setChatLoading(true);

        const fallback = async () => {
            if (opts.open) return;
            const res = await getMentorResponse(problem.slug, history, userMessage, live.code, problem.module, session.attempts + 1);
            patchMessage(assistantMsgId, { content: res.success ? res.message : "The mentor is unavailable right now. Try again in a moment." });
        };

        try {
            const res = await fetch("/api/practice/mentor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    problemSlug: problem.slug,
                    sessionId: session.id,
                    chatHistory: history,
                    userMessage,
                    userCode: live.code,
                    language: live.language,
                    attemptNumber: session.attempts + 1,
                    open: Boolean(opts.open),
                }),
            });
            if (!res.ok || !res.body) {
                await fallback();
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";
            let buffer = "";
            let stageMoved = false;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                // Events can split across chunks; keep the unfinished tail.
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") continue;
                    try {
                        const parsed = JSON.parse(data) as { content?: string; stage?: PracticeStage };
                        if (parsed.content) {
                            accumulated += parsed.content;
                            patchMessage(assistantMsgId, { content: accumulated });
                        }
                        if (parsed.stage) {
                            stageMoved = true;
                            store.setStage(parsed.stage);
                            store.addChatMessage({
                                id: crypto.randomUUID(),
                                role: "system",
                                content: parsed.stage === "done" ? "Problem solved" : `Moved to ${STAGE_LABELS[parsed.stage]}`,
                                timestamp: new Date().toISOString(),
                            });
                        }
                    } catch {
                        // skip malformed chunks
                    }
                }
            }
            /*
             * Spoken to, spoken back (PW-5).
             *
             * The reply is read out only when the turn that prompted it was spoken,
             * and only while the panel is unmuted. Someone typing gets a silent
             * mentor, which is what they asked for by typing.
             */
            if (spokeThisTurn.current && !muted && accumulated.trim()) {
                void playTTS(accumulated);
            }
            spokeThisTurn.current = false;

            // A stage boundary is when memory is consolidated (PD-8). Save first:
            // the job reads the transcript from the database, not from here.
            if (stageMoved) {
                const now = usePracticeStore.getState();
                const saved = await saveSessionProgress(session.id, {
                    code: now.code,
                    cssCode: now.cssCode,
                    canvasData: now.canvasData as object,
                    language: now.language,
                    chatHistory: now.chatHistory,
                    totalTimeSeconds: now.elapsedSeconds,
                });
                if (saved) {
                    now.markClean();
                    // Finishing consolidates memory itself, after the review.
                    if (now.stage === "done") onStageDone();
                    else void requestMemoryUpdate(session.id);
                }
            }
        } catch {
            await fallback();
        } finally {
            store.setChatLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problem.slug, problem.module, session.id, session.attempts]);


    /*
     * ONE STAGE AT A TIME (PD-16).
     *
     * The transcript is one array, but the panel belongs to the stage you are in:
     * going back to Understand should show what was said there, not the whole run.
     * Turns saved before this shipped have no stage, so they are treated as part of
     * whatever stage is open - which is where they were written.
     */
    const stageMessages = useMemo(
        () => (guided ? store.chatHistory.filter((m) => (m.stage ?? store.stage) === store.stage) : store.chatHistory),
        [guided, store.chatHistory, store.stage],
    );

    /*
     * The stage's question, ASKED rather than printed.
     *
     * The stage's goal used to sit under the tracker as a caption, so the panel
     * opened with nobody having said anything (Niraj, 2026-09-22: "this line needs
     * to be as something the model is asking"). It is written into the transcript
     * once per stage instead, so it reads as the mentor's turn, it is saved with the
     * rest, and coming back to the stage shows the conversation from its first line.
     */
    const seeded = useRef<string | null>(null);
    useEffect(() => {
        if (!guided || store.isChatLoading) return;
        const stage = store.stage;
        if (stage === "done" || seeded.current === stage) return;
        const has = store.chatHistory.some((m) => (m.stage ?? stage) === stage);
        if (has) {
            seeded.current = stage;
            return;
        }
        seeded.current = stage;
        store.addChatMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: STAGE_GOALS[stage],
            timestamp: new Date().toISOString(),
            stage,
        });
    }, [guided, store.stage, store.chatHistory, store.isChatLoading, store]);

    const handleSend = useCallback(async (messageText?: string) => {
        const trimmed = (messageText ?? input).trim();
        if (!trimmed || usePracticeStore.getState().isChatLoading) return;
        store.addChatMessage({
            id: crypto.randomUUID(),
            role: "user",
            content: trimmed,
            timestamp: new Date().toISOString(),
            stage: usePracticeStore.getState().stage,
        });
        setInput("");
        store.setVoiceTranscript("");
        await streamMentor(trimmed);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input, streamMentor]);

    // The mentor speaks first (PD-7): an opening question on a fresh session, a
    // "welcome back" line from memory on a returning one. Once per mount; the
    // ref survives strict mode's double effect in development.
    const opened = useRef(false);
    useEffect(() => {
        if (!guided || opened.current) return;
        opened.current = true;
        void streamMentor("", { open: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guided]);

    // Expose handleSend to parent via ref
    useEffect(() => {
        sendToChatRef.current = (message: string) => handleSend(message);
        return () => { sendToChatRef.current = null; };
    }, [handleSend, sendToChatRef]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── TTS: Play assistant message aloud ──
    const playTTS = async (text: string) => {
        if (isSpeaking) {
            // Stop current playback
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setIsSpeaking(false);
            return;
        }

        setIsSpeaking(true);
        try {
            const result = await speakMentorReply(text);
            if (result.success) {
                const audio = new Audio(`data:${result.mimeType};base64,${result.audioBase64}`);
                audioRef.current = audio;
                audio.onended = () => {
                    setIsSpeaking(false);
                    audioRef.current = null;
                };
                audio.onerror = () => {
                    setIsSpeaking(false);
                    audioRef.current = null;
                };
                await audio.play();
            } else {
                setIsSpeaking(false);
            }
        } catch {
            setIsSpeaking(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="h-10 shrink-0 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{guided ? "Mentor" : "AI Mentor"}</span>
                <div className="flex items-center gap-3">
                    {dictation.status === "listening" && (
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400" role="status">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                            Listening
                        </span>
                    )}
                    {dictation.status === "transcribing" && (
                        <span className="text-xs text-neutral-600 dark:text-neutral-400" role="status">Writing that down</span>
                    )}
                    {/* The mentor reads its reply out when it was spoken to; this turns
                        that off for someone working somewhere quiet. */}
                    <button
                        type="button"
                        onClick={() => {
                            setMuted((m) => !m);
                            if (!muted && audioRef.current) { audioRef.current.pause(); audioRef.current = null; setIsSpeaking(false); }
                        }}
                        aria-pressed={muted}
                        title={muted ? "The mentor stays silent" : "The mentor reads its reply when you speak"}
                        className="cursor-pointer text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>
            {guided && <StageTracker stage={store.stage} />}
            <ScrollArea ref={scrollRef} className="min-h-0 flex-1" viewportClassName="p-4 space-y-3" reflow>
                {
                    !guided && store.chatHistory.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                Ask questions about the problem. I&apos;ll guide you with hints without giving away the answer.
                            </p>
                        </div>
                    )
                }
                {
                    stageMessages.map((msg: PracticeChatMessage) => (
                        <ChatBubble
                            key={msg.id}
                            message={msg}
                            onPlayTTS={msg.role === "assistant" ? () => playTTS(msg.content) : undefined}
                            isSpeaking={isSpeaking}
                        />
                    ))
                }
                {
                    store.isChatLoading && (
                        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                            <InlineLoader size="sm" />
                            <span className="text-xs">Thinking...</span>
                        </div>
                    )
                }
            </ScrollArea>

            {
                dictation.isListening && store.voiceTranscript && (
                    <div className="px-4 pb-1">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 italic truncate">
                            🎙️ {store.voiceTranscript}
                        </p>
                    </div>
                )
            }

            <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
                {/*
                  * ONE ROW: the field, the mic, the send.
                  *
                  * It was a two-row textarea with the buttons beside it, and the
                  * caret landed in a corner of a much taller box (Niraj,
                  * 2026-09-22: "why it is focusing a small part"). Moving the
                  * buttons UNDER the text fixed the caret and made the composer a
                  * 120px slab with two icons floating below it. One row was the
                  * instruction both times: the border belongs to the row, the
                  * field fills the rest of it, and the buttons sit at the end.
                  *
                  * `items-end` rather than `items-center`: as the field grows the
                  * buttons stay beside the LAST line, where the caret is, instead
                  * of drifting to the middle of a four-line box.
                  */}
                <div className="flex items-end gap-1 rounded-xl border border-neutral-300 bg-white px-1.5 py-1 transition-colors focus-within:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-neutral-500">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={dictation.isListening ? "Listening. Speak, then check the words." : guided ? "Answer the mentor, or ask anything" : "Ask for a hint..."}
                        rows={1}
                        // min-w-0 is load-bearing: without it a long line pushes the
                        // two buttons out of the row instead of wrapping.
                        className="min-h-[38px] max-h-40 w-full min-w-0 flex-1 resize-none border-0 bg-transparent px-1.5 py-2 text-sm leading-relaxed text-neutral-900 shadow-none focus-visible:ring-0 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleVoice}
                        className={cn(
                            "mb-0.5 h-8 w-8 flex-shrink-0 transition-colors",
                            dictation.isListening
                                ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
                            // Disabled still has to READ as disabled at this size,
                            // so unavailable shows the crossed-out mic, not a
                            // faded one: 40% opacity on a grey icon in a grey row
                            // says nothing.
                            dictation.unavailable && "opacity-60",
                        )}
                        disabled={dictation.unavailable || dictation.status === "transcribing"}
                        title={dictation.unavailable ? "Voice is unavailable right now. You can still type." : dictation.isListening ? "Stop and check the words" : "Speak your answer"}
                    >
                        {dictation.isListening || dictation.unavailable ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || store.isChatLoading}
                        aria-label="Send message"
                        title="Send"
                        className="mb-0.5 h-8 w-8 flex-shrink-0 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ChatBubble({
    message,
    onPlayTTS,
    isSpeaking,
}: {
    message: PracticeChatMessage;
    onPlayTTS?: () => void;
    isSpeaking?: boolean;
}) {
    const isUser = message.role === "user";
    if (message.role === "system") {
        return (
            <div className="flex items-center gap-3 py-1" role="status">
                <span className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">{message.content}</span>
                <span className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
            </div>
        );
    }
    // The placeholder of a reply that has not started streaming yet.
    if (!isUser && !message.content) return null;
    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                    isUser
                        ? "bg-neutral-900 text-white dark:bg-neutral-700"
                        : "bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800"
                )}
            >
                {
                    isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                        <MarkdownRenderer
                            content={message.content}
                            className="dark:prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-2 [&_code]:text-xs [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1 [&_li]:pl-1 [&_li]:leading-relaxed"
                        />
                    )
                }
                {
                    !isUser && onPlayTTS && (
                        <button
                            onClick={onPlayTTS}
                            disabled={false}
                            className="mt-1.5 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            {
                                isSpeaking ? (
                                    <>
                                        <Square className="h-3 w-3" />
                                        Stop
                                    </>
                                ) : (
                                    <>
                                        <Volume2 className="h-3 w-3" />
                                        Listen
                                    </>
                                )
                            }
                        </button>
                    )
                }
            </div>
        </div>
    );
}

function SubmitButton({
    problem,
    session,
    store,
    mode,
    onJudgeResult,
}: {
    problem: PracticeProblemDetail;
    session: PracticeSessionData;
    store: PracticeWorkspaceState;
    mode: PracticeMode;
    /** DSA with tests: show the hidden-test verdict in the cases panel. */
    onJudgeResult?: (result: PracticeJudgeResult) => void;
}) {
    const handleSubmit = async () => {
        if (store.isAssessing) return;
        store.setAssessing(true);

        // DSA with tests (exam mode): run the full test set first, so the
        // assessment grades against facts instead of guessing (PD-13).
        let judgeSummary: string | undefined;
        if (hasTestsFor(problem, store.language)) {
            const verdict = await submitSolution(session.id, store.code, store.language);
            onJudgeResult?.(verdict);
            judgeSummary = verdictForMentor(verdict);
        }

        // Save first
        await saveSessionProgress(session.id, {
            code: store.code,
            cssCode: store.cssCode,
            canvasData: store.canvasData as object,
            language: store.language,
            chatHistory: store.chatHistory,
            totalTimeSeconds: store.elapsedSeconds,
        });

        const result = await assessPracticeWork({
            module: problem.module,
            problemSlug: problem.slug,
            mode,
            attemptNumber: session.attempts + 1,
            userWork: problem.module === "SYSTEM_DESIGN"
                ? JSON.stringify(store.canvasData)
                : store.code,
            userCss: store.cssCode || undefined,
            language: store.language,
            conversationHistory: store.chatHistory,
            previousFeedback: store.lastFeedback ?? undefined,
            judgeSummary,
        });

        if (result.success) {
            store.setAssessmentResult(
                result.result.score,
                result.result.feedback,
                result.result.requirementsMet
            );

            // The session was written by `assessPracticeWork` itself (PD-18). The
            // client shows the result; it no longer reports it.
        } else {
            store.setAssessing(false);
        }
    };

    return (
        <Button
            size="sm"
            onClick={handleSubmit}
            disabled={store.isAssessing}
            className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white text-xs h-8"
        >
            {
                store.isAssessing ? (
                    <>
                        <InlineLoader size="sm" className="mr-1.5" />
                        Assessing...
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Submit
                    </>
                )
            }
        </Button>
    );
}