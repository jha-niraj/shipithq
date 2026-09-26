/**
 * Interview Config Actions Module
 * 
 * Re-exports all interview configuration server actions.
 * 
 * Usage:
 * import { createInterviewProcess, addInterviewRound } from "@/actions/interview-config"
 */

// Re-export types
export type { InterviewRoundInput, InterviewProcessInput } from "@/types"

// Interview process management
export {
    getInterviewProcesses, getInterviewProcess, createInterviewProcess, 
    updateInterviewProcess, deleteInterviewProcess, cloneInterviewProcess, 
    hasInterviewProcessConfigured, getInterviewProcessStats
} from "./interview-process"

// Interview round management
export {
    addInterviewRound, updateInterviewRound, deleteInterviewRound, 
    reorderInterviewRounds
} from "./interview-rounds"

// Round Templates (for form)
export {
    getRoundTemplates,
} from "./interview-templates"
