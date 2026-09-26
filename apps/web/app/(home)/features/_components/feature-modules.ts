/**
 * What the product does, one entry per module that a signed-in user can actually reach.
 *
 * ── Every line here is evidence, not marketing ──
 *
 * `01-content-truth.md` exists because the landing page sold a notes module with spaced
 * repetition that had been deleted from the app. The rule that came out of it: a claim
 * ships only if there is a route, an action or a constant behind it, and the evidence goes
 * in the file next to the claim.
 *
 * So each module carries an `evidence` line naming where it was checked. When a module is
 * removed from the app, this file is what makes the marketing site's version of the truth
 * findable in one grep instead of thirteen.
 *
 * ── `scope` is not a disclaimer, it is the point ──
 *
 * Every module states what it does NOT do. That is the honest scope line the plan asks
 * for, and it is also the most useful sentence on the page: a reader deciding between this
 * and a course wants to know it is a practice environment and not a set of video lessons
 * BEFORE they sign up, not after.
 *
 * Parked modules (KnowMe, Pathfinder) are absent on purpose. Their routes still exist but
 * they are hidden from the app's own navigation, and a feature page that lists something
 * the app will not show you is the same failure in a new place.
 */

export interface FeatureModule {
    /** Anchor id. The nav dropdown deep-links to these, so they are part of the API. */
    id: string
    name: string
    /** One line. What this is, said plainly enough to be quoted back. */
    summary: string
    /** The two or three paragraphs of the section body. */
    body: readonly string[]
    /** Concrete capabilities. Each is checkable. */
    points: readonly string[]
    /** What it deliberately does not do. */
    scope: string
    /**
     * Where the claim was verified. **INTERNAL. Never rendered.**
     *
     * Kept in the data so the claim and its proof live in one place and a reviewer can
     * check every module in one read. It is not shown to visitors: a repository path
     * proves nothing to somebody who cannot open the repository, and publishing our
     * directory layout is a cost with no matching benefit.
     */
    evidence: string
    /** Credit costs, where the module has any. Empty when nothing here is metered. */
    costs?: readonly { label: string; credits: number }[]
}

