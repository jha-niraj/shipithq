"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play, CheckCircle2, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface TestCase {
    id: string;
    label: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: Record<string, unknown>;
    expectedStatus: number;
    expectedBodyContains?: string;
    description: string;
}

interface TestResult {
    testId: string;
    passed: boolean;
    message: string;
}

interface APITesterProps {
    testCases: TestCase[];
    onRunTest: (testCase: TestCase, code: string) => Promise<string>;
    code: string;
}

const METHOD_STYLES: Record<string, string> = {
    GET: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    POST: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    PUT: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    PATCH: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function APITester({ testCases, onRunTest, code }: APITesterProps) {
    const [results, setResults] = useState<Record<string, TestResult>>({});
    const [runningTest, setRunningTest] = useState<string | null>(null);
    const [expandedTest, setExpandedTest] = useState<string | null>(null);

    if (!testCases || testCases.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                No API test cases for this problem.
            </div>
        );
    }

    const handleRunTest = async (tc: TestCase) => {
        setRunningTest(tc.id);
        try {
            const response = await onRunTest(tc, code);
            /*
             * The VERDICT is the first word, not a word somewhere in the reply.
             *
             * This used to be `includes("pass")`, so "this does not pass" and
             * "passing this would need..." both lit up green. The mentor prompt asks
             * for PASS or FAIL first; anything else is read as a failure, because a
             * test whose result cannot be read is not a test that passed.
             */
            const verdict = response.trim().toUpperCase();
            const passed = /^(PASS|✅)\b/.test(verdict) || verdict.startsWith("PASS:");
            setResults((prev) => ({
                ...prev,
                [tc.id]: { testId: tc.id, passed, message: response },
            }));
        } catch {
            setResults((prev) => ({
                ...prev,
                [tc.id]: { testId: tc.id, passed: false, message: "Failed to run test" },
            }));
        }
        setRunningTest(null);
    };

    const handleRunAll = async () => {
        for (const tc of testCases) {
            await handleRunTest(tc);
        }
    };

    const passCount = Object.values(results).filter((r) => r.passed).length;
    const totalRun = Object.keys(results).length;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">API Tests</span>
                    {totalRun > 0 && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {passCount}/{totalRun} passed
                        </span>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={handleRunAll}
                    disabled={runningTest !== null}
                >
                    <Play className="h-3 w-3 mr-1" />
                    Run All
                </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
                <div className="p-2 space-y-1">
                    {testCases.map((tc) => {
                        const result = results[tc.id];
                        const isExpanded = expandedTest === tc.id;
                        const isRunning = runningTest === tc.id;

                        return (
                            <div key={tc.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                <button
                                    onClick={() => setExpandedTest(isExpanded ? null : tc.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                                >
                                    {result ? (
                                        result.passed ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-neutral-900 dark:text-neutral-100 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                        )
                                    ) : (
                                        <div className="h-3.5 w-3.5 rounded-full border border-neutral-300 dark:border-neutral-600 flex-shrink-0" />
                                    )}
                                    <Badge
                                        className={cn(
                                            "text-xs font-bold px-1.5 py-0 border-0",
                                            METHOD_STYLES[tc.method] ?? METHOD_STYLES.GET
                                        )}
                                    >
                                        {tc.method}
                                    </Badge>
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate flex-1">
                                        {tc.path}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-neutral-500 dark:text-neutral-400"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRunTest(tc);
                                        }}
                                        disabled={isRunning}
                                    >
                                        {isRunning ? (
                                            <InlineLoader size="sm" />
                                        ) : (
                                            <Play className="h-3 w-3" />
                                        )}
                                    </Button>
                                    {isExpanded ? (
                                        <ChevronUp className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
                                    ) : (
                                        <ChevronDown className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
                                    )}
                                </button>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden border-t border-neutral-200 dark:border-neutral-800"
                                        >
                                            <div className="px-3 py-2 space-y-1.5 text-xs">
                                                <p className="text-neutral-600 dark:text-neutral-400">{tc.description}</p>
                                                <p className="text-neutral-500 dark:text-neutral-400">
                                                    Expected: <span className="text-neutral-600 dark:text-neutral-400">{tc.expectedStatus}</span>
                                                    {tc.expectedBodyContains && (
                                                        <> containing <span className="text-neutral-600 dark:text-neutral-400 font-mono">{tc.expectedBodyContains}</span></>
                                                    )}
                                                </p>
                                                {tc.body && (
                                                    <pre className="bg-neutral-50 dark:bg-neutral-900 rounded p-2 text-neutral-600 dark:text-neutral-400 font-mono text-xs overflow-x-auto">
                                                        {JSON.stringify(tc.body, null, 2)}
                                                    </pre>
                                                )}
                                                {result && (
                                                    <div className={cn(
                                                        "rounded-md p-2 mt-1",
                                                        result.passed
                                                            ? "bg-neutral-900/20 border border-neutral-800/30"
                                                            : "bg-red-50 dark:bg-red-900/20 border border-red-800/30"
                                                    )}>
                                                        <p className={cn(
                                                            "text-xs",
                                                            result.passed ? "text-neutral-800 dark:text-neutral-200" : "text-red-600 dark:text-red-400"
                                                        )}>
                                                            {result.message}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
