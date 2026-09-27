"use client";

import { create } from 'zustand';
import { 
    PathfinderStatus, PathfinderCategory, PathfinderLevel 
    } from '@repo/db';
import type { VerificationAIPlan } from '@/types/pathfinder';

// ==========================================
// TYPES
// ==========================================

export interface PathfinderGoal {
    id: string;
    slug: string;
    title: string;
    category: PathfinderCategory;
    level: PathfinderLevel;
    focusAreas: string[];
    status: PathfinderStatus;
    progressPercent: number;
    totalSubGoals: number;
    completedSubGoals: number;
    totalQuizAnswered: number;
    totalCodingSolved: number;
    streakDays: number;
    lastActivityAt: Date | null;
    estimatedDays: number | null;
    overview: string | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    groupId: string | null;
    isPublic?: boolean;
}

export interface PathfinderGroup {
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
    description: string | null;
    order: number;
    _count?: { goals: number };
}

export interface SubGoalResources {
    videos: { 
        url: string; 
        duration: string; 
        description?: string 
    }[];
    documentations: { 
        url: string; 
        type: string; 
        description?: string 
    }[];
    content: string;
    codeExamples: { 
        title: string; 
        language: string; 
        code: string; 
        explanation?: string 
    }[];
    dosDonts: { 
        dos: string[]; 
        donts: string[] 
    };
    flashcards: { 
        id: string; 
        front: string; 
        back: string; 
        hint?: string 
    }[];
}

export interface GoalUsageSummary {
    goalId: string
    pendingCredits: number
    totalInputTokens: number
    totalOutputTokens: number
    exaCalls: number
    isBlocked: boolean
    ledgerCount: number
}

export interface PathfinderStats {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTasks: number;
    completedTasks: number;
    totalQuizAnswered: number;
    totalCodingSolved: number;
    currentStreak: number;
    longestStreak: number;
}

// ==========================================
// STORE STATE
// ==========================================

interface PathfinderStoreState {
    // Data
    goals: PathfinderGoal[];
    groups: PathfinderGroup[];
    stats: PathfinderStats;
    subGoalResources: Record<string, SubGoalResources>;
    verificationAIPlan: Record<string, VerificationAIPlan>;
    goalUsage: Record<string, GoalUsageSummary>;
    
    // Loading states
    isLoading: boolean;
    isCreatingGoal: boolean;
    isCreatingGroup: boolean;
    
    // UI state
    selectedGoalId: string | null;
    createSheetOpen: boolean;
    createGroupSheetOpen: boolean;
    assignSheetOpen: boolean;
    
    // Actions - Initialize
    initialize: (goals: PathfinderGoal[], groups: PathfinderGroup[]) => void;
    
    // Actions - Goals
    addGoal: (goal: PathfinderGoal) => void;
    updateGoal: (goalId: string, data: Partial<PathfinderGoal>) => void;
    removeGoal: (goalId: string) => void;
    setGoals: (goals: PathfinderGoal[]) => void;
    
    // Actions - Groups
    addGroup: (group: PathfinderGroup) => void;
    updateGroup: (groupId: string, data: Partial<PathfinderGroup>) => void;
    removeGroup: (groupId: string) => void;
    setGroups: (groups: PathfinderGroup[]) => void;
    
    // Actions - Assignment
    assignGoalToGroup: (goalId: string, groupId: string | null) => void;
    
    // Actions - Stats
    updateStats: () => void;

    // Actions - SubGoal Resources (for instant display when sheet closes)
    setSubGoalResources: (subGoalId: string, resources: SubGoalResources) => void;
    getSubGoalResources: (subGoalId: string) => SubGoalResources | undefined;
    setVerificationAIPlan: (goalId: string, plan: VerificationAIPlan) => void;
    getVerificationAIPlan: (goalId: string) => VerificationAIPlan | undefined;
    setGoalUsage: (goalId: string, usage: GoalUsageSummary) => void;
    getGoalUsage: (goalId: string) => GoalUsageSummary | undefined;
    
    // Actions - UI
    setSelectedGoalId: (goalId: string | null) => void;
    setCreateSheetOpen: (open: boolean) => void;
    setCreateGroupSheetOpen: (open: boolean) => void;
    setAssignSheetOpen: (open: boolean) => void;
    setIsCreatingGoal: (creating: boolean) => void;
    setIsCreatingGroup: (creating: boolean) => void;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateStats(goals: PathfinderGoal[]): PathfinderStats {
    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.status === 'ACTIVE' || g.status === 'VERIFICATION').length;
    const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
    const totalTasks = goals.reduce((sum, g) => sum + g.totalSubGoals, 0);
    const completedTasks = goals.reduce((sum, g) => sum + g.completedSubGoals, 0);
    const totalQuizAnswered = goals.reduce((sum, g) => sum + g.totalQuizAnswered, 0);
    const totalCodingSolved = goals.reduce((sum, g) => sum + g.totalCodingSolved, 0);
    const currentStreak = Math.max(...goals.map(g => g.streakDays), 0);
    const longestStreak = currentStreak; // Would need separate tracking for longest
    
    return {
        totalGoals,
        activeGoals,
        completedGoals,
        totalTasks,
        completedTasks,
        totalQuizAnswered,
        totalCodingSolved,
        currentStreak,
        longestStreak,
    };
}

// ==========================================
// STORE IMPLEMENTATION
// ==========================================

