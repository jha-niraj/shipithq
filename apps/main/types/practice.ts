// Practice Module Types
import {
    practiceModuleEnum,
    practiceDifficultyEnum,
    practiceSessionStatusEnum,
    practiceModeEnum,
} from "@repo/db";
import type { ClientJudgeView, PracticeStage } from "@repo/db";

export type PracticeModule = typeof practiceModuleEnum.enumValues[number];
export type PracticeDifficulty = typeof practiceDifficultyEnum.enumValues[number];
export type PracticeSessionStatus = typeof practiceSessionStatusEnum.enumValues[number];
export type PracticeMode = typeof practiceModeEnum.enumValues[number];

// ── Problem Types ──

export interface PracticeProblemListItem {
    id: string;
    slug: string;
    title: string;
    module: PracticeModule;
    category: string;
    difficulty: PracticeDifficulty;
    tags: string[];
    sortOrder: number;
    /** User-specific status (injected from session query) */
    userStatus?: PracticeSessionStatus;
    userBestScore?: number;
    /** DSA: whether the problem's tests exist yet (PD-12). */
    judgeStatus: string;
}

export interface PracticeProblemDetail {
    id: string;
    slug: string;
    title: string;
    description: string;
    module: PracticeModule;
    category: string;
    difficulty: PracticeDifficulty;
    requirements: string[];
    hints: string[];
    starterCode: string | null;
    starterCss: string | null;
    testCases: PracticeTestCase[] | null;
    tags: string[];
    /**
     * DSA judge assets as the browser may see them: signature, status, SAMPLE
     * tests and which languages have a harness. Built only by `clientSafeJudge`;
     * hidden tests, harnesses and the reference solution never reach here.
     */
    judge: ClientJudgeView;
}

export interface PracticeTestCase {
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

// ── Category (derived from problem grouping) ──

export interface PracticeCategory {
    slug: string;
    name: string;
    icon: string;
    problemCount: number;
    completedCount: number;
    inProgressCount: number;
}

// ── Session Types ──

export interface PracticeSessionData {
    id: string;
    userId: string;
    problemId: string;
    module: PracticeModule;
    mode: PracticeMode;
    status: PracticeSessionStatus;
    code: string | null;
    cssCode: string | null;
    canvasData: unknown;
    language: string | null;
    attempts: number;
    bestScore: number;
    lastFeedback: string | null;
    requirementsMet: Record<string, boolean> | null;
    totalTimeSeconds: number;
    startedAt: Date;
    completedAt: Date | null;
    voiceUsed: boolean;
    chatHistory: PracticeChatMessage[] | null;
    xpAwarded: number;
    /** Guided-session stage (DSA, ASSIST). A COMPLETED session reads as `done`. */
    stage: PracticeStage;
}

// ── Judge (DSA Run and Submit) ──

export interface PracticeJudgeCase {
    id: string;
    label: string;
    hidden: boolean;
    passed: boolean;
    /** Empty for a PASSING hidden case: hidden inputs are only revealed when they fail. */
    input: string;
    expectedOutput: string;
    actualOutput: string;
    explanation?: string;
    /** The case hit the per-case time limit; show "time limit", not a wrong answer. */
    timedOut: boolean;
}

export type PracticeJudgeResult =
    | {
        status: "ok";
        kind: "run" | "submit";
        language: string;
        passed: boolean;
        cases: PracticeJudgeCase[];
        sampleTotal: number;
        samplePassed: number;
        hiddenTotal: number;
        hiddenPassed: number;
        executionTimeMs: number;
    }
    | { status: "compile_error"; kind: "run" | "submit"; language: string; message: string }
    | { status: "unavailable"; kind: "run" | "submit"; language: string; message: string };

export interface PracticeChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
    isAssessment?: boolean;
    /**
     * Shown but never saved or sent back to the model: the templated "welcome
     * back" line a returning user sees. Persisting it would add one message to
     * the transcript per visit, and the memory job would read it as a real turn.
     */
    ephemeral?: boolean;
    /**
     * Which guided stage this turn belongs to (PD-16). The mentor panel shows one
     * stage at a time, so going back to Understand shows what was said there rather
     * than the whole run. Absent on older rows and on the unguided chat, which are
     * treated as belonging to whatever stage is open.
     */
    stage?: PracticeStage;
}

// ── Progress & Leaderboard ──

export interface PracticeProgressData {
    module: PracticeModule;
    totalProblems: number;
    completed: number;
    inProgress: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    lastPracticedAt: Date | null;
    easyCompleted: number;
    mediumCompleted: number;
    hardCompleted: number;
    averageScore: number;
}

export interface PracticeLeaderboardEntry {
    rank: number;
    userId: string;
    userName: string | null;
    userImage: string | null;
    totalXP: number;
    completed: number;
    averageScore: number;
    streak: number;
}

// ── Assess Payload Types ──

export interface PracticeAssessPayload {
    module: PracticeModule;
    problemSlug: string;
    mode: PracticeMode;
    attemptNumber: number;
    userWork: string;
    userCss?: string;
    language?: string;
    conversationHistory: PracticeChatMessage[];
    previousFeedback?: string;
    /** DSA: the hidden-test verdict from the judge, passed to the assessor as fact (PD-13). */
    judgeSummary?: string;
}

