/*
 * Links from the hiring app to pages that live in the student app (a job's
 * public page, a company's public page). The student app's host comes from
 * NEXT_PUBLIC_MAIN_URL, never from window.location (CLAUDE.md).
 */
export const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL || "https://app.shipithq.com"

export const publicJobUrl = (slug: string) => `${MAIN_URL}/jobs/${slug}`
export const publicCompanyUrl = (slug: string) => `${MAIN_URL}/companies/${slug}`
