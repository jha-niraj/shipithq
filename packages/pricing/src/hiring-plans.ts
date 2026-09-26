/**
 * The hiring app's subscription plans: price, limits, credits and what each plan
 * includes (plan/web/revamp REV-20, REV-95). One source for the checkout in apps/hiring
 * (lib/dodopayments.ts adds the payment product ids) and for shipithq.com/hire/pricing.
 *
 * Every number here is a decision (Niraj, 2026-09-26), recorded in
 * plan/web/revamp/overview.md, "Hiring plans". Change it there first.
 *
 * Company credits pay for AI work beyond the free daily allowances in HIRING_AI_LIMITS
 * (./hiring.ts): extra pipeline drafts and aptitude generations. Candidates pay for
 * their own round attempts (plan/hiring-rounds/overview.md).
 *
 * The existing fields (maxJobPosts, maxApplications, maxInterviewTemplates,
 * maxTeamMembers, the has* flags) are kept because apps/hiring reads them; the newer
 * ones sit beside them. 999999 means unlimited.
 *
 * No environment reads here: this package is rendered statically by apps/web.
 */

export const UNLIMITED = 999999;

export const HIRING_PLANS = {
    FREE: {
        name: 'Free',
        tagline: 'For a first role, or trying the pipeline builder.',
        priceINR: 0,
        priceUSD: 0,
        priceYearlyINR: 0,
        priceYearlyUSD: 0,
        billingCycle: 'monthly',
        maxJobPosts: 1,
        maxApplications: 50,
        maxInterviewTemplates: 1,
        maxPipelines: 1,
        maxTeamMembers: 2,
        maxCustomRoles: 1,
        creditsOnSignup: 100,
        creditsPerMonth: 0,
        hasAIScreening: false,
        hasCustomAssignments: true,
        hasPrioritySupport: false,
        hasAPIAccess: false,
        hasSSO: false,
        hasWhiteLabel: false,
        features: [
            '1 active job',
            '1 interview pipeline',
            'Up to 50 applicants a month',
            '2 team members and 1 custom role',
            '100 credits to start',
            'Aptitude, coding, system design and voice rounds',
            'Candidate board and take-home assignments',
        ],
    },
    PRO: {
        name: 'Pro',
        tagline: 'For teams hiring every month.',
        priceINR: 3999,
        priceUSD: 49,
        priceYearlyINR: 39990,
        priceYearlyUSD: 490,
        billingCycle: 'monthly',
        maxJobPosts: 10,
        maxApplications: 500,
        maxInterviewTemplates: 10,
        maxPipelines: 10,
        maxTeamMembers: 10,
        maxCustomRoles: 5,
        creditsOnSignup: 0,
        creditsPerMonth: 1000,
        hasAIScreening: false,
        hasCustomAssignments: true,
        hasPrioritySupport: false,
        hasAPIAccess: false,
        hasSSO: false,
        hasWhiteLabel: false,
        features: [
            '10 active jobs',
            '10 interview pipelines',
            'Up to 500 applicants a month',
            '10 team members and 5 custom roles',
            '1,000 credits every month',
            'Company page with logo, cover and media',
            'Analytics and the hiring funnel',
            'An invoice for every payment',
        ],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        tagline: 'For large teams and custom needs.',
        priceINR: 0, // Custom pricing
        priceUSD: 0, // Custom pricing
        priceYearlyINR: 0,
        priceYearlyUSD: 0,
        billingCycle: 'monthly',
        maxJobPosts: UNLIMITED,
        maxApplications: UNLIMITED,
        maxInterviewTemplates: UNLIMITED,
        maxPipelines: UNLIMITED,
        maxTeamMembers: UNLIMITED,
        maxCustomRoles: UNLIMITED,
        creditsOnSignup: 0,
        creditsPerMonth: 0, // agreed per contract
        hasAIScreening: false,
        hasCustomAssignments: true,
        hasPrioritySupport: true,
        hasAPIAccess: false,
        hasSSO: false,
        hasWhiteLabel: false,
        features: [
            'Unlimited jobs, pipelines and applicants',
            'Unlimited team members and custom roles',
            'A credit allowance sized to your hiring',
            'Help setting up your first pipelines',
            'Invoice billing',
        ],
    },
} as const;

export type HiringPlanKey = keyof typeof HIRING_PLANS;

/** The rows of the plan comparison table on /hire/pricing, in order. */
export const HIRING_PLAN_LIMITS: { label: string; key: keyof (typeof HIRING_PLANS)['FREE']; unit?: string }[] = [
    { label: 'Active jobs', key: 'maxJobPosts' },
    { label: 'Interview pipelines', key: 'maxPipelines' },
    { label: 'Applicants a month', key: 'maxApplications' },
    { label: 'Team members', key: 'maxTeamMembers' },
    { label: 'Custom roles', key: 'maxCustomRoles' },
];
