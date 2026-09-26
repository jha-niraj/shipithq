/**
 * The comparison pages, and the sourcing rules they are built under.
 *
 * ── The rule from `01-content-truth.md` ──
 *
 * > Every statement about a competitor must be checkable against something they publish,
 * > dated, with the source URL recorded next to the claim. A comparison table that
 * > overstates is a comparison table that gets screenshotted.
 *
 * That rule survived contact with reality, and it changed what these pages say.
 *
 * ── What could not be sourced, and what was done about it ──
 *
 * LeetCode serves HTTP 403 to automated fetches across their whole domain, including the
 * subscribe page and the support articles. Every price figure available for them comes
 * from third-party SEO blogs, several of which sell competing products. Those figures also
 * disagreed with each other on the date this was written.
 *
 * interviewing.io does not publish prices at all. Their own front page offers a free AI
 * interviewer and paid human sessions, and says to sign up to see what those cost
 * (interviewing.io, accessed 2026-08-20).
 *
 * So: **no page here states a competitor's price.** Not "around", not "roughly", not a
 * figure with a hedge in front of it. A price is the single most screenshotted cell in any
 * comparison table and the one most likely to be out of date within a quarter.
 *
 * ── What the pages compare instead ──
 *
 * The SHAPE of the approach, which is stable, publicly visible, and not something a vendor
 * changes on a Tuesday. A problem bank with a judge is a problem bank with a judge whatever
 * it charges. Every claim is therefore one of three kinds:
 *
 *   1. A fact about ShipItHQ, with the file it was read from.
 *   2. A property of the CATEGORY the competitor belongs to, argued rather than asserted.
 *   3. A quote from the competitor's own page, with the URL and the date it was read.
 *
 * A cell that would need a fourth kind was cut. That is why some rows say "not compared".
 *
 * ── Do not add a price row to this file ──
 *
 * If someone wants one, the work is to read the vendor's own pricing page on the day, quote
 * it, date it, and accept that it needs re-checking every quarter. Not to remember a number.
 */

export interface ComparisonRow {
    /** What is being compared. Phrase as a question a reader actually has. */
    dimension: string
    /** ShipItHQ's answer. */
    ours: string
    /** The alternative's answer, or how the category works. */
    theirs: string
    /**
     * Where this row was checked. **INTERNAL. Never rendered.**
     *
     * This used to be a visible "Checked against" column printing repository paths -
     * `apps/main/app/(main)/practice` and so on - straight onto a public marketing page.
     * The intent was transparency and the effect was publishing our internal directory
     * structure to anyone who scrolled, which tells a reader nothing they can use and
     * tells everyone else how the codebase is laid out.
     *
     * The discipline stays: no row ships without a real reference here, and a reviewer can
     * check every claim against it in one grep. It just is not the visitor's business.
     * Give the reader `learnMore` instead - a page that explains the thing.
     */
    source: string
    /** Public, and more useful than a path: where a reader can go and read about this. */
    learnMore?: { label: string; href: string }
}

/**
 * Which drawn mark represents the alternative on the generated cover.
 *
 * A drawn glyph rather than the competitor's logo: a logo is their trademark, putting it
 * on a card that argues against them invites a letter, and four of these compare a
 * CATEGORY that has no logo to borrow. See `versusImage` in `lib/og.tsx`.
 */
export type VersusGlyphKind = 'grid' | 'cap' | 'spark' | 'book' | 'people' | 'list'

export interface Comparison {
    /** URL slug. `/compare/<slug>`. */
    slug: string
    /** Display name of the alternative. */
    name: string
    /** The one-line positioning. Shown as the hero subtitle. */
    stance: string
    /** Hero title. */
    title: string
    /** The honest opening: what the alternative is genuinely good at. */
    creditWhereDue: readonly string[]
    /** The argument for using this instead, or as well. */
    argument: readonly string[]
    rows: readonly ComparisonRow[]
    /** Who should pick the alternative. A comparison with no such section is an advert. */
    pickThemIf: readonly string[]
    pickUsIf: readonly string[]
    /**
     * Vendor link, so a reader can check the claims themselves.
     *
     * Omitted for CATEGORY comparisons - a bootcamp, a CS degree, a YouTube playlist - where
     * there is no single vendor to point at. Those pages describe how the category works
     * rather than what one company does, which is both safer and more durable: a category
     * does not change its pricing on a Tuesday, and describing one cannot misrepresent a
     * named business.
     */
    vendorUrl?: string
    /** SEO description. */
    description: string
    /** The mark drawn opposite ours on the generated cover. */
    glyph: VersusGlyphKind
    /**
     * The long-form part of the page: named sections of argument, below the table.
     *
     * Added after a manual pass found these pages thin next to the rest of the site. Every
     * paragraph obeys the same sourcing rule as the rows above - a fact about us with the
     * file named, a property of the category argued rather than asserted, or a quote from
     * the vendor with a date. **No prices.**
     */
    deepDive: readonly { heading: string; body: readonly string[] }[]
    /** The questions a reader arrives with. Rendered, and emitted as FAQPage. */
    faqs: readonly { question: string; answer: string }[]
}


