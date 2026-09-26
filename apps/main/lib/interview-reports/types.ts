/*
 * What a student can say an interview round was, and the outcomes
 * (plan/competition/skillmeet CMP-1). Shared by the report action, the sheet and
 * the admin queue; no imports, so the client can read it.
 */

export const REPORT_ROUND_TYPES = [
    "ONLINE_ASSESSMENT", "APTITUDE", "DSA", "LLD", "SYSTEM_DESIGN", "TAKE_HOME", "TECHNICAL", "BEHAVIOURAL", "HIRING_MANAGER", "HR", "OTHER",
] as const
export type ReportRoundType = (typeof REPORT_ROUND_TYPES)[number]

export const REPORT_ROUND_LABEL: Record<ReportRoundType, string> = {
    ONLINE_ASSESSMENT: "Online assessment",
    APTITUDE: "Aptitude test",
    DSA: "Coding (DSA)",
    LLD: "Low-level design",
    SYSTEM_DESIGN: "System design",
    TAKE_HOME: "Take-home assignment",
    TECHNICAL: "Technical interview",
    BEHAVIOURAL: "Behavioural",
    HIRING_MANAGER: "Hiring manager",
    HR: "HR",
    OTHER: "Other",
}

export const REPORT_OUTCOMES = ["OFFER", "REJECTED", "NO_RESPONSE", "WITHDREW", "IN_PROCESS"] as const
export type ReportOutcome = (typeof REPORT_OUTCOMES)[number]

export const REPORT_OUTCOME_LABEL: Record<ReportOutcome, string> = {
    OFFER: "Got an offer",
    REJECTED: "Not selected",
    NO_RESPONSE: "Never heard back",
    WITHDREW: "I withdrew",
    IN_PROCESS: "Still in process",
}

/** The role groups reports are counted in (CMP-2, decisions round 4). */
export const REPORT_ROLE_FAMILIES = ["SOFTWARE", "FRONTEND", "BACKEND", "FULL_STACK", "MOBILE", "DATA_ML", "DEVOPS_SRE", "QA", "PRODUCT", "DESIGN", "OTHER"] as const
export type ReportRoleFamily = (typeof REPORT_ROLE_FAMILIES)[number]
export const REPORT_ROLE_FAMILY_LABEL: Record<ReportRoleFamily, string> = {
    SOFTWARE: "Software engineer",
    FRONTEND: "Frontend",
    BACKEND: "Backend",
    FULL_STACK: "Full stack",
    MOBILE: "Mobile",
    DATA_ML: "Data / ML",
    DEVOPS_SRE: "DevOps / SRE",
    QA: "QA",
    PRODUCT: "Product",
    DESIGN: "Design",
    OTHER: "Other",
}

export const REPORT_LEVELS = ["INTERN", "ENTRY", "MID", "SENIOR"] as const
export type ReportLevel = (typeof REPORT_LEVELS)[number]
export const REPORT_LEVEL_LABEL: Record<ReportLevel, string> = { INTERN: "Intern", ENTRY: "Entry", MID: "Mid", SENIOR: "Senior" }
