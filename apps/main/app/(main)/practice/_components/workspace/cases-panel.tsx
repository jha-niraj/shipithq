"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import type { JudgeTest } from "@repo/db";
import type { PracticeJudgeCase, PracticeJudgeResult } from "@/types/practice";

// ─────────────────────────────────────────────────────────────────────────────
// The test cases under the DSA editor (PD-4).
//
// Before anything runs it shows the sample cases, so the user can read the
// input format they are writing against. After Run it marks each sample pass
// or fail with the actual output. After Submit it adds one summary row for the
// hidden tests and, when one failed, that case with its input and expected
// output (this is a learning tool, not a contest).
//
// The workspace surface is a constant dark (bg-neutral-950 in both themes), so
// every ink here is constant too: no dark: variants.
// ─────────────────────────────────────────────────────────────────────────────

const INK = "text-neutral-100";
const INK_DIM = "text-neutral-400";

function Block({ label, value, tone }: { label: string; value: string; tone?: "fail" }) {
    return (
        <div>
            <div className={cn("mb-1 text-[11px] font-semibold uppercase tracking-wider", INK_DIM)}>{label}</div>
            <pre
                className={cn(
                    "max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed",
                    tone === "fail" ? "border-red-900/60 bg-red-950/30 text-red-300" : "border-neutral-800 bg-neutral-900 text-neutral-200",
                )}
            >
                {value === "" ? <span className={INK_DIM}>(empty)</span> : value}
            </pre>
        </div>
    );
}

type Tab = { key: string; label: string; state: "idle" | "pass" | "fail" | "timeout"; sample?: JudgeTest; result?: PracticeJudgeCase };

export function CasesPanel({
    samples,
    result,
    busy,
    collapsed,
    onToggle,
}: {
    samples: JudgeTest[];
    result: PracticeJudgeResult | null;
    busy: "run" | "submit" | null;
    collapsed: boolean;
    onToggle: () => void;
}) {
    const okResult = result?.status === "ok" ? result : null;
    const tabs: Tab[] = samples.map((s, i) => {
        const r = okResult?.cases.find((c) => c.id === s.id);
        return {
            key: s.id,
            label: `Case ${i + 1}`,
            state: !r ? "idle" : r.timedOut ? "timeout" : r.passed ? "pass" : "fail",
            sample: s,
            result: r,
        };
    });
    // The first failing hidden case after a submit gets its own tab.
    const failingHidden = okResult?.kind === "submit" ? okResult.cases.find((c) => c.hidden && !c.passed) : undefined;
    if (failingHidden) {
        tabs.push({ key: failingHidden.id, label: "Hidden case", state: failingHidden.timedOut ? "timeout" : "fail", result: failingHidden });
    }

    const [active, setActive] = useState<string>(tabs[0]?.key ?? "");
    // Jump to the first failing case when a new result arrives.
    useEffect(() => {
        if (!okResult) return;
        const firstBad = tabs.find((t) => t.state === "fail" || t.state === "timeout");
        if (firstBad) setActive(firstBad.key);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result]);
    const current = tabs.find((t) => t.key === active) ?? tabs[0];

    const summary = (() => {
        if (busy) return busy === "run" ? "Running sample tests" : "Running all tests";
        if (!result) return `${samples.length} sample case${samples.length === 1 ? "" : "s"}`;
        if (result.status === "compile_error") return "Did not compile";
        if (result.status === "unavailable") return "Not run";
        if (result.kind === "run") return result.passed ? `All ${result.sampleTotal} sample cases passed` : `${result.samplePassed} of ${result.sampleTotal} sample cases passed`;
        return result.passed
            ? `Accepted: ${result.samplePassed + result.hiddenPassed} of ${result.sampleTotal + result.hiddenTotal} tests passed`
            : `${result.samplePassed + result.hiddenPassed} of ${result.sampleTotal + result.hiddenTotal} tests passed`;
    })();

    return (
        <div className={cn("flex min-h-0 flex-col border-t border-neutral-800 bg-neutral-950", collapsed ? "h-10" : "h-[42%]")}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={!collapsed}
                className="flex h-10 shrink-0 cursor-pointer items-center justify-between border-b border-neutral-800 px-3 text-left"
            >
                <span className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold", INK)}>Test cases</span>
                    <span
                        className={cn(
                            "flex items-center gap-1.5 text-xs",
                            result?.status === "ok" && result.passed ? INK : result && !(result.status === "ok" && result.passed) ? "text-red-300" : INK_DIM,
                        )}
                    >
                        {busy && <InlineLoader size="sm" />}
                        {summary}
                    </span>
                </span>
                {collapsed ? <ChevronUp className={cn("h-4 w-4", INK_DIM)} /> : <ChevronDown className={cn("h-4 w-4", INK_DIM)} />}
            </button>

            {!collapsed && (
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    {result?.status === "compile_error" ? (
                        <Block label="Compiler output" value={result.message} tone="fail" />
                    ) : result?.status === "unavailable" ? (
                        <p className="text-sm text-red-300">{result.message}</p>
                    ) : (
                        <>
                            {okResult?.kind === "submit" && okResult.hiddenTotal > 0 && (
                                <div className="mb-3 flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs">
                                    {okResult.hiddenPassed === okResult.hiddenTotal ? (
                                        <Check className="h-3.5 w-3.5 text-neutral-100" />
                                    ) : (
                                        <X className="h-3.5 w-3.5 text-red-300" />
                                    )}
                                    <span className={INK}>
                                        Hidden tests: {okResult.hiddenPassed} of {okResult.hiddenTotal} passed
                                    </span>
                                    <span className={cn("ml-auto", INK_DIM)}>{okResult.executionTimeMs} ms</span>
                                </div>
                            )}

                            <div className="mb-3 flex flex-wrap gap-2" role="tablist">
                                {tabs.map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={t.key === current?.key}
                                        onClick={() => setActive(t.key)}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                            t.key === current?.key ? "border-neutral-500 bg-neutral-800 text-neutral-100" : "border-neutral-800 text-neutral-300 hover:border-neutral-600",
                                        )}
                                    >
                                        {t.state === "pass" && <Check className="h-3 w-3 text-neutral-100" />}
                                        {t.state === "fail" && <X className="h-3 w-3 text-red-300" />}
                                        {t.state === "timeout" && <Clock className="h-3 w-3 text-red-300" />}
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {current && (
                                <div className="space-y-3">
                                    {current.state === "timeout" && (
                                        <p className="text-xs text-red-300">
                                            Time limit: this case ran for over 10 seconds. Look for an infinite loop, or an approach much slower than the input size allows.
                                        </p>
                                    )}
                                    <Block label="Input" value={(current.result?.input || current.sample?.input || "").replace(/\n$/, "")} />
                                    <Block label="Expected output" value={current.result?.expectedOutput ?? current.sample?.expectedOutput ?? ""} />
                                    {current.result && current.state !== "timeout" && (
                                        <Block label="Your output" value={current.result.actualOutput} tone={current.result.passed ? undefined : "fail"} />
                                    )}
                                    {current.sample?.explanation && (
                                        <p className={cn("text-xs leading-relaxed", INK_DIM)}>{current.sample.explanation}</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export { verdictForMentor } from "@/lib/practice/verdict-text";
