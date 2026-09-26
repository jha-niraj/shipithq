/**
 * The slugs of the placement guides for universities (plan/web/revamp REV-31), in a tiny
 * module of their own so client components can tell a placements post from a student post
 * without importing the whole blog catalogue. Keep in step with the 'placements' category
 * in content/blog.ts.
 */
export const UNI_GUIDE_SLUGS: readonly string[] = [
    'placement-season-plan',
    'placement-readiness-metrics',
    'mock-interviews-at-scale',
    'project-based-learning-cs',
    'campus-recruiting-what-companies-want',
]

/**
 * The scene on each guide's card: what the guide is about, drawn with the same animated
 * scenes as the rest of the site. Typed loosely here so this file stays free of component
 * imports; the values are ArtKind ids from components/marketing/card-art.
 */
export const UNI_GUIDE_ART: Record<string, string> = {
    'placement-season-plan': 'uni-placements',
    'placement-readiness-metrics': 'uni-analytics',
    'mock-interviews-at-scale': 'uni-faculty',
    'project-based-learning-cs': 'uni-classes',
    'campus-recruiting-what-companies-want': 'uni-placements',
}