export const COMPARISONS: readonly Comparison[] = [
    {
        slug: 'leetcode',
        glyph: 'grid',
        name: 'LeetCode',
        title: 'ShipItHQ vs LeetCode',
        stance: 'One is a problem bank. The other is everything that happens around the problems.',
        description:
            'What a problem bank is genuinely good at, what it does not cover, and why ShipItHQ and LeetCode fit together rather than replace each other.',
        vendorUrl: 'https://leetcode.com/',
        creditWhereDue: [
            'LeetCode is very good at one thing, and it is a thing that matters: getting you ready for a 45-minute algorithmic screen where somebody asks you to solve a puzzle you have not seen before. Most large tech companies still run that interview.',
            'If that is the round you are worried about, use it. Nothing on this page argues otherwise, and ShipItHQ is not trying to be a bigger problem bank - there is no version of this where a newer product out-banks a decade-old archive.',
        ],
        argument: [
            'The gap is not in the problems. It is in everything the interview loop contains that a problem bank does not model.',
            'A judge tells you whether your answer passed. It does not ask why you chose that data structure, and no interviewer stops at "correct". It does not read your resume against the posting you are applying to. It does not make you say a system design answer out loud, which is the round most people fail having never rehearsed it once.',
            'That is the actual argument here, and it is why the two are not really substitutes. A reasonable split is that you spend half your preparation on pattern practice and the other half on the rounds nobody drills: the project you have to defend, the resume that has to survive a parser, the answer you have to speak.',
        ],
        rows: [
            {
                dimension: 'Algorithmic problem practice',
                ours: 'Four tracks - DSA, system design, web frontend, web backend',
                theirs: 'A large algorithmic problem archive, which is the category it defined',
                source: 'ours: apps/main/app/(main)/practice',
                learnMore: { label: 'Practice', href: '/features/practice' },
            },
            {
                dimension: 'Where your code runs',
                ours: 'A Linux container built for that run: Node, TypeScript, Python 3, C, C++, Java. Real compiler output',
                theirs: 'A hosted judge across a wide language list',
                source: 'ours: runtimes read from apps/shipitworker\'s Dockerfile',
                learnMore: { label: 'Practice', href: '/features/practice' },
            },
            {
                dimension: 'A project you can be interviewed about',
                ours: 'Generated briefs, then a quiz and a mock interview written from your own build',
                theirs: 'Not what a problem bank is for',
                source: 'ours: apps/main/app/(main)/projects',
                learnMore: { label: 'Projects', href: '/features/projects' },
            },
            {
                dimension: 'Spoken mock interview',
                ours: 'Voice mock, no scheduling and nobody to owe a favour to',
                theirs: 'Not what a problem bank is for',
                source: 'ours: apps/main/app/(main)/mock/voice',
                learnMore: { label: 'Mock interviews', href: '/features/mock' },
            },
            {
                dimension: 'Resume against a specific posting',
                ours: 'ATS score, tailoring to a job description, cover letters generated from your own resume',
                theirs: 'Not what a problem bank is for',
                source: 'ours: apps/main/app/(main)/ai',
                learnMore: { label: 'AI tools', href: '/features/ai' },
            },
            {
                dimension: 'Application tracking',
                ours: 'Browse, save, follow companies, track what you sent',
                theirs: 'Not what a problem bank is for',
                source: 'ours: apps/main/app/(jobs)/jobs',
                learnMore: { label: 'Jobs', href: '/features/jobs' },
            },
            {
                dimension: 'How you pay',
                ours: 'Credits, spent per operation. 100 free at signup, no expiry, no subscription',
                theirs: 'Not compared - see the note below this table',
                source: 'ours: SIGNUP_GRANT_CREDITS in apps/main/lib/credits/grant.ts',
                learnMore: { label: 'Credits', href: '/features#credits' },
            },
        ],
        pickThemIf: [
            'The algorithmic screen is the round you are worried about and you want the deepest archive of it.',
            'You want a specific company\'s tagged questions and a decade of discussion threads under each problem.',
            'You are early enough that volume of pattern practice is the bottleneck, not anything else.',
        ],
        pickUsIf: [
            'You can pass the algorithm round and still cannot explain the project on your CV.',
            'Your applications are not converting to phone screens, which is a resume problem and not a DSA problem.',
            'You have never said a system design answer out loud and your first time will otherwise be the real one.',
            'You want practice, projects, mocks, resume tooling and applications in one place rather than five tabs.',
        ],
        deepDive: [
            {
                heading: 'What a judge can and cannot tell you',
                body: [
                    'A judge answers one question: did the output match. That is a genuinely useful answer, and it is the only one it has. It cannot tell you that your solution is correct but unreadable, that you took eleven minutes to find an approach an interviewer would have expected in three, or that you never said a word while you were doing it.',
                    'Interviews score four things and correctness is one of them. The other three - how you got there, how you communicated it, and whether you verified your own work - leave no trace in a submission. That is not a criticism of problem banks; it is a description of what a submission is.',
                    'The practical consequence is that a high solve count and a failed loop are entirely compatible, which is confusing if you believe the count measures readiness. It measures one of four things.',
                ],
            },
            {
                heading: 'Where the code runs, and why it shows up in the errors',
                body: [
                    'Your code here goes to a Linux container built for that execution and destroyed afterwards. It has a real filesystem, a real process, and the actual toolchain: Node, tsx, Python 3, gcc, g++ and a JDK. That list is read off the image definition itself rather than from a feature list.',
                    'The visible difference is the errors. A hosted judge usually normalises compiler output into its own format, so a diagnostic arrives already interpreted. Here g++ speaks for itself, which matters because reading a real compiler message is a skill you need in the job and never practise if something keeps paraphrasing them for you.',
                ],
            },
            {
                heading: 'The rounds a problem bank does not model',
                body: [
                    'A full loop usually contains a recruiter screen, a technical phone screen, one or two coding rounds, a system design conversation, and a behavioural round. Problem practice prepares you for the middle of that list.',
                    'The project rounds are the ones people are least ready for, because they require defending decisions rather than producing answers. The question is not "what is a hash map", it is "why did you pick Postgres over Mongo for this, and what did that cost you". You cannot practise that against a problem set, because the subject matter has to be something you actually built.',
                    'That is the gap this fills: a brief to build against, then a quiz and a mock interview generated from your own project rather than from a bank.',
                ],
            },
            {
                heading: 'Using both, in a proportion that works',
                body: [
                    'A reasonable split for someone with a mixed loop ahead of them is roughly half on pattern-based algorithmic practice and half on everything else - the project you have to defend, the resume that has to survive a parser, the answer you have to speak.',
                    'The mistake is not using LeetCode. The mistake is using it for all of your preparation and then being surprised by a take-home, a debugging round, or a behavioural question. Our own blog says the same thing at greater length in the LeetCode alternatives guide, and that post recommends LeetCode.',
                ],
            },
        ],
        faqs: [
            { question: 'Is ShipItHQ a LeetCode alternative?', answer: 'Not really a replacement, no. LeetCode is a problem bank and this is the rounds around the problems - projects you can be interviewed about, spoken mock interviews, resume tooling and application tracking. Most people who use both keep using both.' },
            { question: 'Does ShipItHQ have as many problems as LeetCode?', answer: 'No, and it is not trying to. There is no version of this where a newer product out-banks a decade-old archive. Practice here is four tracks - DSA, system design, web frontend and web backend - organised by pattern rather than by volume.' },
            { question: 'What can ShipItHQ do that LeetCode cannot?', answer: 'Generate a project brief and then interview you about what you built, run a spoken mock interview with follow-up questions, score your resume against what an applicant tracking system actually extracts, and track your applications. None of those are what a problem bank is for.' },
            { question: 'Should I stop using LeetCode?', answer: 'No. If the 45-minute algorithmic screen is the round you are worried about, that is where to spend your evenings. Add the other preparation rather than swapping it.' },
        ],
    },
    {
        slug: 'interviewing-io',
        glyph: 'people',
        name: 'interviewing.io',
        title: 'ShipItHQ vs interviewing.io',
        stance: 'Human interviewers from big companies, versus a rehearsal room that is open at 1am.',
        description:
            'When a real senior engineer is worth booking, when an always-available rehearsal is what you need, and why most people end up wanting both.',
        vendorUrl: 'https://interviewing.io/',
        creditWhereDue: [
            'interviewing.io\'s own front page describes mock interviews conducted by senior and staff engineers from companies including Meta, Google, Amazon and OpenAI, across coding, system design, machine learning, behavioural, front-end and engineering-management rounds (interviewing.io, accessed 2026-08-20).',
            'A real senior engineer telling you what they actually thought is worth more than any generated feedback, and nothing here claims otherwise. If you can afford it before a specific onsite, book it.',
        ],
        argument: [
            'The constraint on human mocks is not quality. It is availability and cost per session, and both of those decide how many times you can do it.',
            'Preparation works by repetition. The fifth time you explain your caching decision, you explain it well; the first time, you do not. A format you book in advance and pay for per session is not one you run five times in a week, and that is the specific gap this fills.',
            'So the sensible shape is both: rehearse until the answer is fluent, then spend a human session on the thing you cannot self-assess, which is how you come across.',
        ],
        rows: [
            {
                dimension: 'Who conducts the mock',
                ours: 'AI, voice, on demand',
                theirs: 'Senior and staff engineers from large tech companies, and an AI interviewer',
                source: 'theirs: interviewing.io front page, accessed 2026-08-20',
                learnMore: { label: 'Mock interviews', href: '/features/mock' },
            },
            {
                dimension: 'Availability',
                ours: 'Immediately, as many times as you like',
                theirs: 'Booked sessions with a human; the AI interviewer is offered free',
                source: 'theirs: interviewing.io front page, accessed 2026-08-20',
                learnMore: { label: 'Mock interviews', href: '/features/mock' },
            },
            {
                dimension: 'Coding practice attached',
                ours: 'Four practice tracks with code run in a real container',
                theirs: 'Interview practice is the product; their site also offers a question bank',
                source: 'ours: apps/main/app/(main)/practice',
                learnMore: { label: 'Practice', href: '/features/practice' },
            },
            {
                dimension: 'Project work',
                ours: 'Briefs, then a quiz and mock written from what you built',
                theirs: 'Not part of what their front page describes',
                source: 'theirs: interviewing.io front page, accessed 2026-08-20',
                learnMore: { label: 'Projects', href: '/features/projects' },
            },
            {
                dimension: 'Resume and applications',
                ours: 'ATS scoring, tailoring, cover letters, application tracking',
                theirs: 'Not part of what their front page describes',
                source: 'ours: apps/main/app/(main)/ai and app/(jobs)/jobs',
                learnMore: { label: 'AI tools', href: '/features/ai' },
            },
            {
                dimension: 'How you pay',
                ours: 'Credits per operation. 100 free at signup, no expiry',
                theirs: 'Not compared - they do not publish prices publicly',
                source: 'theirs: no price stated on interviewing.io, accessed 2026-08-20',
                learnMore: { label: 'Credits', href: '/features#credits' },
            },
        ],
        pickThemIf: [
            'You have a specific onsite booked and want a human who has run that company\'s loop to tell you how you came across.',
            'You want feedback on the parts a machine is worst at judging: presence, pacing, how you handle being wrong.',
            'You are past the point where more repetition helps and need an outside read.',
        ],
        pickUsIf: [
            'You need the tenth rehearsal, not the first review, and cost per session is what is stopping you.',
            'You want the practice, the project, the resume and the applications in the same place as the mock.',
            'It is 1am the night before and there is nobody to book.',
        ],
        deepDive: [
            {
                heading: 'Rehearsal and review are different activities',
                body: [
                    'Preparation works by repetition. The fifth time you explain a caching decision you explain it well; the first time you do not, and the difference is fluency rather than knowledge. Everything about the answer was already in your head on attempt one.',
                    'A booked session with a human is a review: an outside read on how you come across, from somebody who has run the loop you are about to sit. It is the most valuable single hour available and it is not the thing you need ten of.',
                    'These are not competing products so much as different points in the same process. Rehearse until the answer is fluent, then spend a human session on the part you cannot self-assess.',
                ],
            },
            {
                heading: 'What an always-available mock is actually for',
                body: [
                    'The reason most people arrive at a real interview having never said their answer out loud is not that they think it is unnecessary. It is that arranging a mock takes another person, a shared calendar and a favour, so it does not happen.',
                    'Removing the scheduling is most of the value. A voice mock at 1am the night before an onsite is not better than a senior engineer, and it is available, which is the property that decides whether the rehearsal happens at all.',
                    'One mode - voice. There is no whiteboard round and no panel, and the coding practice lives in its own module rather than inside the interview.',
                ],
            },
            {
                heading: 'What each of us does outside the mock itself',
                body: [
                    'interviewing.io\'s own front page describes mock interviews with senior and staff engineers across coding, system design, machine learning, behavioural, front-end and engineering-management rounds, plus a free AI interviewer and dedicated coaching programmes (accessed 2026-08-20). Interview practice is the product.',
                    'Here the mock sits alongside the rest of the process: four practice tracks with code executed in a real container, project briefs that generate their own interview, ATS resume scoring and tailoring, and an application tracker with match scoring. Whether that breadth is useful depends entirely on which part of your process is weak.',
                    'If the only weak part is how you come across in an interview, breadth is not an advantage and a human session is the better hour.',
                ],
            },
        ],
        faqs: [
            { question: 'Is an AI mock interview as good as a human one?', answer: 'For feedback on how you come across, no. A senior engineer who has run that company\'s loop gives you something no generated feedback matches. For repetition until an answer is fluent, availability matters more than fidelity, and that is where an always-on mock wins.' },
            { question: 'Should I use both interviewing.io and ShipItHQ?', answer: 'That is the sensible shape for most people. Rehearse until the answer comes out cleanly, then spend a human session on the part you cannot judge yourself - your presence, your pacing, and how you handle being wrong.' },
            { question: 'What does interviewing.io cost?', answer: 'They do not publish prices publicly. Their front page offers a free AI interviewer and paid sessions with human interviewers, and directs you to sign up for details. We do not quote a figure we cannot source.' },
            { question: 'Does ShipItHQ offer interviews with real engineers?', answer: 'No. The mock interviews are AI, voice-based and available on demand. If you want a human who has run a specific company\'s loop, book one - that is a genuinely different product and we are not pretending otherwise.' },
        ],
    },

    // ── Category: a coding bootcamp ────────────────────────────────────────────
    {
        slug: 'bootcamp',
        glyph: 'cap',
        name: 'a coding bootcamp',
        title: 'ShipItHQ vs a coding bootcamp',
        stance: 'One sells structure and a cohort. The other sells repetition you can do at 1am.',
        description:
            'What a bootcamp gives you that no tool can - structure, a cohort, and someone expecting you on Monday - and the specific gap it leaves at the end.',
        creditWhereDue: [
            'A bootcamp sells three things that are genuinely hard to buy anywhere else: a curriculum somebody sequenced for you, a cohort going through it at the same time, and an obligation. Most people who fail at self-directed learning do not fail on the material. They fail on week six, alone, with nobody expecting anything.',
            'If you have tried to teach yourself and stalled twice, that is real information about what you need, and it is not a tool. Pay for the structure.',
        ],
        argument: [
            'The gap is at the end rather than in the middle. A bootcamp takes you from little to employable-shaped, and then the job search begins - and that is a different set of skills, run on a different timeline, mostly after the cohort has dispersed.',
            'The rounds that decide an offer are the ones a bootcamp can only rehearse a few times: the phone screen, the project you have to defend, the system design conversation, the resume that has to survive a parser first. Those need repetition, and repetition needs something that is available on a Tuesday night in month four.',
            'That is what this is for. It is not a replacement for the twelve weeks; it is what you do with the twelve months afterwards.',
        ],
        rows: [
            { dimension: 'Structure and sequencing', ours: 'A three-month study plan and reading paths, which you follow yourself', theirs: 'A full curriculum somebody built and sequenced', source: 'ours: the blog cluster and its reading paths', learnMore: { label: 'The study plan', href: '/blogs/dsa-study-plan-coding-interview' } },
            { dimension: 'Accountability', ours: 'None. Nobody notices if you stop', theirs: 'A cohort, deadlines, and instructors who follow up', source: 'ours: no cohort or scheduling feature exists' },
            { dimension: 'Cost shape', ours: 'Credits spent per operation, 100 free at signup, no subscription', theirs: 'A large up-front commitment, sometimes deferred', source: 'ours: the credit grant and price table' , learnMore: { label: 'Credits', href: '/features#credits' } },
            { dimension: 'Repetition after it ends', ours: 'Unlimited, on your own schedule', theirs: 'Ends when the cohort does', source: 'ours: mock interviews are on demand', learnMore: { label: 'Mock interviews', href: '/features/mock' } },
            { dimension: 'Interview-specific practice', ours: 'Phone screen, behavioural, system design and project defence, each on its own terms', theirs: 'Usually a module near the end', source: 'ours: the interview-prep cluster', learnMore: { label: 'Interview prep', href: '/blogs/topics/interview-prep' } },
            { dimension: 'Career services', ours: 'Tooling, not people. No introductions and no recruiter relationships', theirs: 'Often a real part of what you are buying', source: 'ours: there is no placement or referral feature' },
        ],
        pickThemIf: [
            'You have tried to teach yourself twice and stalled both times. That is the problem a cohort solves and a tool does not.',
            'You are changing career from outside tech and need the sequencing decided for you.',
            'The career services and the alumni network are a meaningful part of what you are paying for.',
            'You want someone to be disappointed in you when you skip a week. It works.',
        ],
        pickUsIf: [
            'You already write code and the blocker is interviews rather than knowledge.',
            'You finished a bootcamp and the job search turned out to be the hard part.',
            'A large up-front cost is not available to you and per-operation credits are.',
            'You need the tenth rehearsal of an answer, months after any cohort would have ended.',
        ],
        deepDive: [
            {
                heading: 'What twelve weeks can and cannot compress',
                body: [
                    'A bootcamp is very good at the part of learning that is sequencing. Left alone, most people learn things in the order they encounter them, which is close to random, and spend months on material that is not blocking them. A curriculum removes that failure entirely.',
                    'What twelve weeks cannot compress is the part that needs spacing. Recall a week after the fact is what tells you something went in, and no amount of intensity substitutes for the gap. That is why people finish a bootcamp confident and then discover, in an interview, that a topic from week three has evaporated.',
                    'Neither of us fixes that on its own. What helps is doing the spaced version after the intensive one, which is a use of the twelve months following a bootcamp rather than an alternative to it.',
                ],
            },
            {
                heading: 'The job search is a separate skill',
                body: [
                    'Being employable and getting hired are different problems. The second involves a resume that survives a parser, applications timed to when companies actually open requisitions, referrals asked for without awkwardness, and four distinct interview rounds each scoring something different.',
                    'Very little of that is technical, which is why an intensive technical programme is not where it gets solved. It is also why people who are clearly good enough spend six months not converting - the failure is upstream of the technical rounds and invisible from inside them.',
                ],
            },
            {
                heading: 'An honest sequence, if you are doing both',
                body: [
                    'Bootcamp first if you cannot self-direct. It buys you the structure, and the cohort is worth more in month one than any tool.',
                    'Then, in the months after: the resume, before anything else, because a resume that does not parse makes every other effort invisible. Then the project you can defend, because that is what fills a loop. Then spaced practice and rehearsal, which is the part that has to keep happening.',
                    'That ordering is not ours specifically - it is what the process actually rewards. Doing it in some other order is the most common expensive mistake after a bootcamp ends.',
                ],
            },
        ],
        faqs: [
            { question: 'Is ShipItHQ a bootcamp alternative?', answer: 'Not for someone who needs structure and accountability - a cohort solves a problem no tool does. It is a good fit for what happens after a bootcamp, when the job search turns out to be its own skill and the cohort has dispersed.' },
            { question: 'Do I need a bootcamp to get a software job?', answer: 'No, and for some people it is the highest-value thing available. The honest test is whether you have tried to self-direct and stalled. If you have, buy the structure; if you have not, try the free route first.' },
            { question: 'What does a bootcamp not prepare you for?', answer: 'Usually the job search itself: a resume that has to survive an automated parser, application timing, referrals, and four interview rounds that each score something different. Those run on a longer timeline than a cohort does.' },
            { question: 'Is ShipItHQ cheaper than a bootcamp?', answer: 'The cost shape is different rather than simply smaller. There is no up-front commitment and no subscription - you get 100 credits at signup and spend credits per operation, so the cost tracks what you actually run.' },
        ],
    },

    // ── Category: free tutorials and YouTube ───────────────────────────────────
    {
        slug: 'youtube-tutorials',
        glyph: 'book',
        name: 'free tutorials',
        title: 'ShipItHQ vs free tutorials',
        stance: 'The material has never been better or cheaper. What is missing is the part where something checks you.',
        description:
            'Free tutorials are genuinely excellent and cost nothing. The gap is not quality - it is that watching produces recognition, and interviews test retrieval.',
        creditWhereDue: [
            'The free material is extraordinary now, and it is better than most paid material was a decade ago. Whole compilers, distributed systems courses and interview curricula are on YouTube for nothing, taught by people who are very good at teaching.',
            'Anyone telling you that you need to pay to learn to code is selling something. You do not. Start free, and keep using it - almost every guide on our own blog links out to free resources rather than to our product.',
        ],
        argument: [
            'The gap is not quality and it is not coverage. It is that watching somebody solve a problem produces recognition, and every interview is a test of retrieval.',
            'Those feel identical while you are learning, which is what makes the failure mode so common. You follow along, everything makes sense, you feel like you learned it, and then a blank page in a shared editor produces nothing. Nothing in a tutorial ever asked you to produce the answer cold.',
            'So the useful thing to buy is not information. It is the feedback loop: something that makes you produce an answer, tells you whether it worked, and does it again a week later when you have half forgotten.',
        ],
        rows: [
            { dimension: 'Quality of material', ours: 'Written guides, free to read, that link out to the best free resources', theirs: 'Excellent, abundant, and free', source: 'ours: 30 published guides', learnMore: { label: 'The blog', href: '/blogs' } },
            { dimension: 'Does anything check you?', ours: 'Practice sets, generated quizzes, and scored mock interviews', theirs: 'No. Watching is the whole interaction', source: 'ours: practice and mock modules', learnMore: { label: 'Practice', href: '/features/practice' } },
            { dimension: 'Does your code run?', ours: 'In a Linux container, with the real toolchain and real compiler output', theirs: 'On your own machine, if you follow along', source: 'ours: the executor image', learnMore: { label: 'Practice', href: '/features/practice' } },
            { dimension: 'Spaced repetition', ours: 'Reading paths and a study plan built around returning to things', theirs: 'Whatever you organise yourself', source: 'ours: the topic hub reading paths', learnMore: { label: 'DSA and practice', href: '/blogs/topics/dsa' } },
            { dimension: 'Speaking an answer out loud', ours: 'Voice mock interviews, on demand', theirs: 'Not a thing a video can do', source: 'ours: the voice mock module', learnMore: { label: 'Mock interviews', href: '/features/mock' } },
            { dimension: 'Cost', ours: '100 free credits, then per operation', theirs: 'Free', source: 'ours: the credit grant' },
        ],
        pickThemIf: [
            'You are early enough that the bottleneck is genuinely knowing things, and there is a lot you have not met yet.',
            'You learn well from watching and you already have a habit of building alongside rather than only following.',
            'You are on a zero budget. This is a real constraint and free material is genuinely enough to get a long way.',
            'You want breadth quickly before deciding what to go deep on.',
        ],
        pickUsIf: [
            'Everything makes sense while you watch and nothing comes out on a blank page.',
            'You have watched more interview-prep content than you have solved problems, and you know it.',
            'You need something that asks you the question a week later, when you have half forgotten.',
            'You have never said a technical answer out loud and would like the first time not to be the real one.',
        ],
        deepDive: [
            {
                heading: 'Recognition and retrieval feel the same and are not',
                body: [
                    'Reading a solution and thinking "yes, that is right" exercises recognition. Producing that solution from an empty function exercises retrieval. Only the second one builds the ability you are tested on, and only the first one feels effortless - which is exactly why people do more of it.',
                    'This is the same mechanism that makes AI assistants risky for learners, and it is worth naming because the fix is identical in both cases: make yourself produce the answer before you look at one.',
                    'A practical version, which costs nothing: watch the setup, pause before the solution, write your own, then compare. The pause is the entire intervention.',
                ],
            },
            {
                heading: 'What a tutorial cannot do by construction',
                body: [
                    'A video cannot tell you that your approach was fine but you took eleven minutes to find it. It cannot ask a follow-up you did not anticipate. It cannot notice that you went silent for ninety seconds, which on a phone screen is the difference between a pass and a note saying you were hard to follow.',
                    'None of that is a criticism of the format. It is a description of what a one-way medium is. The rounds that decide offers are two-way, and the only preparation for a two-way thing is a two-way thing.',
                ],
            },
            {
                heading: 'The honest recommendation',
                body: [
                    'Use the free material for the material. It is better than what we write and there is more of it.',
                    'Spend money, if you spend any, on the feedback loop - the part that makes you produce an answer and tells you how it went. That is the scarce thing, and it is scarce because it costs something to provide.',
                    'Our own guide to practising algorithms recommends four free platforms before it mentions anything of ours, which is not modesty. It is what we would tell a friend.',
                ],
            },
        ],
        faqs: [
            { question: 'Can I prepare for interviews using only free resources?', answer: 'Yes, and many people do. The free material is excellent. The part that is hard to replicate for free is the feedback loop - something that makes you produce an answer cold and tells you how it went.' },
            { question: 'Why do I understand tutorials but freeze in interviews?', answer: 'Because watching builds recognition and interviews test retrieval. They feel identical while you learn, which is what makes it such a common surprise. The fix is to produce the answer before you see one - pause the video and write your own first.' },
            { question: 'Is paid interview prep worth it?', answer: 'Not for the information, which is free and abundant. It can be worth it for the feedback loop and for spaced repetition, because those cost something to provide and are the part free material structurally cannot do.' },
            { question: 'What free resources do you recommend?', answer: 'Our guide to LeetCode alternatives lists twelve, most of them free, and recommends several over anything of ours for specific purposes. The Tech Interview Handbook and the System Design Primer are both free and both excellent.' },
        ],
    },

    // ── Category: using an AI assistant directly ───────────────────────────────
    {
        slug: 'chatgpt',
        glyph: 'spark',
        name: 'an AI assistant',
        title: 'ShipItHQ vs ChatGPT',
        stance: 'One will explain anything you ask. The other runs your code, remembers your resume, and is willing to tell you no.',
        description:
            'A general assistant is cheap, fast and genuinely good at explaining. The gaps are execution, persistence and the fact that it agrees with you.',
        creditWhereDue: [
            'A general-purpose assistant is the best explainer most people have ever had access to, and it is close to free. It will answer a question at any level, in any language, at 3am, without making you feel stupid for asking.',
            'For understanding code you did not write, translating between languages, and drafting the boring parts, it is genuinely better than what we or anyone else offers. We use one constantly and we write about how to use one well.',
        ],
        argument: [
            'Three gaps, and none of them is about how clever the model is.',
            'It does not run your code on a real machine. It will tell you what it thinks your program does, which is not the same as what your program does, and the difference is where the bugs live.',
            'It does not persist anything. Every session starts from nothing, so your resume, the job you are applying for and what you got wrong last week all have to be re-explained, and in practice they are not.',
            'And it agrees with you. An assistant optimised to be helpful is a poor judge of whether your answer would pass, because "that is a reasonable approach" is almost always the locally helpful response. Preparation needs something willing to say the answer was too slow, or unclear, or that you did not verify it.',
        ],
        rows: [
            { dimension: 'Explaining a concept', ours: 'Written guides. No conversational tutor', theirs: 'Excellent, at any level, on demand', source: 'ours: the blog', learnMore: { label: 'The blog', href: '/blogs' } },
            { dimension: 'Running your code', ours: 'A Linux container with the real toolchain and real compiler output', theirs: 'Predicts the output; does not execute it', source: 'ours: the executor image', learnMore: { label: 'Practice', href: '/features/practice' } },
            { dimension: 'Remembering your context', ours: 'Your resume is stored and every tool works from it', theirs: 'Session-bound; you re-paste each time', source: 'ours: resume parsing and tailoring', learnMore: { label: 'AI tools', href: '/features/ai' } },
            { dimension: 'Willing to fail you', ours: 'Scored feedback against a rubric', theirs: 'Optimised to be helpful, which is a different thing', source: 'ours: mock interview scoring', learnMore: { label: 'Mock interviews', href: '/features/mock' } },
            { dimension: 'Spoken practice', ours: 'Voice mock interviews with follow-ups', theirs: 'Voice modes exist; the interview structure is on you', source: 'ours: the voice mock module', learnMore: { label: 'Mock interviews', href: '/features/mock' } },
            { dimension: 'Tracking what you applied to', ours: 'An application tracker with match scoring', theirs: 'Not what it is for', source: 'ours: the jobs module', learnMore: { label: 'Jobs', href: '/features/jobs' } },
        ],
        pickThemIf: [
            'You want something explained, in which case use one, and use it a lot.',
            'You are debugging and need a second reading of an error you have already formed a hypothesis about.',
            'You want a first draft of documentation, a regular expression, or a translation between languages.',
            'Your budget is zero. A free assistant plus free material genuinely gets you a long way.',
        ],
        pickUsIf: [
            'You want your code executed rather than predicted.',
            'You are tired of re-pasting your resume and the job description into a fresh session every time.',
            'You need something that will tell you an answer was not good enough, which a helpfulness-optimised assistant is bad at.',
            'You want the rehearsal, the project and the application tracking in the same place rather than in a chat log.',
        ],
        deepDive: [
            {
                heading: 'Predicting output is not running code',
                body: [
                    'Ask an assistant what a program prints and it will tell you, confidently, and usually correctly. Usually is the problem. The cases where it is wrong are exactly the cases you needed help with: the off-by-one, the integer overflow, the subtle difference between two library versions.',
                    'Here the code goes to a container with a real filesystem and the actual toolchain, so the errors are the compiler\'s own rather than a description of what the compiler probably said. Reading a real diagnostic is a skill you need in the job and never build if something keeps paraphrasing them.',
                ],
            },
            {
                heading: 'The agreeableness problem',
                body: [
                    'This is the gap that matters most for interview preparation and it is the least discussed. An assistant tuned to be useful will find something to praise in almost any answer, because in almost every context that is the right behaviour.',
                    'Preparation is one of the few contexts where it is not. The whole value of a mock interview is finding out that your answer was rambling, or that you never stated a complexity, or that you said "it depends" three times without ever landing. A scoring rubric can say that. A conversation optimised for helpfulness usually will not, and asking it to be harsh produces performed harshness rather than a consistent standard.',
                ],
            },
            {
                heading: 'Use both, and know which is which',
                body: [
                    'The dividing line we use, and write about: delegate anything where you can verify the output faster than you could produce it. Explanations, boilerplate, regular expressions, translations. Do yourself anything where verifying requires the understanding you were trying to build.',
                    'For interview preparation specifically, the rule is stricter, because every round is unassisted. Practise cold, then ask for a critique afterwards. That keeps the retrieval and adds the feedback, which is the best of both.',
                ],
            },
        ],
        faqs: [
            { question: 'Can I just use ChatGPT to prepare for interviews?', answer: 'For explanations, yes, and it is very good at them. The gaps are that it predicts your code\'s output rather than executing it, it forgets your context between sessions, and it is optimised to be helpful - which makes it a poor judge of whether an answer would actually pass.' },
            { question: 'Does using AI make you worse at interviews?', answer: 'It can, if you accept code you could not have written. Learning happens through effortful retrieval, and agreeing that generated code is correct feels like understanding while building none of the ability to produce it. Interviews are unassisted, so the gap shows up exactly where it costs most.' },
            { question: 'What can ShipItHQ do that a general AI assistant cannot?', answer: 'Execute your code in a real Linux container rather than predicting the output, work from a resume it has stored rather than one you re-paste, score a spoken mock interview against a rubric, and track what you applied to.' },
            { question: 'Should I stop using AI assistants?', answer: 'No. Use one heavily for explanation, boilerplate and reading unfamiliar code. Turn it off while practising for interviews, because the interview is a retrieval test with no assistant and practising with one trains a skill you will not have.' },
        ],
    },

    // ── Category: a computer science degree ────────────────────────────────────
    {
        slug: 'cs-degree',
        glyph: 'cap',
        name: 'a CS degree',
        title: 'ShipItHQ vs a CS degree',
        stance: 'These are not alternatives and this page will not pretend otherwise.',
        description:
            'A degree buys fundamentals, a credential and a hiring pipeline. What it does not buy is interview readiness, which is a separate and much shorter project.',
        creditWhereDue: [
            'A degree gives you things no tool can. Three or four years on the fundamentals - operating systems, networks, compilers, theory - which are the topics people skip when self-directing and then find they needed. A credential that clears filters. Campus recruiting pipelines, which are the single easiest route into a large company and are simply not open to people outside them. And in many countries, the visa and immigration paths that follow a qualification.',
            'Nothing on this site replaces any of that, and anybody telling you a subscription substitutes for a degree is selling you something. If you have the option and the means, take the degree.',
        ],
        argument: [
            'The gap is narrow and specific: a degree is not designed to make you good at interviews, and it does not accidentally do so either.',
            'Final-year students routinely discover this at placement season. They understand computer science better than the interview requires and cannot perform it under time pressure, because performing under time pressure is a distinct skill that four years of coursework never asked for.',
            'That is a short project, not a long one. It is measured in months against a degree measured in years, and it sits alongside the degree rather than in place of it.',
        ],
        rows: [
            { dimension: 'Fundamentals', ours: 'Interview-scoped: DSA, system design, web frontend and backend', theirs: 'Deep and broad - OS, networks, compilers, theory', source: 'ours: the four practice tracks', learnMore: { label: 'Practice', href: '/features/practice' } },
            { dimension: 'Credential', ours: 'None. Nothing here issues a certificate, deliberately', theirs: 'A recognised qualification that clears filters', source: 'ours: no certification feature exists' },
            { dimension: 'Hiring pipeline', ours: 'A job board and an application tracker', theirs: 'Campus recruiting, which is the easiest route into a large company', source: 'ours: the jobs module', learnMore: { label: 'Jobs', href: '/features/jobs' } },
            { dimension: 'Interview performance', ours: 'The whole point - four rounds, each on its own terms', theirs: 'Rarely taught, and not what coursework rewards', source: 'ours: the interview-prep cluster', learnMore: { label: 'Interview prep', href: '/blogs/topics/interview-prep' } },
            { dimension: 'A defensible project', ours: 'A brief, then an interview generated from what you built', theirs: 'A capstone, usually in a team, often years before you interview', source: 'ours: the projects module', learnMore: { label: 'Projects', href: '/features/projects' } },
            { dimension: 'Timescale', ours: 'Months', theirs: 'Years', source: 'ours: the three-month study plan' },
        ],
        pickThemIf: [
            'You have the option and the means. A degree opens doors that nothing here does, including some that close permanently if you skip it.',
            'You want the fundamentals properly - the topics self-directed learners consistently skip and consistently regret.',
            'Campus recruiting matters to you, which for a first job at a large company it very much should.',
            'Your immigration or visa path depends on a qualification, which for a large number of people it does.',
        ],
        pickUsIf: [
            'You are in the degree already and placement season is coming, which is exactly the moment this becomes urgent.',
            'You finished one and discovered that understanding the material and passing the interview are different things.',
            'You are not doing a degree and need the interview-shaped part without pretending you have replaced the rest.',
            'You need a project you can defend, because a group capstone from second year rarely survives a follow-up question.',
        ],
        deepDive: [
            {
                heading: 'Why strong students fail interviews',
                body: [
                    'It is not knowledge. It is that a degree tests understanding through coursework and exams, and an interview tests performance under observation - producing an approach in five minutes, narrating it while typing, and recovering when it does not work.',
                    'Those are different enough that being excellent at the first tells you very little about the second. A student who can explain amortised analysis in an exam can still go silent for two minutes on a phone screen, and the silence is what gets written down.',
                    'The fix is rehearsal rather than more study, which is unintuitive to someone whose whole training has been that more study is the answer.',
                ],
            },
            {
                heading: 'The placement season problem',
                body: [
                    'Campus processes compress everything into a few weeks and run several rounds in sequence: an aptitude test, a coding round, technical interviews covering core subjects and your projects, then HR.',
                    'The stage that eliminates the most people is usually not the coding round. It is the aptitude test, which is finite and repetitive and therefore the easiest to improve - and which students preparing entirely through DSA never touch. Core subjects are the second most under-prepared, for the same reason: they feel like revision rather than preparation.',
                    'Our campus placement guide covers the whole funnel, including the parts that are not about code. It is free to read and it does not require an account.',
                ],
            },
            {
                heading: 'What to do in each year',
                body: [
                    'Early years: build things and learn the fundamentals properly. Do not start interview preparation in first year; it is the least efficient possible use of that time and the material will not stay.',
                    'The year before placements: one project you can defend in depth, and a resume that parses. Both take weeks and both are prerequisites for everything after.',
                    'The months before: pattern practice, aptitude, core subject revision, and rehearsal out loud. That last one is the part almost nobody does and the part that separates candidates who know the same amount.',
                ],
            },
        ],
        faqs: [
            { question: 'Do I need a computer science degree to become a software engineer?', answer: 'No, and it genuinely helps. A degree clears resume filters, opens campus recruiting - the easiest route into a large company - and in many countries underpins a visa path. Without one, the substitute is demonstrable work and a longer search.' },
            { question: 'Does a CS degree prepare you for technical interviews?', answer: 'Not directly. Coursework tests understanding; interviews test performance under observation. Those are different enough that being excellent at the first predicts surprisingly little about the second, which is why strong students fail loops.' },
            { question: 'When should a student start interview preparation?', answer: 'Not in first year - the material will not stay and the time is better spent building and learning fundamentals. The year before placements for a defensible project and a resume that parses; the months before for pattern practice and rehearsal.' },
            { question: 'Is ShipItHQ a replacement for a degree?', answer: 'No, and we would not claim it. A degree buys fundamentals, a credential and a hiring pipeline. This is interview readiness, which is a months-long project that sits alongside a years-long one.' },
        ],
    },

    // ── NeetCode ───────────────────────────────────────────────────────────────
    {
        slug: 'neetcode',
        glyph: 'grid',
        name: 'NeetCode',
        title: 'ShipItHQ vs NeetCode',
        stance: 'One solves "which problems, in what order". The other covers the rounds that are not problems.',
        description:
            'NeetCode fixes the hardest thing about a problem bank: knowing what to do next. What a curation layer over a bank cannot do is the rest of the loop.',
        vendorUrl: 'https://neetcode.io/',
        creditWhereDue: [
            'NeetCode solves a real and underrated problem: a bank of thousands of problems gives you no idea what to do next, and choosing badly wastes months. Organising the classic set by pattern, with a curated list and video explanations, is exactly the intervention most people need.',
            'Our own guide to LeetCode alternatives recommends it, and that guide was written before this page existed. If your problem is "I do not know which problems to solve", this is the thing to use.',
        ],
        argument: [
            'The overlap is narrower than it looks. Pattern-first practice is genuinely the right approach and we say so at length - our patterns guide covers the same fifteen or so patterns and links out to free resources.',
            'But a curation layer over a problem bank is still a problem bank, which means it inherits the same boundary: it prepares you for the coding round and does not model the project you have to defend, the resume that has to survive a parser, or the answer you have to say out loud.',
            'The realistic split is that this is not the same category. Use a curated roadmap for the algorithms, and something else for the four other things a loop contains.',
        ],
        rows: [
            { dimension: 'Curated problem path', ours: 'A three-month plan organised by pattern, published free', theirs: 'A curated roadmap over the classic problem set', source: 'ours: the DSA study plan', learnMore: { label: 'DSA and practice', href: '/blogs/topics/dsa' } },
            { dimension: 'Video explanations', ours: 'None. Written guides only', theirs: 'A core part of what it offers', source: 'ours: no video feature exists' },
            { dimension: 'Where code executes', ours: 'A Linux container with the real toolchain', theirs: 'Practice happens against the underlying bank', source: 'ours: the executor image', learnMore: { label: 'Practice', href: '/features/practice' } },
            { dimension: 'A project you can defend', ours: 'A brief, then a quiz and mock generated from your build', theirs: 'Not what a problem roadmap is for', source: 'ours: the projects module', learnMore: { label: 'Projects', href: '/features/projects' } },
            { dimension: 'Spoken rehearsal', ours: 'Voice mocks with follow-up questions', theirs: 'Not what a problem roadmap is for', source: 'ours: the voice mock module', learnMore: { label: 'Mock interviews', href: '/features/mock' } },
            { dimension: 'Resume and applications', ours: 'ATS scoring, tailoring, and an application tracker', theirs: 'Not what a problem roadmap is for', source: 'ours: the AI tools and jobs modules', learnMore: { label: 'AI tools', href: '/features/ai' } },
        ],
        pickThemIf: [
            'Your problem is "I do not know which problems to solve next", which is the most common problem and the one it is built for.',
            'You learn well from watching a solution explained, which is a legitimate way to learn and not everyone does.',
            'You want a curated path through the classic set without paying for a full platform.',
            'The algorithmic round is the only round you are worried about.',
        ],
        pickUsIf: [
            'You can pass the algorithm round and cannot explain the project on your CV.',
            'Your applications are not converting to phone screens, which is a resume problem rather than a DSA one.',
            'You want your code to run on a real machine with the compiler\'s own errors.',
            'You want the rounds that are not problems - the spoken answer, the project defence, the application.',
        ],
        deepDive: [
            {
                heading: 'Curation is the right fix for the wrong-order problem',
                body: [
                    'The failure mode a curated roadmap solves is real. Left with a bank of thousands, most people solve whatever is popular, in whatever order they meet it, and build recall for those specific problems rather than transferable pattern recognition.',
                    'Ordering by pattern fixes that directly, and the fix is genuinely most of what somebody needs early on. We are not going to argue against it - our own patterns guide is built on exactly the same premise and recommends the same approach.',
                ],
            },
            {
                heading: 'What a roadmap over a bank still cannot reach',
                body: [
                    'A curation layer inherits its substrate. However well organised, the interaction is still: read a problem, write a solution, get a verdict. That prepares you for one round.',
                    'The rounds it does not touch are the ones people are least ready for. Defending a project requires having built something and being asked why. A resume that parses requires knowing what a parser extracts. A spoken system design answer requires having said one out loud, which is a physical skill and does not transfer from typing.',
                ],
            },
            {
                heading: 'Both, in sequence',
                body: [
                    'If you are early: use a curated roadmap. Volume of well-chosen pattern practice is the bottleneck and nothing else matters as much.',
                    'Once the coding round stops being the thing you are worried about, the bottleneck moves - usually to the resume, then to the project, then to speaking. That is the point at which a different kind of tool starts to matter, and it is a later point than most people assume.',
                ],
            },
        ],
        faqs: [
            { question: 'Is NeetCode good for interview prep?', answer: 'For the algorithmic round, yes - it solves the hardest part of using a problem bank, which is knowing what to do next. Our own alternatives guide recommends it, and it was written before this comparison existed.' },
            { question: 'What is the difference between ShipItHQ and NeetCode?', answer: 'NeetCode is a curated path through the classic problem set. This covers the rounds that are not problems: a project you can defend, a spoken mock interview, resume tooling and application tracking. Different categories rather than competing products.' },
            { question: 'Should I use a curated roadmap or a full platform?', answer: 'Early on, a curated roadmap - volume of well-chosen pattern practice is the bottleneck and nothing else matters as much. Once the coding round stops worrying you, the bottleneck moves to the resume and the project, and that is a different tool.' },
            { question: 'Do I still need to practise algorithms?', answer: 'Yes. Nothing here suggests otherwise, and roughly half of a sensible preparation split is pattern-based algorithmic practice. The argument is about the other half, not about replacing this one.' },
        ],
    },

    // ── Pramp / peer mock interviews ───────────────────────────────────────────
    {
        slug: 'pramp',
        glyph: 'people',
        name: 'Pramp',
        title: 'ShipItHQ vs Pramp',
        stance: 'Free, human and reciprocal - against always-available and never needing a partner.',
        description:
            'Peer mock interviews are free and put a real person across from you. The costs are scheduling, and that your interviewer is also a candidate.',
        vendorUrl: 'https://www.pramp.com/',
        creditWhereDue: [
            'Pramp - now hosted on Exponent Practice - pairs you with a peer and you interview each other. Their own site describes it plainly: "You and your peer will interview each other for 30-45 minutes. After the interview, you\'ll each provide feedback on to help each other improve." Matching is based on "availability, experience, education, practice topics, and target companies", and the site states the service is free (accessed 2026-08-21).',
            'A free service that puts a real human across from you is a genuinely good thing and there are not many of them. If you have never done a mock interview at all, this is a very reasonable first one, and the price makes the decision easy.',
            'There is also a second benefit people underrate: being the interviewer teaches you a lot. Watching somebody else flounder on a problem you know shows you exactly what an interviewer sees, and that changes how you behave in your own rounds.',
        ],
        argument: [
            'Two costs, and neither is about quality.',
            'The first is scheduling. A reciprocal session needs two people free at the same time, which turns every rehearsal into a small logistical negotiation. Preparation works by repetition, and anything with friction per attempt gets done fewer times than it should.',
            'The second is that your interviewer is a candidate too. That is fine for practising the mechanics of speaking under observation, and it is not a substitute for someone who knows what a strong answer sounds like. A peer who is also learning will not reliably notice that you skipped the complexity, or that your clarifying questions missed the one that mattered.',
        ],
        rows: [
            { dimension: 'Who interviews you', ours: 'AI, on demand, with follow-up questions', theirs: 'A matched peer, who you then interview back', source: 'theirs: their own site, accessed 2026-08-21' },
            { dimension: 'Scheduling', ours: 'None. Start whenever', theirs: 'Both people have to be free at the same time', source: 'theirs: their own site, accessed 2026-08-21' },
            { dimension: 'Feedback quality', ours: 'Scored against a rubric, consistently', theirs: 'From a peer, which varies with who you get', source: 'ours: mock interview scoring', learnMore: { label: 'Mock interviews', href: '/features/mock' } },
            { dimension: 'Learning by interviewing', ours: 'Not offered', theirs: 'Built in, and genuinely valuable', source: 'theirs: the reciprocal format' },
            { dimension: 'Coding practice attached', ours: 'Four tracks, executed in a real container', theirs: 'The interview is the product', source: 'ours: the practice module', learnMore: { label: 'Practice', href: '/features/practice' } },
            { dimension: 'Resume and applications', ours: 'ATS scoring, tailoring, application tracking', theirs: 'Not part of the mock interview format', source: 'ours: the AI tools and jobs modules', learnMore: { label: 'AI tools', href: '/features/ai' } },
        ],
        pickThemIf: [
            'You have never done a mock interview and want a real human across from you. It is free, which makes this an easy first move.',
            'You want to practise being the interviewer, which teaches you more about interviews than most candidates expect.',
            'The social pressure of another person is what makes you take it seriously, and for many people it is.',
            'Your budget is zero and you can work around the scheduling.',
        ],
        pickUsIf: [
            'You want the fifth rehearsal this week, and coordinating five people is why it will not happen.',
            'You want consistent scoring rather than feedback that varies with whoever you were matched with.',
            'It is late, it is the night before, and there is nobody to pair with.',
            'You want the practice, the project and the resume in the same place as the rehearsal.',
        ],
        deepDive: [
            {
                heading: 'The scheduling cost is the whole argument',
                body: [
                    'Nobody disputes that a real human is better than a machine at judging how you come across. The question is how many times you will do it.',
                    'Fluency comes from repetition. The first time you explain a caching decision it comes out tangled; by the fifth it is clean, and everything in the answer was already in your head at attempt one. If each attempt requires matching with a stranger at a mutually convenient hour, the realistic number is small.',
                    'An always-available rehearsal is not competing on quality per session. It is competing on how many sessions actually happen, and that is usually the binding constraint.',
                ],
            },
            {
                heading: 'What a peer can and cannot tell you',
                body: [
                    'A peer can tell you the true and useful things: you went quiet, you were hard to follow, you spent too long before writing anything. Those are observable by anyone and they are most of what a first mock should surface.',
                    'A peer usually cannot tell you the calibrated things: that this answer would pass at one company and not another, that the follow-up you got was the easy version, or that your system design skipped the trade-off an interviewer was waiting for. Knowing what a strong answer sounds like takes having heard many, and a fellow candidate has not.',
                    'That is not a criticism of the format - it is what "peer" means. It is why the honest ladder is peer mocks, then a rehearsal you can run repeatedly, then a human expert before a specific onsite if you can.',
                ],
            },
            {
                heading: 'Being the interviewer is the underrated half',
                body: [
                    'The reciprocal format has a benefit that is easy to miss: you spend half the time on the other side of the table.',
                    'Watching somebody go silent, or dive into code without an approach, or announce they are finished without testing, is far more instructive than being told not to do those things. You see how obvious it is from the other chair, and it changes your own behaviour more reliably than advice does.',
                    'We do not offer that, and if you have never done it, it is worth doing at least once for that reason alone.',
                ],
            },
        ],
        faqs: [
            { question: 'Is Pramp free?', answer: 'Their site states the service is free and that peers interview each other for 30 to 45 minutes, providing feedback afterwards (accessed 2026-08-21). We do not restate pricing beyond what a vendor publishes.' },
            { question: 'Are peer mock interviews worth doing?', answer: 'Yes, especially your first one. A peer reliably catches the observable things - going quiet, being hard to follow, coding before having an approach - and interviewing somebody else teaches you more about interviews than most candidates expect.' },
            { question: 'What is the downside of peer mock interviews?', answer: 'Scheduling, and calibration. Every session needs two people free at once, which limits how many actually happen; and a peer who is also learning cannot reliably tell you whether an answer would pass at a given company.' },
            { question: 'Should I use both?', answer: 'That is the sensible ladder. Peer mocks for the human element and for the experience of interviewing somebody, an always-available rehearsal for the repetition, and a paid expert session before a specific onsite if the budget allows.' },
        ],
    },

    // ── Category: a paid resume review ─────────────────────────────────────────
    {
        slug: 'resume-review-service',
        glyph: 'book',
        name: 'a resume review service',
        title: 'ShipItHQ vs a resume review',
        stance: 'One is a human reading it once. The other is a check you run before every application.',
        description:
            'A recruiter reading your resume properly is worth a great deal, once. What it cannot be is per-application, which is what tailoring actually requires.',
        creditWhereDue: [
            'A good resume review is a genuinely high-value hour. Someone who has screened thousands of resumes sees things no tool does: that your strongest experience is buried on page two, that your bullets describe responsibilities rather than outcomes, that the way you have framed a career change invites the wrong question.',
            'A human also has judgement about your specific situation - a gap, a career change, a degree from a school nobody recognises - and judgement is exactly what a rules-based check does not have.',
            'If you can afford one and you have never had your resume properly read, get one. It is a better first move than any tool.',
        ],
        argument: [
            'The limit is not quality. It is that a review is a snapshot and applications are continuous.',
            'A reviewed resume is correct for the moment it was reviewed and for the kind of role you described. Six weeks later you are applying to a posting that emphasises different things, and the version you are sending is the one that was tailored for something else.',
            'The other half is that a human review usually does not tell you what a parser extracts, which is a mechanical question with a factual answer. A two-column layout that reads beautifully to a person can flatten into unusable text, and that failure is invisible from the formatted version.',
        ],
        rows: [
            { dimension: 'Human judgement', ours: 'None. It is tooling, not a person', theirs: 'The whole value, and it is real', source: 'ours: no human review service exists' },
            { dimension: 'What a parser extracts', ours: 'ATS scoring against extracted text', theirs: 'Varies; often not covered', source: 'ours: the resume module', learnMore: { label: 'AI tools', href: '/features/ai' } },
            { dimension: 'Per-application tailoring', ours: 'Paste a posting, get a tailored version. Your original is kept', theirs: 'A snapshot, correct for the moment it was written', source: 'ours: the resume tailoring operation', learnMore: { label: 'AI tools', href: '/features/ai' } },
            { dimension: 'Repeatable', ours: 'As often as you apply', theirs: 'Per engagement', source: 'ours: tailoring is a metered operation' },
            { dimension: 'Cover letters', ours: 'Generated from your own resume and the posting', theirs: 'Sometimes included', source: 'ours: the cover letter operation', learnMore: { label: 'AI tools', href: '/features/ai' } },
            { dimension: 'The rest of the process', ours: 'Practice, projects, mocks and application tracking', theirs: 'The resume is the product', source: 'ours: the other four modules', learnMore: { label: 'All features', href: '/features' } },
        ],
        pickThemIf: [
            'Nobody has ever properly read your resume, in which case one good hour beats any number of automated checks.',
            'You have a situation that needs judgement - a long gap, a career change, something that needs framing rather than fixing.',
            'You are senior enough that positioning matters more than parsing, and the story is the hard part.',
            'You want somebody accountable for the result, which a tool never is.',
        ],
        pickUsIf: [
            'You are applying to more than a handful of roles and each one wants a slightly different emphasis.',
            'You do not know what an automated screen extracts from your file, which is a factual question you can just answer.',
            'You want to check before every application rather than once, at the start.',
            'You want the resume in the same place as the interview practice it is meant to lead to.',
        ],
        deepDive: [
            {
                heading: 'The parse is a factual question, and most reviews skip it',
                body: [
                    'There is a mechanical step nobody talks about: your file is parsed into fields before any human sees it, and creative formatting is where that fails. A two-column layout with a skills bar reads beautifully and flattens into interleaved gibberish, with job titles merged into a skills list.',
                    'You can check this yourself in ten minutes without paying anybody: export the PDF, select all the text, paste it into a plain text editor, and read what comes out. Everything mangled in that output is mangled for the employer too.',
                    'A human reviewer looking at the formatted version has no way to see any of it. This is not a failing of the reviewer; it is a different question from the one they are answering.',
                ],
            },
            {
                heading: 'Snapshot versus per-application',
                body: [
                    'The advice to tailor your resume per role is correct and almost nobody follows it, because doing it by hand is an hour each and the marginal application does not feel worth an hour.',
                    'What tailoring actually means is narrower than people fear: reorder so the relevant experience is first, and use the posting\'s own vocabulary where it genuinely matches what you did, because both the parser and the human are matching on it. It does not mean rewriting your history, and it certainly does not mean adding things you did not do.',
                    'That is a per-application operation by nature, which is the thing a one-time review structurally cannot be.',
                ],
            },
            {
                heading: 'What we do not do',
                body: [
                    'There is no human in this loop. Nothing here has judgement about your career change, your gap year, or whether your seniority is framed right. Those need a person and we are not pretending otherwise.',
                    'There is also nobody accountable. A reviewer you paid has a reputation at stake; a tool does not. That difference matters more than it sounds when the question is subjective.',
                    'The honest sequence for most people: fix the parse yourself, which is free and mechanical; tailor per application; and buy one human review when the questions become about positioning rather than formatting.',
                ],
            },
        ],
        faqs: [
            { question: 'Are paid resume reviews worth it?', answer: 'For a first proper read, or for a situation needing judgement - a gap, a career change, a positioning problem - yes. What a review usually does not cover is what an automated parser extracts from your file, which is a mechanical question with a factual answer.' },
            { question: 'How do I know if my resume passes an ATS?', answer: 'Export it as a PDF, select all the text, and paste it into a plain text editor. What you see is roughly what the system stored. Anything mangled there is mangled for the employer, and the usual cause is a two-column layout.' },
            { question: 'Should I tailor my resume for every job?', answer: 'Reorder rather than rewrite. Move the relevant experience up and use the posting\'s vocabulary where it genuinely matches what you did, since both the parser and the human match on it. Never add things you did not do.' },
            { question: 'Can a tool replace a human resume reviewer?', answer: 'Not for judgement. A tool can tell you what a parser extracts and produce a tailored version per application; it has no opinion on how to frame a career change. Those are different jobs and most people need both at different moments.' },
        ],
    },

    // ── Category: your own study plan ──────────────────────────────────────────
    {
        slug: 'diy-study-plan',
        glyph: 'list',
        name: 'your own plan',
        title: 'ShipItHQ vs your own plan',
        stance: 'The most common alternative, the cheapest, and the one this page takes most seriously.',
        description:
            'A self-directed plan is free and under your control. Its failure mode is not laziness - it is that you cannot plan for what you have not heard of.',
        creditWhereDue: [
            'This is what most people actually do, and it is the honest baseline any product should be compared against. It is free, it is tailored to you by definition, and nobody has a commercial interest in what goes in it.',
            'It also works. A large number of engineers got hired on a spreadsheet, a free problem list and a folder of notes, and anybody implying that is not viable is selling something.',
            'If you have a plan you are following and it is working, do not replace it. Read the free guides, take what is useful, and ignore the rest.',
        ],
        argument: [
            'The failure mode is specific and it is not effort. It is that a plan you build reflects what you already know exists.',
            'Almost everyone who self-directs builds a DSA plan, because DSA is the visible part. Far fewer build in a resume that has to survive a parser, or aptitude practice, or rehearsing an answer aloud, or asking for referrals - and those are frequently the actual blockers. People spend six months on the round they were already going to pass.',
            'The second failure is spacing. A plan usually schedules new material, rarely schedules a return to old material, and recall a week later is the thing that tells you it went in.',
        ],
        rows: [
            { dimension: 'Cost', ours: '100 free credits, then per operation', theirs: 'Free', source: 'ours: the credit grant', learnMore: { label: 'Credits', href: '/features#credits' } },
            { dimension: 'Knowing what to include', ours: 'Reading paths that sequence the whole loop, not only the coding round', theirs: 'Limited to what you know exists', source: 'ours: the topic hub reading paths', learnMore: { label: 'The blog', href: '/blogs' } },
            { dimension: 'Spaced return', ours: 'Plans built around coming back to things', theirs: 'Rarely scheduled, in practice', source: 'ours: the three-month study plan' },
            { dimension: 'Something that checks you', ours: 'Scored mocks, generated quizzes, real execution', theirs: 'Self-assessment, which is optimistic', source: 'ours: the mock and practice modules', learnMore: { label: 'Mock interviews', href: '/features/mock' } },
            { dimension: 'Control', ours: 'You follow it or you do not', theirs: 'Complete, and it is genuinely an advantage', source: 'ours: nothing here is enforced' },
            { dimension: 'The unglamorous rounds', ours: 'Resume parsing, aptitude, referrals and applications are covered', theirs: 'Usually the parts left out', source: 'ours: the AI tools and jobs modules', learnMore: { label: 'All features', href: '/features' } },
        ],
        pickThemIf: [
            'You have a plan, you are following it, and it is working. Do not break something that works.',
            'You are disciplined about returning to old material, which is the rarest and most valuable habit here.',
            'Your budget is zero, which is a real constraint and a completely workable one.',
            'You have already identified your actual weak round, rather than assuming it is the coding one.',
        ],
        pickUsIf: [
            'Your plan is entirely DSA and your applications are not converting, which means the blocker is upstream of the round you are preparing for.',
            'You have never scheduled a return to something you learned two months ago.',
            'You self-assess as ready and keep not converting, which is what an outside check is for.',
            'You want the unglamorous parts - the parse, the aptitude, the referral ask - to be somebody else\'s checklist.',
        ],
        deepDive: [
            {
                heading: 'You cannot plan for what you have not heard of',
                body: [
                    'This is the whole argument and it is not about discipline. A self-built plan is a map of your current model of the process, and the parts you have never heard of are simply absent from it.',
                    'The most common example: someone spends four months on algorithms, applies to sixty roles, and gets three responses. The plan was executed well. It was missing the step where a two-column resume flattens into unusable text before a human sees it, which no amount of DSA fixes.',
                    'Campus candidates hit a version of this every year with aptitude tests - a finite, repetitive, highly improvable round that eliminates more people than the coding round, and that a DSA-shaped plan never mentions.',
                ],
            },
            {
                heading: 'Spacing is the habit nobody schedules',
                body: [
                    'Plans schedule new material. Almost none schedule going back, because going back does not feel like progress - and progress is what a plan is built to produce the feeling of.',
                    'But recall a week later is the only thing that tells you something stuck. A topic you covered in week three and never returned to has probably gone, and you will find that out in an interview rather than in your notes.',
                    'The fix costs nothing and does not need us: one cold problem from an old topic per week. It is the single highest-return change most self-directed plans could make.',
                ],
            },
            {
                heading: 'What to steal from us for free',
                body: [
                    'All thirty guides are free, need no account, and link out to free resources more often than to anything of ours. If you take nothing else, take these three:',
                    'The order of the loop - phone screen, coding, project defence, system design, behavioural - because knowing which rounds exist is what stops a plan being all DSA. The parse check, which is ten minutes and free: export your resume, copy the text, read what comes out. And rehearsal out loud, with a timer, in an empty room, which feels ridiculous and is the closest free substitute for a mock.',
                    'None of that requires signing up. If you only ever use the blog, that is a legitimate outcome and the guides are written that way on purpose.',
                ],
            },
        ],
        faqs: [
            { question: 'Can I prepare for interviews without paying for anything?', answer: 'Yes. Most people do, and it works. The free material is excellent and our own guides link out to free resources more often than to our product. The thing money buys is a feedback loop, not information.' },
            { question: 'What is usually missing from a self-built study plan?', answer: 'The parts you have not heard of. Almost everyone builds a DSA plan because DSA is the visible round; far fewer build in a resume that survives a parser, aptitude practice, rehearsing aloud, or asking for referrals - and those are frequently the actual blockers.' },
            { question: 'How do I know which round is my weak one?', answer: 'By where you stop converting. No responses to applications is a resume problem, not a DSA problem. Phone screens that do not progress is a communication or approach problem. Onsites that do not convert is usually depth or the behavioural round.' },
            { question: 'What is the highest-return change to a self-directed plan?', answer: 'Scheduling a return to old material - one cold problem from a topic you covered weeks ago, every week. Plans schedule new material because that feels like progress, and recall later is the only thing that tells you it stuck.' },
        ],
    },
] as const

export const COMPARISON_SLUGS = COMPARISONS.map((c) => c.slug)

export function getComparison(slug: string): Comparison | undefined {
    return COMPARISONS.find((c) => c.slug === slug)
}

/** Shown under every table. The sourcing rule, said out loud to the reader. */
export const SOURCING_NOTE =
    'We do not list a competitor\'s price. Prices change, comparison tables do not, and an out-of-date figure in our favour would be the most dishonest thing on this page. Everything in the left column is a feature you can go and read about; everything in the right is either what the category does by definition, or something the vendor says on their own site.'
