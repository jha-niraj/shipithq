/*
 * Every notification kind, and which Inbox tab it lives in on each side
 * (plan/inbox IN-2, DoD 2). No imports: the Inbox UI reads it on the client.
 * Adding a kind means adding a line here; a kind missing from the table
 * shows under All only.
 */

export const STUDENT_TABS = ["all", "companies", "rounds", "updates"] as const
export const COMPANY_TABS = ["all", "candidates", "results", "team"] as const
export type StudentTab = (typeof STUDENT_TABS)[number]
export type CompanyTab = (typeof COMPANY_TABS)[number]

export const TAB_LABELS: Record<StudentTab | CompanyTab, string> = {
    all: "All",
    companies: "Companies",
    rounds: "Rounds",
    updates: "Updates",
    candidates: "Candidates",
    results: "Results",
    team: "Team",
}

export type InboxKind =
    // Student side
    | "MESSAGE_FROM_COMPANY"
    | "INVITED"
    | "DECLINED"
    | "OUTCOME"
    | "ROUND_SCORED"
    | "SEND_VIEWED"
    | "COMPANY_PUBLISHED"
    | "COMPANY_REQUEST_REJECTED"
    | "PRACTICE_REMINDER"
    // Company side
    | "MESSAGE_FROM_STUDENT"
    | "SEND_RECEIVED"
    | "SEND_WITHDRAWN"
    | "STUDENT_OUTCOME"
    | "TEAM_INVITE"
    | "MEMBER_JOINED"
    | "CLAIM_APPROVED"
    // Either
    | "REPORT_REVIEWED"
    /** An interview report was approved or rejected (plan/competition/skillmeet CMP-1). */
    | "INTERVIEW_REPORT_REVIEWED"
    /** A student asked a verified employee for a referral; and the answer (CMP-4). */
    | "REFERRAL_REQUEST"
    | "REFERRAL_ANSWERED"
    | "COMPANY_SUSPENDED"
    | "GENERAL"

export const STUDENT_KIND_TAB: Partial<Record<InboxKind, Exclude<StudentTab, "all">>> = {
    MESSAGE_FROM_COMPANY: "companies",
    INVITED: "companies",
    DECLINED: "rounds",
    OUTCOME: "rounds",
    ROUND_SCORED: "rounds",
    SEND_VIEWED: "rounds",
    COMPANY_PUBLISHED: "updates",
    COMPANY_REQUEST_REJECTED: "updates",
    PRACTICE_REMINDER: "updates",
    REPORT_REVIEWED: "updates",
    INTERVIEW_REPORT_REVIEWED: "updates",
    REFERRAL_REQUEST: "updates",
    REFERRAL_ANSWERED: "companies",
    GENERAL: "updates",
}

export const COMPANY_KIND_TAB: Partial<Record<InboxKind, Exclude<CompanyTab, "all">>> = {
    MESSAGE_FROM_STUDENT: "candidates",
    STUDENT_OUTCOME: "candidates",
    SEND_RECEIVED: "results",
    SEND_WITHDRAWN: "results",
    TEAM_INVITE: "team",
    MEMBER_JOINED: "team",
    CLAIM_APPROVED: "team",
    REPORT_REVIEWED: "team",
    COMPANY_SUSPENDED: "team",
}

/** The kinds a tab shows, for a query's `kind in (...)`. */
export function kindsForTab(side: "student" | "company", tab: string): InboxKind[] | null {
    if (tab === "all") return null
    const table = side === "student" ? STUDENT_KIND_TAB : COMPANY_KIND_TAB
    return (Object.entries(table) as [InboxKind, string][]).filter(([, t]) => t === tab).map(([k]) => k)
}

/** Initials for an actor's avatar: "Quanta Retail" -> "QR". */
export function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const s = parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : (parts[0] ?? "?").slice(0, 2)
    return s.toUpperCase()
}
