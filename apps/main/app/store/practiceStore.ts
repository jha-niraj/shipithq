"use client";

import { create } from "zustand";
import type {
    PracticeProblemDetail, PracticeSessionData, PracticeChatMessage, 
    PracticeMode, PracticeModule,
} from "@/types/practice";
import { starterFor } from "@/lib/practice/starters";
import type { PracticeStage } from "@repo/db";

// ==========================================
// TYPES
// ==========================================

export interface PracticeWorkspaceState {
    // Core data
    problem: PracticeProblemDetail | null;
    session: PracticeSessionData | null;
    module: PracticeModule | null;
    mode: PracticeMode | null;

    // Editor state
    code: string;
    cssCode: string;
    canvasData: unknown;
    language: string;
    /**
     * The code last written in each language this visit. Switching language
     * stashes the current code here and restores what the user had in the new
     * one, or that language's starter (PD-5). Only the active language's code is
     * persisted on the session row.
     */
    codeByLanguage: Record<string, string>;
    isDirty: boolean;

    // Timer
    elapsedSeconds: number;
    isTimerRunning: boolean;

    // AI Chat
    chatHistory: PracticeChatMessage[];
    isChatLoading: boolean;
    /** Guided-session stage (DSA, ASSIST). Moves only on a `{stage}` event from the mentor route. */
    stage: PracticeStage;

    // Assessment
    isAssessing: boolean;
    lastScore: number | null;
    lastFeedback: string | null;
    requirementsMet: Record<string, boolean>;

    // Voice
    isVoiceActive: boolean;
    voiceTranscript: string;

    // UI State
    activeTab: "code" | "preview" | "canvas";
    isSaving: boolean;

    // ── Actions ──

    // Initialize
    initialize: (problem: PracticeProblemDetail, session: PracticeSessionData) => void;
    reset: () => void;

    // Editor
    setCode: (code: string) => void;
    setCssCode: (css: string) => void;
    setCanvasData: (data: unknown) => void;
    setLanguage: (lang: string) => void;
    markClean: () => void;

    // Timer
    setElapsedSeconds: (seconds: number) => void;
    incrementTimer: () => void;
    setTimerRunning: (running: boolean) => void;

    // Chat
    addChatMessage: (message: PracticeChatMessage) => void;
    setChatHistory: (history: PracticeChatMessage[]) => void;
    setChatLoading: (loading: boolean) => void;
    setStage: (stage: PracticeStage) => void;

    // Assessment
    setAssessing: (assessing: boolean) => void;
    setAssessmentResult: (score: number, feedback: string, reqMet: Record<string, boolean>) => void;

    // Voice
    setVoiceActive: (active: boolean) => void;
    setVoiceTranscript: (transcript: string) => void;

    // UI
    setActiveTab: (tab: "code" | "preview" | "canvas") => void;
    setSaving: (saving: boolean) => void;
}

// ==========================================
// STORE
// ==========================================

const initialState = {
    problem: null,
    session: null,
    module: null,
    mode: null,
    code: "",
    cssCode: "",
    canvasData: null,
    language: "javascript",
    codeByLanguage: {} as Record<string, string>,
    isDirty: false,
    elapsedSeconds: 0,
    isTimerRunning: false,
    chatHistory: [] as PracticeChatMessage[],
    isChatLoading: false,
    stage: "understand" as PracticeStage,
    isAssessing: false,
    lastScore: null,
    lastFeedback: null,
    requirementsMet: {} as Record<string, boolean>,
    isVoiceActive: false,
    voiceTranscript: "",
    activeTab: "code" as const,
    isSaving: false,
};

export const usePracticeStore = create<PracticeWorkspaceState>((set) => ({
    ...initialState,

    // ── Initialize ──
    initialize: (problem, session) =>
        set({
            problem,
            session,
            module: problem.module,
            mode: session.mode,
            code: session.code ?? problem.starterCode ?? "",
            codeByLanguage: { [session.language ?? "javascript"]: session.code ?? problem.starterCode ?? "" },
            cssCode: session.cssCode ?? problem.starterCss ?? "",
            canvasData: session.canvasData,
            language: session.language ?? "javascript",
            elapsedSeconds: session.totalTimeSeconds,
            chatHistory: ((session.chatHistory as PracticeChatMessage[]) ?? []).filter((m) => !m.ephemeral),
            stage: session.stage,
            requirementsMet: session.requirementsMet ?? {},
            lastScore: session.bestScore > 0 ? session.bestScore : null,
            lastFeedback: session.lastFeedback,
            isDirty: false,
            isTimerRunning: true,
        }),

    reset: () => set(initialState),

    // ── Editor ──
    setCode: (code) => set({ code, isDirty: true }),
    setCssCode: (cssCode) => set({ cssCode, isDirty: true }),
    setCanvasData: (canvasData) => set({ canvasData, isDirty: true }),
    setLanguage: (language) =>
        set((state) => {
            if (language === state.language) return {};
            const stash = { ...state.codeByLanguage, [state.language]: state.code };
            const restored = stash[language] ?? (state.problem ? starterFor(state.problem, language) : "");
            return { language, code: restored, codeByLanguage: stash, isDirty: true };
        }),
    markClean: () => set({ isDirty: false }),

    // ── Timer ──
    setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),
    incrementTimer: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),
    setTimerRunning: (isTimerRunning) => set({ isTimerRunning }),

    // ── Chat ──
    // Chat changes mark the session dirty. They did not before, so the 30s
    // autosave skipped any visit where only the conversation changed, and the
    // memory job (PD-8) reads the saved transcript.
    addChatMessage: (message) =>
        set((state) => ({ chatHistory: [...state.chatHistory, message], isDirty: true })),
    setChatHistory: (chatHistory) => set({ chatHistory, isDirty: true }),
    setChatLoading: (isChatLoading) => set({ isChatLoading }),
    setStage: (stage) => set({ stage }),

    // ── Assessment ──
    setAssessing: (isAssessing) => set({ isAssessing }),
    setAssessmentResult: (score, feedback, reqMet) =>
        set({
            lastScore: score,
            lastFeedback: feedback,
            requirementsMet: reqMet,
            isAssessing: false,
        }),

    // ── Voice ──
    setVoiceActive: (isVoiceActive) => set({ isVoiceActive }),
    setVoiceTranscript: (voiceTranscript) => set({ voiceTranscript }),

    // ── UI ──
    setActiveTab: (activeTab) => set({ activeTab }),
    setSaving: (isSaving) => set({ isSaving }),
}));
