"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Link, Type, Sparkles, Check, AlertCircle } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@repo/ui/components/ui/sheet";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select";
import toast from "@repo/ui/components/ui/sonner";
import {
    generateProblemFromURL,
    generateProblemFromName,
    createUserPracticeProblem,
} from "@/actions/(main)/practice/generate-problem.action";
import { MODULE_CONFIG } from "@/types/practice";
import type { PracticeModule, PracticeDifficulty } from "@/types/practice";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { PreparingTests } from "./preparing-tests";

interface AddProblemSheetProps {
    module: PracticeModule;
    onProblemAdded?: () => void;
}

type InputMode = "url" | "name";

interface GeneratedProblem {
    title: string;
    description: string;
    category: string;
    difficulty: PracticeDifficulty;
    requirements: string[];
    hints: string[];
    tags: string[];
    starterCode?: string;
}

const DIFFICULTY_STYLES: Record<string, string> = {
    EASY: "bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800/20 dark:text-neutral-100 dark:border-neutral-800",
    MEDIUM: "bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800/20 dark:text-neutral-100 dark:border-neutral-800",
    HARD: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
};

export function AddProblemSheet({ module, onProblemAdded }: AddProblemSheetProps) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<InputMode>("url");
    const [url, setUrl] = useState("");
    const [name, setName] = useState("");
    const [selectedModule, setSelectedModule] = useState<PracticeModule>(module);
    const [difficulty, setDifficulty] = useState<PracticeDifficulty | "">("");
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<GeneratedProblem | null>(null);
    const [preparing, setPreparing] = useState<{ jobId: string | null; problem: { id: string; slug: string; title: string } } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const config = MODULE_CONFIG[selectedModule];
    const categories = Object.entries(config.categories);

    const resetForm = () => {
        setMode("url");
        setUrl("");
        setName("");
        setSelectedModule(module);
        setDifficulty("");
        setPreview(null);
        setError(null);
        setPreparing(null);
    };

    const handleGenerate = async () => {
        setError(null);
        setPreview(null);
        setGenerating(true);

        try {
            const result = mode === "url"
                ? await generateProblemFromURL(url.trim(), selectedModule)
                : await generateProblemFromName(
                    name.trim(),
                    selectedModule,
                    difficulty || undefined
                );

            if (!result.success || !result.problem) {
                setError(result.error ?? "Failed to generate problem. Please try again.");
                return;
            }

            setPreview(result.problem);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!preview) return;
        setSaving(true);

        try {
            const result = await createUserPracticeProblem({
                ...preview,
                module: selectedModule,
            });

            if (result.success) {
                onProblemAdded?.();
                // DSA: stay open and follow test generation, so the user can open
                // the problem the moment it can be practised (PD-12).
                if (selectedModule === "DSA" && result.problem) {
                    setPreview(null);
                    setPreparing({ jobId: result.judgeJobId ?? null, problem: result.problem });
                    return;
                }
                toast.success("Problem added successfully!");
                setOpen(false);
                resetForm();
            } else {
                toast.error(result.error ?? "Failed to save problem.");
            }
        } catch {
            toast.error("Failed to save problem. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const canGenerate = mode === "url" ? url.trim().length > 0 : name.trim().length > 0;

    return (
        <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Problem
                </Button>
            </SheetTrigger>
            {/* w-[500px] was unprefixed - unconditional, wider than the viewport below
                640px, so the sheet ran off the left edge of a phone screen with no way
                to reach the clipped half. Dropping it leaves the Sheet primitive's own
                responsive `w-3/4` mobile width in place, capped at 500px from `sm` up.
                See docs/responsiveness.md section 6. */}
            <SheetContent side="right" className="sm:max-w-[500px]">
                <SheetHeader className="pb-4">
                    <SheetTitle className="text-base">Add Custom Problem</SheetTitle>
                </SheetHeader>

                {preparing ? (
                    <PreparingTests
                        jobId={preparing.jobId}
                        problem={preparing.problem}
                        onDone={() => { setOpen(false); resetForm(); }}
                    />
                ) : (
                <div className="space-y-5">
                    {/* Mode Toggle */}
                    <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-800 p-0.5">
                        <button
                            onClick={() => setMode("url")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                                mode === "url"
                                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-white dark:text-neutral-400"
                            }`}
                        >
                            <Link className="h-3.5 w-3.5" />
                            From URL
                        </button>
                        <button
                            onClick={() => setMode("name")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                                mode === "name"
                                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-white dark:text-neutral-400"
                            }`}
                        >
                            <Type className="h-3.5 w-3.5" />
                            From Name
                        </button>
                    </div>

                    {/* Input Field */}
                    {mode === "url" ? (
                        <div className="space-y-1.5">
                            <Label htmlFor="problem-url" className="text-xs">Problem URL</Label>
                            <Input
                                id="problem-url"
                                placeholder="https://leetcode.com/problems/two-sum/"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={generating}
                            />
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                Supports LeetCode, GreatFrontend, HackerRank, and more
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <Label htmlFor="problem-name" className="text-xs">Problem Name</Label>
                            <Input
                                id="problem-name"
                                placeholder='e.g. "Two Sum", "Design Twitter"'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={generating}
                            />
                        </div>
                    )}

                    {/* Module Selector */}
                    <div className="space-y-1.5">
                        <Label className="text-xs">Module</Label>
                        <Select
                            value={selectedModule}
                            onValueChange={(v) => setSelectedModule(v as PracticeModule)}
                            disabled={generating}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(MODULE_CONFIG) as PracticeModule[]).map((mod) => (
                                    <SelectItem key={mod} value={mod}>
                                        <span className="flex items-center gap-2">
                                            <span>{MODULE_CONFIG[mod].icon}</span>
                                            {MODULE_CONFIG[mod].label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Difficulty Selector */}
                    <div className="space-y-1.5">
                        <Label className="text-xs">Difficulty (optional)</Label>
                        <Select
                            value={difficulty}
                            onValueChange={(v) => setDifficulty(v as PracticeDifficulty | "")}
                            disabled={generating}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Auto-detect" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EASY">Easy</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HARD">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={!canGenerate || generating}
                        className="w-full gap-2"
                    >
                        {generating ? (
                            <>
                                <InlineLoader size="sm" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate Problem
                            </>
                        )}
                    </Button>

                    {/* Error State */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-3"
                            >
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Loading Skeleton */}
                    <AnimatePresence>
                        {generating && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                            >
                                <div className="h-5 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                                <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                                <div className="h-3 w-5/6 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                                <div className="flex gap-2 pt-1">
                                    <div className="h-5 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                                    <div className="h-5 w-20 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Preview */}
                    <AnimatePresence>
                        {preview && !generating && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.25 }}
                                className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                            >
                                <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug">
                                            {preview.title}
                                        </h3>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs flex-shrink-0 ${DIFFICULTY_STYLES[preview.difficulty] ?? ""}`}
                                        >
                                            {preview.difficulty}
                                        </Badge>
                                    </div>

                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-3">
                                        {preview.description}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {preview.category && (
                                            <Badge variant="secondary" className="text-xs">
                                                {categories.find(([slug]) => slug === preview.category)?.[1]?.name ?? preview.category}
                                            </Badge>
                                        )}
                                        {preview.tags?.slice(0, 3).map((tag) => (
                                            <Badge key={tag} variant="outline" className="text-xs text-neutral-600 dark:text-neutral-400">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>

                                    {preview.requirements.length > 0 && (
                                        <div className="pt-1">
                                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                                                {preview.requirements.length} requirement{preview.requirements.length !== 1 ? "s" : ""}
                                            </p>
                                            <ul className="space-y-1">
                                                {preview.requirements.slice(0, 4).map((req, i) => (
                                                    <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                                        <Check className="h-3 w-3 text-neutral-900 dark:text-neutral-100 mt-0.5 flex-shrink-0" />
                                                        <span className="line-clamp-1">{req}</span>
                                                    </li>
                                                ))}
                                                {preview.requirements.length > 4 && (
                                                    <li className="text-xs text-neutral-600 dark:text-neutral-400 pl-4.5">
                                                        +{preview.requirements.length - 4} more
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900/50">
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="w-full gap-2"
                                        size="sm"
                                    >
                                        {saving ? (
                                            <>
                                                <InlineLoader size="sm" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-3.5 w-3.5" />
                                                Add to Problem Set
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
