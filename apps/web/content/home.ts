
/**
 * Copy for the student landing's new sections (plan/web/revamp REV-79). Every line is
 * a restatement of a sourced fact in content/modules.ts; check there before changing.
 */

/**
 * The wedge band under the hero (plan/competition/skillmeet CMP-5; Niraj, 2026-09-26,
 * decisions round 6). Sourced from what ships: plan/job-import (a link or the text,
 * rounds of our five types with pass marks and gates, taken in order; a round we can't
 * run is shown, not hidden) and JI-11 (the plan reads what students reported for the
 * company). Keep it true to those; nothing here promises the company's own process.
 */
export const HOME_WEDGE = {
    eyebrow: "New · Practise any job",
    title: "Paste any job. Practise its interview, round by round.",
    sub: "From LinkedIn, a careers page or the text itself: we design that job's rounds from the posting and what students reported, with pass marks, and you take them in order.",
    fine: "A public import is free · rounds cost what every practice round does",
    example: {
        url: "linkedin.com/jobs/view/4015632871",
        rounds: [
            { name: "Aptitude", meta: "25 min · pass 60 to go on" },
            { name: "Coding", meta: "45 min · pass 60 to go on" },
            { name: "System design", meta: "45 min · advisory" },
            { name: "Behavioural", meta: "20 min · voice · advisory" },
        ],
        notPractisable: "Take-home assignment: shown, not practisable yet",
    },
} as const