export interface PracticeAssessResult {
    score: number;
    feedback: string;
    requirementsMet: Record<string, boolean>;
    xpAwarded: number;
}

// ── Sidebar types (used by client) ──

export interface PracticeSidebarModule {
    key: PracticeModule;
    label: string;
    icon: string;
    categories: PracticeSidebarCategory[];
}

export interface PracticeSidebarCategory {
    slug: string;
    name: string;
    icon: string;
    problemCount: number;
    completedCount: number;
}

// ── User Stats (dashboard) ──

export interface PracticeUserStats {
    totalSolved: number;
    totalAttempted: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    averageScore: number;
    moduleBreakdown: PracticeProgressData[];
    recentSessions: PracticeRecentSession[];
    difficultyBreakdown: {
        easy: { total: number; completed: number };
        medium: { total: number; completed: number };
        hard: { total: number; completed: number };
    };
}

export interface PracticeRecentSession {
    problemTitle: string;
    problemSlug: string;
    module: PracticeModule;
    category: string;
    difficulty: PracticeDifficulty;
    bestScore: number;
    status: PracticeSessionStatus;
    updatedAt: Date;
}

// ── DSA Category config ──

export const DSA_CATEGORIES: Record<string, { name: string; icon: string }> = {
    "arrays-and-hashing": { name: "Arrays & Hashing", icon: "📊" },
    "two-pointers": { name: "Two Pointers", icon: "🎯" },
    "sliding-window": { name: "Sliding Window", icon: "🪟" },
    "stack": { name: "Stack", icon: "📚" },
    "binary-search": { name: "Binary Search", icon: "🔍" },
    "linked-list": { name: "Linked List", icon: "🔗" },
    "trees": { name: "Trees", icon: "🌳" },
    "tries": { name: "Tries", icon: "🔤" },
    "heap-priority-queue": { name: "Heap / Priority Queue", icon: "⛰️" },
    "backtracking": { name: "Backtracking", icon: "↩️" },
    "graphs": { name: "Graphs", icon: "🕸️" },
    "dynamic-programming": { name: "Dynamic Programming", icon: "📈" },
    "greedy": { name: "Greedy", icon: "🏃" },
    "intervals": { name: "Intervals", icon: "📏" },
    "math-and-geometry": { name: "Math & Geometry", icon: "📐" },
    "bit-manipulation": { name: "Bit Manipulation", icon: "🔢" },
};

export const SD_CATEGORIES: Record<string, { name: string; icon: string }> = {
    "fundamentals": { name: "Fundamentals", icon: "🏗️" },
    "data-intensive": { name: "Data-Intensive", icon: "💾" },
    "real-time": { name: "Real-Time Systems", icon: "⚡" },
    "social-and-feed": { name: "Social & Feed", icon: "📱" },
    "infrastructure": { name: "Infrastructure", icon: "🔧" },
    "e-commerce": { name: "E-Commerce", icon: "🛒" },
};

export const WEB_FRONTEND_CATEGORIES: Record<string, { name: string; icon: string }> = {
    "react-components": { name: "React Components", icon: "⚛️" },
    "state-management": { name: "State Management", icon: "🔄" },
    "api-integration": { name: "API Integration", icon: "🌐" },
    "performance": { name: "Performance", icon: "⚡" },
    "css-and-layout": { name: "CSS & Layout", icon: "🎨" },
};

export const WEB_BACKEND_CATEGORIES: Record<string, { name: string; icon: string }> = {
    "rest-apis": { name: "REST APIs", icon: "🔌" },
    "authentication": { name: "Authentication", icon: "🔐" },
    "database": { name: "Database", icon: "💾" },
    "middleware": { name: "Middleware & Patterns", icon: "🔧" },
    "error-handling": { name: "Error Handling", icon: "🛡️" },
};

export const MODULE_CONFIG: Record<PracticeModule, { label: string; icon: string; path: string; categories: Record<string, { name: string; icon: string }> }> = {
    DSA: { label: "Data Structures & Algorithms", icon: "🧠", path: "dsa", categories: DSA_CATEGORIES },
    SYSTEM_DESIGN: { label: "System Design", icon: "🏗️", path: "system-design", categories: SD_CATEGORIES },
    WEB_FRONTEND: { label: "Web Frontend", icon: "⚛️", path: "web-frontend", categories: WEB_FRONTEND_CATEGORIES },
    WEB_BACKEND: { label: "Web Backend", icon: "🔌", path: "web-backend", categories: WEB_BACKEND_CATEGORIES },
};

// Helper to get module enum from URL path
export function getModuleFromPath(path: string): PracticeModule | null {
    const map: Record<string, PracticeModule> = {
        dsa: "DSA",
        "system-design": "SYSTEM_DESIGN",
        "web-frontend": "WEB_FRONTEND",
        "web-backend": "WEB_BACKEND",
    };
    return map[path] ?? null;
}

// Helper to get URL path from module enum
export function getPathFromModule(module: PracticeModule): string {
    return MODULE_CONFIG[module]!.path;
}
