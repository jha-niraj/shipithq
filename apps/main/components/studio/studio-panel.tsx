"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    PenLine, Plus, X,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { StudioViewer } from "./viewer/studio-viewer";
import { AIInputPanel } from "./ui/ai-input-panel";
import { 
    createStudio, getStudioWithSteps
} from "@/actions/(main)/studios/studio.actions";
import toast from "@repo/ui/components/ui/sonner";
import { useStudioStore } from "@/app/store/studioStore";
import type { StudioWithSteps } from "@/types/studios";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface StudioPanelProps {
    /** Whether the panel is visible */
    isOpen: boolean;
    /** Toggle panel visibility */
    onToggle: () => void;
    /** Context for creating the studio (title, description, source, sourceId) */
    context: {
        title: string;
        description?: string;
        source: "PATHFINDER" | "SPACE" | "MANUAL";
        sourceId?: string;
        /** Label for the topic (shown in UI) */
        topicLabel?: string;
    };
    /** Whether the user is logged in */
    isLoggedIn: boolean;
    /** Width of the panel (number for px, string for css value like "100%") */
    width?: number | string;
    /** Optional class for wrapper */
    className?: string;
    /** Hide the close button */
    hideClose?: boolean;
    /**
     * Hide the "Studio" title bar.
     *
     * Its two controls are the close button and a link to the full Studio. When
     * this panel is embedded in a page that already offers both - the pathfinder
     * goal page has "Open Full Notes" in its own header - the bar is a strip of
     * chrome that only repeats what is above it, directly above the content it
     * is stealing height from.
     *
     * A prop rather than a deletion: a future caller that mounts this panel as a
     * real dismissable rail still needs the close button.
     */
    hideHeader?: boolean;
    /** Pre-existing studio ID - when provided, fetch and initialize instead of showing create */
    initialStudioId?: string;
    /** Custom create action - when provided, use instead of default createStudio (e.g. for pathfinder sub-goals) */
    createStudioAction?: (ctx: { title: string; description?: string; source: string; sourceId?: string }) => Promise<{ studioId: string } | { error: string }>;
}

/**
 * StudioPanel - Single, self-contained Studio component.
 * 
 * Combines:
 * - "Create Studio" prompt (when no studio exists)
 * - StudioViewer (real-time content display)
 * - AIInputPanel (prompt input for generating content)
 * 
 * Uses the Zustand `useStudioStore` for state management so content
 * appears/disappears in real time without page refresh.
 * 
 * Usage:
 * ```tsx
 * <StudioPanel
 *   isOpen={showStudio}
 *   onToggle={() => setShowStudio(!showStudio)}
 *   context={{
 *     title: `Notes: ${learn.title}`,
 *     description: `Study notes for ${learn.title}`,
 *     source: "manual",
 *     sourceId: learn.id,
 *     topicLabel: learn.subCategory?.name || learn.title,
 *   }}
 *   isLoggedIn={isLoggedIn}
 * />
 * ```
 */
