/*
 * A member's job title as people pick it ("Head of HR") against the `job_title`
 * enum on company_member (plan/hiring-ui HU-14, HU-21). Anything the enum doesn't
 * name is OTHER with the person's own words in `jobTitleCustom`. Client-safe.
 */

export type MemberTitleEnum =
    | "CEO" | "CTO" | "COFOUNDER" | "VP_ENGINEERING" | "ENGINEERING_MANAGER" | "HR_HEAD" | "HR_MANAGER"
    | "TALENT_ACQUISITION" | "RECRUITER" | "HIRING_MANAGER" | "TECH_LEAD" | "INTERVIEWER" | "OTHER"

const TO_ENUM: Record<string, Exclude<MemberTitleEnum, "OTHER">> = {
    ceo: "CEO", founder: "CEO", ceofounder: "CEO", cto: "CTO", cofounder: "COFOUNDER", vpengineering: "VP_ENGINEERING",
    engineeringmanager: "ENGINEERING_MANAGER", headofhr: "HR_HEAD", hrhead: "HR_HEAD", hrmanager: "HR_MANAGER",
    talentacquisition: "TALENT_ACQUISITION", recruiter: "RECRUITER", hiringmanager: "HIRING_MANAGER", techlead: "TECH_LEAD",
    interviewer: "INTERVIEWER",
}

export const MEMBER_TITLE_WORDS: Record<Exclude<MemberTitleEnum, "OTHER">, string> = {
    CEO: "CEO", CTO: "CTO", COFOUNDER: "Co-founder", VP_ENGINEERING: "VP Engineering", ENGINEERING_MANAGER: "Engineering Manager",
    HR_HEAD: "Head of HR", HR_MANAGER: "HR Manager", TALENT_ACQUISITION: "Talent Acquisition", RECRUITER: "Recruiter",
    HIRING_MANAGER: "Hiring Manager", TECH_LEAD: "Tech Lead", INTERVIEWER: "Interviewer",
}

/** "Head of HR" to HR_HEAD; "Chief of Staff" to OTHER with its words kept. */
export function titleToEnum(title: string): { jobTitle: MemberTitleEnum; jobTitleCustom: string | null } {
    const words = title.replace(/\s+/g, " ").trim().slice(0, 60)
    const known = TO_ENUM[words.toLowerCase().replace(/[^a-z]/g, "")]
    return known ? { jobTitle: known, jobTitleCustom: null } : { jobTitle: "OTHER", jobTitleCustom: words || null }
}
