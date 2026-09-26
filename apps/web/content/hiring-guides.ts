/**
 * The slugs of the hiring guides (plan/web/revamp REV-83), in a tiny module of their
 * own so the navbar (a client component) can tell a hiring post from a student post
 * without importing the whole blog catalogue. Keep in step with the 'hiring' category
 * in content/blog.ts.
 */
export const HIRING_GUIDE_SLUGS: readonly string[] = [
    'technical-interview-process-design',
    'pass-marks-technical-assessments',
    'work-sample-vs-take-home-assignment',
    'structured-interviews-engineering-hiring',
    'hiring-junior-engineers-without-resume-filter',
]

/**
 * The scene on each guide's card (REV-94): what the guide is about, drawn with the same
 * animated scenes as the rest of the site. Typed loosely here so this file stays free
 * of component imports; the values are ArtKind ids from components/marketing/card-art.
 */
export const HIRING_GUIDE_ART: Record<string, string> = {
    'technical-interview-process-design': 'hire-pipelines',
    'pass-marks-technical-assessments': 'compare',
    'work-sample-vs-take-home-assignment': 'projects',
    'structured-interviews-engineering-hiring': 'mock',
    'hiring-junior-engineers-without-resume-filter': 'hire-candidates',
}