export function StudioPanel({
    isOpen,
    onToggle,
    context,
    isLoggedIn,
    width = 420,
    className,
    hideClose = false,
    hideHeader = false,
    initialStudioId,
    createStudioAction,
}: StudioPanelProps) {
    const studioId = useStudioStore((s) => s.studioId);
    const isCreatingStudio = useStudioStore((s) => s.isCreatingStudio);
    const setIsCreatingStudio = useStudioStore((s) => s.setIsCreatingStudio);
    const initialize = useStudioStore((s) => s.initialize);
    const externalPrompt = useStudioStore((s) => s.externalPrompt);
    const setExternalPrompt = useStudioStore((s) => s.setExternalPrompt);

    const [studioData, setStudioData] = useState<StudioWithSteps | null>(null);

    const reset = useStudioStore((s) => s.reset);

    // When initialStudioId is provided, fetch and initialize. When it changes, reset and fetch new.
    useEffect(() => {
        if (!isLoggedIn) return;
        if (!initialStudioId) {
            // No pre-existing studio - reset store so we don't show another sub-goal's studio
            reset();
            setStudioData(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const result = await getStudioWithSteps(initialStudioId);
                if (!cancelled && result.success && result.studio) {
                    initialize(result.studio);
                    setStudioData(result.studio);
                }
            } catch (err) {
                console.error("Failed to load studio:", err);
            }
        })();
        return () => { cancelled = true; };
    }, [initialStudioId, isLoggedIn, initialize, reset]);

    const handleCreateStudio = useCallback(async () => {
        if (!isLoggedIn) {
            toast.error("Please login to create a studio");
            return;
        }
        setIsCreatingStudio(true);
        try {
            const result = createStudioAction
                ? await createStudioAction(context)
                : await createStudio({
                    title: context.title,
                    description: context.description,
                    source: context.source,
                    sourceId: context.sourceId,
                });
            const sid = "studioId" in result ? result.studioId : (result as { success?: boolean; studio?: { id: string } }).studio?.id;
            if ("error" in result && result.error) {
                toast.error(result.error);
            } else if (sid) {
                const studioResult = await getStudioWithSteps(sid);
                if (studioResult.success && studioResult.studio) {
                    initialize(studioResult.studio);
                    setStudioData(studioResult.studio);
                }
                toast.success("Studio created! You can now take notes and ask AI questions.");
            } else if (!("error" in result && result.error)) {
                toast.error("Failed to create studio");
            }
        } catch {
            toast.error("Failed to create studio");
        } finally {
            setIsCreatingStudio(false);
        }
    }, [context, isLoggedIn, initialize, setIsCreatingStudio, createStudioAction]);

    // If the user triggers the panel with an external prompt and no studio exists,
    // auto-create the studio first
    useEffect(() => {
        if (isOpen && externalPrompt && !studioId && !isCreatingStudio && isLoggedIn) {
            handleCreateStudio();
        }
    }, [isOpen, externalPrompt, studioId, isCreatingStudio, isLoggedIn, handleCreateStudio]);

    // Callback when AI content is added - refresh studio data
    const handleContentAdded = useCallback(async () => {
        if (!studioId) return;
        try {
            const result = await getStudioWithSteps(studioId);
            if (result.success && result.studio) {
                setStudioData(result.studio);
            }
        } catch (err) {
            console.error("Failed to refresh studio:", err);
        }
    }, [studioId]);

    return (
        <AnimatePresence>
            {
                isOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`hidden lg:flex flex-col flex-shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-hidden h-full min-h-0 ${className || ""}`}
                    >
                        {!hideHeader && (
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <PenLine className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                <span className="text-sm font-semibold">Studio</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {
                                    !hideClose && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )
                                }
                            </div>
                        </div>
                        )}

                        {
                            !studioId ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center mb-4">
                                        <PenLine className="w-8 h-8 text-white dark:text-black" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Create Studio</h3>
                                    <p className="text-sm text-black dark:text-white mb-2 max-w-[280px]">
                                        Create a personal studio for <strong>{context.topicLabel || context.title}</strong> to take AI-powered notes, generate explanations, quizzes, and more.
                                    </p>
                                    <p className="text-xs text-black dark:text-white mb-6 max-w-[260px]">
                                        Tip: Select any text in the lesson and click &ldquo;Ask AI&rdquo; to get instant explanations!
                                    </p>
                                    <Button
                                        onClick={handleCreateStudio}
                                        disabled={isCreatingStudio}
                                        className="bg-gradient-to-r from-neutral-800 to-neutral-800 text-white hover:from-neutral-700 hover:to-neutral-700"
                                    >
                                        {
                                            isCreatingStudio ? (
                                                <>
                                                    <InlineLoader size="sm" className="mr-2" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Create Studio for {context.topicLabel || "this topic"}
                                                </>
                                            )
                                        }
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 overflow-hidden">
                                        <StudioViewer
                                            studio={studioData || undefined}
                                            studioId={studioId}
                                            className="h-full"
                                        />
                                    </div>
                                    <div className="shrink-0">
                                        <AIInputPanel
                                            studioId={studioId}
                                            onContentAdded={handleContentAdded}
                                            externalPrompt={externalPrompt}
                                            onExternalPromptConsumed={() => setExternalPrompt(null)}
                                        />
                                    </div>
                                </>
                            )
                        }
                    </motion.aside>
                )
            }
        </AnimatePresence>
    );
}