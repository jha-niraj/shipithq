import {
    BookOpen, Briefcase, CheckCircle2, Code2, FileText, FolderKanban, GraduationCap, Lightbulb, ListChecks,
    Mic, Send, Siren, Target, Trophy, Users, Zap, type LucideIcon,
} from "lucide-react";

/*
 * Every activity type in words and as an icon (plan/progress): the day sheet on Home and
 * the progress report both label entries with it.
 */

/** What each recorded activity type is, in words and as an icon. Unknown types read as "Activity". */
export const KIND: Record<string, { label: string; icon: LucideIcon }> = {
    COMPLETED_PRACTICE_SESSION: { label: "Practice", icon: Code2 },
    COMPLETED_DAILY_CHALLENGE: { label: "Daily challenge", icon: Code2 },
    DAILY_QUIZ_COMPLETED: { label: "Daily quiz", icon: ListChecks },
    PROJECT_SUBMISSION: { label: "Project", icon: FolderKanban },
    COMPLETED_MOCK_INTERVIEW: { label: "Mock interview", icon: Mic },
    STARTED_INTERVIEW: { label: "Interview", icon: Mic },
    CREATED_PEER_TO_PEER_MOCK_INTERVIEW: { label: "Peer mock", icon: Mic },
    LEARN_COMPLETED: { label: "Learning", icon: GraduationCap },
    STUDIO_CREATED: { label: "Studio", icon: BookOpen },
    STUDIO_UPDATED: { label: "Studio", icon: BookOpen },
    PATHFINDER_GOAL_STARTED: { label: "Pathfinder", icon: Target },
    PATHFINDER_GOAL_COMPLETED: { label: "Pathfinder", icon: Target },
    COMPLETED_GOAL_DAY: { label: "Pathfinder", icon: Target },
    ASSESSMENT_PASSED: { label: "Assessment", icon: CheckCircle2 },
    SHARED_ACHIEVEMENT: { label: "Achievement", icon: Trophy },
    JOINED_SPACE: { label: "Community", icon: Users },
    POSTED_IN_SPACE: { label: "Community", icon: Users },
    COMMENTED_IN_SPACE: { label: "Community", icon: Users },
    COMPLETED_SPACE_STEP: { label: "Community", icon: Users },
    FOLLOWING_USER: { label: "Community", icon: Users },
    CONTRIBUTED_TO_OPEN_SOURCE: { label: "Open source", icon: Code2 },
    PROJECT_TASK_COMPLETED: { label: "Project", icon: FolderKanban },
    PROJECT_COMPLETED: { label: "Project", icon: FolderKanban },
    PROJECT_QUIZ_COMPLETED: { label: "Project quiz", icon: ListChecks },
    PROJECT_MOCK_COMPLETED: { label: "Project mock", icon: Mic },
    PATHFINDER_STEP_COMPLETED: { label: "Pathfinder", icon: Target },
    PATHFINDER_QUIZ_COMPLETED: { label: "Pathfinder quiz", icon: ListChecks },
    PATHFINDER_CODING_PASSED: { label: "Pathfinder", icon: Code2 },
    INCIDENT_CHECK_ANSWERED: { label: "Incident", icon: Siren },
    INCIDENT_ROUND_COMPLETED: { label: "Incident", icon: Siren },
    INCIDENT_CASE_COMPLETED: { label: "Incident", icon: Siren },
    INCIDENT_REPORT_READY: { label: "Incident report", icon: Siren },
    INCIDENT_MOCK_COMPLETED: { label: "Incident talk", icon: Mic },
    HIRING_ROUND_SUBMITTED: { label: "Round", icon: Briefcase },
    HIRING_ROUND_SCORED: { label: "Round", icon: Briefcase },
    HIRING_RESULTS_SENT: { label: "Results sent", icon: Send },
    REFERRAL_REQUESTED: { label: "Referral", icon: Briefcase },
    JOB_SAVED: { label: "Saved job", icon: Briefcase },
    JOB_IMPORTED: { label: "Imported job", icon: Briefcase },
    RESUME_CREATED: { label: "Resume", icon: FileText },
    COVER_LETTER_CREATED: { label: "Cover letter", icon: FileText },
    KNOWME_ACTIVATED: { label: "KnowMe", icon: Users },
    IDEA_VOTED: { label: "Ideas", icon: Lightbulb },
    INTERVIEW_REPORTED: { label: "Interview report", icon: FileText },
    FEEDBACK_SUBMITTED: { label: "Ideas", icon: Lightbulb },
};

export function kindOf(type: string) {
    return KIND[type] ?? { label: "Activity", icon: Zap };
}

