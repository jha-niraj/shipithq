/*
 * The reasons a report can give, per kind of target (plan/hiring-rounds HR-24,
 * Niraj 2026-09-26: a short list plus an optional note). No imports, so the
 * shared UI can read it.
 */

export type ReportTargetKind = "COMPANY" | "JOB" | "MESSAGE" | "STUDENT"

export const REPORT_REASONS: Record<ReportTargetKind, { value: string; label: string }[]> = {
    COMPANY: [
        { value: "FAKE", label: "Not a real company, or pretending to be one" },
        { value: "MISLEADING", label: "Misleading information" },
        { value: "SCAM", label: "A scam, or asks for money" },
        { value: "DISCRIMINATION", label: "Discrimination" },
        { value: "OTHER", label: "Something else" },
    ],
    JOB: [
        { value: "NOT_HIRING", label: "Not a real opening" },
        { value: "MISLEADING", label: "Misleading role, pay or location" },
        { value: "SCAM", label: "A scam, or asks for money" },
        { value: "DISCRIMINATION", label: "Discrimination" },
        { value: "OTHER", label: "Something else" },
    ],
    MESSAGE: [
        { value: "HARASSMENT", label: "Harassment or abuse" },
        { value: "SPAM", label: "Spam" },
        { value: "SCAM", label: "A scam, or asks for money" },
        { value: "DISCRIMINATION", label: "Discrimination" },
        { value: "INAPPROPRIATE", label: "Inappropriate" },
        { value: "OTHER", label: "Something else" },
    ],
    STUDENT: [
        { value: "CHEATING", label: "Suspected cheating on a round" },
        { value: "FAKE_PROFILE", label: "Fake or misleading profile" },
        { value: "HARASSMENT", label: "Harassment or abuse" },
        { value: "SPAM", label: "Spam" },
        { value: "OTHER", label: "Something else" },
    ],
}

export const REPORT_DETAILS_MAX = 1000

export const TARGET_LABEL: Record<ReportTargetKind, string> = { COMPANY: "Company", JOB: "Job", MESSAGE: "Message", STUDENT: "Student" }

export function reasonLabel(kind: ReportTargetKind, value: string): string {
    return REPORT_REASONS[kind].find((r) => r.value === value)?.label ?? value
}
