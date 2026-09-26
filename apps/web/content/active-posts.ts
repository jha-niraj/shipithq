// Manual publish gate for blog posts.
//
// A post's markdown + metadata can exist in `blog.ts` / `content/posts/*.md` and be fully
// finished, but it only becomes PUBLIC (listed on /blogs, indexed, included in sitemap.xml
// and llms.txt) once its slug is added here. This lets posts be written in batches and
// rolled out on a schedule without a deploy backlog.
//
// Posts NOT listed here still render as real pages - so internal links between posts never
// 404 - but are `noindex` and hidden from every listing until their turn.
//
// To activate the next post: append its slug (do not reorder) and deploy.
export const ACTIVE_BLOG_SLUGS: readonly string[] = [
    // ─── Interview Prep ───
    'star-method-interview-software-engineers',
    'behavioral-interview-questions-software-engineer',
    'questions-to-ask-interviewer-software-engineer',
    'system-design-interview-prep',
    'mock-technical-interview-guide',
    // ─── DSA & Practice ───
    'dsa-study-plan-coding-interview',
    'leetcode-alternatives',
    // ─── Resume & Applications ───
    'ats-resume-software-engineer',
    'software-engineer-cover-letter',
    // ─── Career ───
    'how-to-become-a-software-engineer',
    'full-stack-developer-roadmap',
    'software-engineer-career-path',
    'new-grad-software-engineer-jobs',
    'campus-placement-preparation-guide',
    // ─── Portfolio & Open Source ───
    'software-engineering-portfolio-guide',
    'open-source-contribution-beginners',
    // ─── AI & Developer Tools ───
    'ai-tools-developers-2025',

    // ─── Added 2026-08-21: filling the thin clusters ───
    // DSA went from 2 posts to 6, portfolio from 1 to 4, resume from 2 to 4, ai-tools
    // from 1 to 3, open-source from 1 to 2. The strategy is in plan/web/seo/overview.md:
    // compete on specificity, not coverage - 17 posts is a rounding error against
    // GeeksforGeeks, so every one of these targets a query where a generic answer is
    // unsatisfying.
    'coding-interview-patterns',
    'dynamic-programming-interview-guide',
    'big-o-notation-explained',
    'how-to-approach-coding-interview-problems',
    'technical-phone-screen-guide',
    'software-engineer-resume-bullet-points',
    'linkedin-profile-software-engineer',
    'portfolio-project-ideas-software-engineer',
    'deploy-your-portfolio-project',
    'github-profile-software-engineer',
    'open-source-for-your-resume',
    'learning-to-code-with-ai',
    'ai-resume-screening-explained',
    // ─── Hiring (for companies, REV-83) ───
    'technical-interview-process-design',
    'pass-marks-technical-assessments',
    'work-sample-vs-take-home-assignment',
    'structured-interviews-engineering-hiring',
    'hiring-junior-engineers-without-resume-filter',
    // ─── Placements (for universities, REV-31) ───
    'placement-season-plan',
    'placement-readiness-metrics',
    'mock-interviews-at-scale',
    'project-based-learning-cs',
    'campus-recruiting-what-companies-want',
]