export const FEATURE_MODULES: readonly FeatureModule[] = [
    {
        id: 'practice',
        name: 'Practice',
        summary: 'Four tracks, and code that runs on a real machine instead of being marked by a regex.',
        body: [
            'Practice is split into four tracks: DSA, system design, web frontend and web backend. You pick a track, you get a set, and you write the answer.',
            'The part worth caring about is what happens when you press run. Your code is sent to a Linux container that exists for that execution and is thrown away afterwards - a real filesystem, a real process, real compiler errors. Not a sandbox that pattern-matches your answer against an expected string.',
            'That is why the compiler messages you get are the compiler\'s own. If g++ says you shadowed a variable on line 14, that is g++ talking, not a checker approximating it.',
        ],
        points: [
            'DSA, system design, web frontend and web backend tracks',
            'JavaScript, TypeScript, Python 3, C, C++ and Java',
            'Server-side execution in a container built per run',
            'Real compiler and runtime output, not matched strings',
        ],
        scope: 'It is a place to practise, not a course. There are no video lessons, no curriculum to complete and nothing that issues a certificate.',
        evidence: 'apps/main/app/(main)/practice/{dsa,system-design,web-frontend,web-backend}; runtimes from apps/shipitworker\'s Dockerfile',
        costs: [{ label: 'A practice set', credits: 5 }, { label: 'An exam set', credits: 10 }],
    },
    {
        id: 'projects',
        name: 'Projects',
        summary: 'A brief to build against, then questions about the thing you actually built.',
        body: [
            'Most portfolio advice ends at "build three projects". The hard parts are choosing something worth building and being able to defend it afterwards, and those are the two this module takes on.',
            'You start from a generated brief, or bring your own. When it is built, the quiz and the mock interview are generated from your project rather than from a question bank - so they ask why you chose the database you chose, not what a hash map is.',
            'That is the difference between a project on your CV and a project you can be interviewed about.',
        ],
        points: [
            'Generated briefs, or bring a project you already have',
            'A quiz written from your own project',
            'A mock interview about what you built and why',
            'Browse what other people have shipped',
        ],
        scope: 'Single-user. There are no teams, no shared workspaces and no collaborators - the multiplayer parts were removed from the product and are not coming back in this version.',
        evidence: 'apps/main/app/(main)/projects/{ideas,myprojects,allprojects}; prices in apps/main/lib/credits/pricing.ts',
        costs: [{ label: 'Project quiz', credits: 25 }, { label: 'Project mock interview', credits: 30 }],
    },
    {
        id: 'mock',
        name: 'Mock interviews',
        summary: 'A voice interview you can take at 1am, which is the point.',
        body: [
            'The reason people arrive at a real interview having never said their answer out loud is that arranging a mock takes another person, a shared calendar and a favour. So it does not happen, and the first time the answer leaves your mouth is the time it counts.',
            'This one needs none of that. You talk, it listens, it asks the follow-up.',
        ],
        points: [
            'Voice, not a text chat pretending to be an interview',
            'Follow-up questions based on what you said',
            'No scheduling and nobody to owe a favour to',
        ],
        scope: 'One mode: voice. There is no whiteboard round, no panel and no live coding inside the mock interview - practice covers the coding.',
        evidence: 'apps/main/app/(main)/mock/voice',
    },
    {
        id: 'ai',
        name: 'AI tools',
        summary: 'Resume and cover letter tools that read your actual resume rather than a template.',
        body: [
            'Upload a resume once and it is parsed and kept. Everything else in this section works from that, which is why the output does not read like a template with your name pasted in.',
            'Tailoring against a job description rewrites your existing bullets to match what the posting asks for. The ATS score tells you what an automated screen extracts from your file - which, for a two-column resume with a skills bar, is usually not what you think.',
        ],
        points: [
            'Resume upload and parsing, free',
            'ATS score against what a parser actually extracts',
            'Tailor your resume to a specific job description',
            'Cover letters generated from your resume and the posting',
            'Likely interview questions pulled from a job description',
        ],
        scope: 'These edit and score your resume. They do not apply to jobs for you, and nothing here writes anything to your behalf without you pressing the button.',
        evidence: 'apps/main/app/(main)/ai/{resume,coverletter}; interview prep is a Pathfinder goal - see plan/interview-prep/; prices in apps/main/lib/credits/pricing.ts',
        costs: [
            { label: 'Parse an uploaded resume', credits: 0 },
            { label: 'ATS score', credits: 5 },
            { label: 'Tailor to a job description', credits: 20 },
            { label: 'Cover letter', credits: 15 },
            { label: 'Questions from a posting', credits: 5 },
        ],
    },
    {
        id: 'jobs',
        name: 'Jobs',
        summary: 'Browse roles, save the ones worth a real application, and keep track of where you applied.',
        body: [
            'The application tracker most people use is a spreadsheet that stops being updated in week three. This is the same job in the same place as the resume you are tailoring and the interview you are practising for.',
            'Roles are scored against your profile, and the tracker uses that score: apply to something well below your match and it says so before you send it rather than after you are ghosted.',
            'Browse, save, follow companies you want to hear from, and see the state of everything you have sent.',
        ],
        points: [
            'Browse and filter open roles',
            'A match score against your profile, with the skills you are missing',
            'Save roles to come back to',
            'Follow companies',
            'Take a company\'s interview rounds, send the results when you choose, and track every send in My rounds',
        ],
        scope: 'It surfaces, scores and tracks roles. It does not auto-apply on your behalf, and it is not a recruiter.',
        evidence: 'apps/main/app/(jobs)/jobs/{browse,saved,rounds,following}; match scores from the jobRecommendations table in packages/db/src/schema/jobs.ts; sends in apps/main/lib/hiring/send.ts',
    },
    {
        id: 'credits',
        name: 'Credits',
        summary: 'You pay for the expensive things when you run them, and for nothing while you are not.',
        body: [
            'There is no subscription. Operations that cost real money to run - a model generating a cover letter, a container compiling your code - cost credits. Reading, browsing and organising cost nothing.',
            'You start with 100 credits, and they do not expire. Nobody is charged for a month they did not use the product.',
        ],
        points: [
            '100 credits when you sign up',
            'Credits never expire',
            'No subscription and no monthly minimum',
            'Free operations are genuinely free, not trial-limited',
        ],
        scope: 'Credits are for the metered operations listed against each module above. Everything not listed there costs nothing to use.',
        evidence: 'SIGNUP_GRANT_CREDITS = 100 in apps/main/lib/credits/grant.ts; no expiry logic exists anywhere in the credits module',
    },
] as const