export const usePathfinderStore = create<PathfinderStoreState>()((set, get) => ({
    // Initial state
    goals: [],
    groups: [],
    subGoalResources: {},
    verificationAIPlan: {},
    goalUsage: {},
    stats: {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalQuizAnswered: 0,
        totalCodingSolved: 0,
        currentStreak: 0,
        longestStreak: 0,
    },
    isLoading: false,
    isCreatingGoal: false,
    isCreatingGroup: false,
    selectedGoalId: null,
    createSheetOpen: false,
    createGroupSheetOpen: false,
    assignSheetOpen: false,
    
    // Initialize
    initialize: (goals, groups) => {
        set({
            goals,
            groups,
            stats: calculateStats(goals),
            isLoading: false,
        });
    },
    
    // Goal actions
    addGoal: (goal) => {
        set((state) => {
            const newGoals = [goal, ...state.goals];
            return {
                goals: newGoals,
                stats: calculateStats(newGoals),
            };
        });
    },
    
    updateGoal: (goalId, data) => {
        set((state) => {
            const newGoals = state.goals.map((g) =>
                g.id === goalId ? { ...g, ...data } : g
            );
            return {
                goals: newGoals,
                stats: calculateStats(newGoals),
            };
        });
    },
    
    removeGoal: (goalId) => {
        set((state) => {
            const newGoals = state.goals.filter((g) => g.id !== goalId);
            return {
                goals: newGoals,
                stats: calculateStats(newGoals),
            };
        });
    },
    
    setGoals: (goals) => {
        set({
            goals,
            stats: calculateStats(goals),
        });
    },
    
    // Group actions
    addGroup: (group) => {
        set((state) => ({
            groups: [...state.groups, group],
        }));
    },
    
    updateGroup: (groupId, data) => {
        set((state) => ({
            groups: state.groups.map((g) =>
                g.id === groupId ? { ...g, ...data } : g
            ),
        }));
    },
    
    removeGroup: (groupId) => {
        set((state) => ({
            groups: state.groups.filter((g) => g.id !== groupId),
            // Also unassign goals from this group
            goals: state.goals.map((g) =>
                g.groupId === groupId ? { ...g, groupId: null } : g
            ),
        }));
    },
    
    setGroups: (groups) => {
        set({ groups });
    },
    
    // Assignment
    assignGoalToGroup: (goalId, groupId) => {
        set((state) => {
            // Update goals
            const newGoals = state.goals.map((g) =>
                g.id === goalId ? { ...g, groupId } : g
            );
            
            // Update group counts
            const newGroups = state.groups.map((group) => {
                const goalsInGroup = newGoals.filter((g) => g.groupId === group.id).length;
                return { ...group, _count: { goals: goalsInGroup } };
            });
            
            return { goals: newGoals, groups: newGroups };
        });
    },
    
    // Stats
    updateStats: () => {
        set((state) => ({
            stats: calculateStats(state.goals),
        }));
    },

    // SubGoal Resources
    setSubGoalResources: (subGoalId, resources) => {
        set((state) => ({
            subGoalResources: {
                ...state.subGoalResources,
                [subGoalId]: resources,
            },
        }));
    },
    getSubGoalResources: (subGoalId) => get().subGoalResources[subGoalId],
    setVerificationAIPlan: (goalId, plan) => {
        set((state) => ({
            verificationAIPlan: {
                ...state.verificationAIPlan,
                [goalId]: plan,
            },
        }));
    },
    getVerificationAIPlan: (goalId) => get().verificationAIPlan[goalId],
    setGoalUsage: (goalId, usage) => {
        set((state) => ({
            goalUsage: { ...state.goalUsage, [goalId]: usage },
        }));
    },
    getGoalUsage: (goalId) => get().goalUsage[goalId],
    
    // UI actions
    setSelectedGoalId: (goalId) => set({ selectedGoalId: goalId }),
    setCreateSheetOpen: (open) => set({ createSheetOpen: open }),
    setCreateGroupSheetOpen: (open) => set({ createGroupSheetOpen: open }),
    setAssignSheetOpen: (open) => set({ assignSheetOpen: open }),
    setIsCreatingGoal: (creating) => set({ isCreatingGoal: creating }),
    setIsCreatingGroup: (creating) => set({ isCreatingGroup: creating }),
}));

// ==========================================
// SELECTORS
// ==========================================

export const usePathfinderGoals = () => usePathfinderStore((state) => state.goals);
export const usePathfinderGroups = () => usePathfinderStore((state) => state.groups);
export const usePathfinderStats = () => usePathfinderStore((state) => state.stats);

export const useGroupedGoals = () => usePathfinderStore((state) => {
    const { goals, groups } = state;
    const ungrouped = goals.filter((g) => !g.groupId);
    const grouped = groups.map((group) => ({
        group,
        goals: goals.filter((g) => g.groupId === group.id),
    }));
    return { ungrouped, grouped };
});

export const useGoalsByStatus = () => usePathfinderStore((state) => {
    const { goals } = state;
    return {
        active: goals.filter((g) => g.status === 'ACTIVE'),
        verification: goals.filter((g) => g.status === 'VERIFICATION'),
        completed: goals.filter((g) => g.status === 'COMPLETED'),
        failed: goals.filter((g) => g.status === 'FAILED'),
        abandoned: goals.filter((g) => g.status === 'ABANDONED'),
    };
});
