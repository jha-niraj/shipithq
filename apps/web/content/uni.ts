import { UNI_PLANS } from "@repo/pricing"
import type { ModuleCardData } from "@/components/home/modules"
import type { FaqItem } from "@/components/faq-accordion"

/**
 * What shipithq.com/uni says (plan/web/revamp REV-31). Sources are apps/uni paths,
 * checked 2026-09-26.
 *
 * ── Early access, told honestly (Niraj, 2026-10-07, plan/web/story ST-15) ──
 * Checked against apps/uni on 2026-10-07 (plan/uni/overview.md). Works: register with an
 * email code, six-step onboarding that creates the departments, inviting faculty (the head
 * only) with five roles plus University Admin, 21 permissions per person, revoking an
 * invitation, and DESIGNING a project, a voice mock or an assessment. Not built: creating
 * classes, students receiving assignments, results and scores, the Students, Placements and
 * Analytics screens, billing. Every claim about those carries a Soon marker or reads as
 * planned. When plan/uni UNI-1 to UNI-4 land, re-read this file against apps/uni.
 */

/** Plan lines (UNI_PLANS in @repo/pricing, shared with apps/uni) that are not built yet. */
export const UNI_PLAN_LINES_NOT_BUILT = new Set([
    "Basic analytics", "Advanced analytics & reports", "Full analytics suite", "Student verification",
    "Placement module", "Company portal access", "Custom branding", "API access", "White-label options",
    "Custom integrations",
])

const n = (v: number) => v.toLocaleString("en-IN")

export const UNI_MODULES: ModuleCardData[] = [
    {
        // actions/students/students.action.ts (verify, allocate credits); screens: REV-33
        id: "uni-students",
        href: "/uni/students",
        kind: "Roster",
        name: "Students",
        tone: "mint",
        bullets: [
            "Students by department and class",
            "Verify who belongs to your campus",
            "Readiness from real practice, projects and mocks",
        ],
        soon: { what: "the Students screen: rosters by department and class, verification and readiness", today: "institution set-up, faculty and assignments work, and student rosters have no screen in the app yet" },
        meta: [`Up to ${n(UNI_PLANS.GROWTH.maxStudents)} on Growth`],
    },
    {
        // app/(main)/assignments, components/assignments/teacher-*-sheet.tsx (running)
        id: "uni-classes",
        href: "/uni/assignments",
        kind: "Coursework",
        name: "Assignments",
        tone: "ink",
        bullets: [
            "AI-generated projects with a stack and a level",
            "AI mock interviews by category and level",
            "Quizzes and code assessments with deadlines",
        ],
        soon: { what: "delivering assignments: creating classes, students receiving the work, and results back", today: "faculty can design a project, a voice mock or an assessment, but it cannot reach students yet" },
        meta: ["3 assignment types"],
    },
    {
        // app/(main)/faculty, faculty/roles, components/team/invite-teacher-dialog.tsx (running)
        id: "uni-faculty",
        href: "/uni/faculty",
        kind: "Collaborate",
        name: "Faculty",
        tone: "blush",
        bullets: [
            "Invite faculty with a role and a department",
            "Six roles, from University Admin to TA",
            "Turn single permissions on or off",
        ],
        meta: ["6 roles", "21 permissions"],
    },
    {
        // app/(main)/placements (screens: REV-33); company side is ShipItHQ Hiring
        id: "uni-placements",
        href: "/uni/placements",
        kind: "Place",
        name: "Placements",
        tone: "ink",
        bullets: [
            "Campus-only jobs and company referrals",
            "Students apply with the work they did",
            "Who applied, who was shortlisted, who was placed",
        ],
        soon: { what: "the Placements screen: campus jobs, applications and outcomes", today: "companies hire through ShipItHQ Hiring, and the university app has no Placements screen yet" },
        meta: ["Growth and Enterprise"],
    },
    {
        // app/(main)/analytics (screens: REV-33); UNI_PLANS.hasAnalytics from Starter
        id: "uni-analytics",
        href: "/uni/analytics",
        kind: "Measure",
        name: "Analytics",
        tone: "sand",
        bullets: [
            "Readiness by department and class",
            "Assignment completion and scores",
            "Credit use and placement outcomes",
        ],
        soon: { what: "the Analytics screen: readiness, completion and credit use", today: "the university app has no Analytics screen yet" },
        meta: ["Starter and up"],
    },
]

export const UNI_FAQS: FaqItem[] = [
    {
        question: "What is ShipItHQ for universities?",
        answer: "A workspace for the placement cell and faculty, in early access. Today you set up your institution and its departments, invite faculty with roles and permissions, and design projects, voice mock interviews and assessments. Classes, students receiving that work, results and department readiness are being built with our first campuses.",
    },
    {
        question: "Who on campus can use it?",
        answer: "Six roles: University Admin, Department Head, Placement Officer, Finance Officer, Faculty and Teaching Assistant. The person who sets up the workspace is its University Admin and invites the others; each person's 21 permissions can be turned on or off one by one.",
    },
    {
        question: "What can faculty assign?",
        answer: "Three kinds of work: a project generated with AI for a stack and a level, a voice mock interview by category (technical, behavioural, HR, system design, live coding, general) and level, and a quiz, code or mixed assessment. Faculty can design all three today; sending them to classes is being built.",
    },
    {
        question: "Do students need a separate account?",
        answer: "No. Students will use their ShipItHQ account, the same one they practise and build projects on. Joining a campus and receiving its assignments there is being built.",
    },
    {
        question: "How many students can we add?",
        answer: `${n(UNI_PLANS.FREE.maxStudents)} on the free plan, ${n(UNI_PLANS.STARTER.maxStudents)} on Starter, ${n(UNI_PLANS.GROWTH.maxStudents)} on Growth, and no limit on Enterprise, once student rosters are built. The plans are listed on the pricing page in rupees and dollars; talk to us to start one.`,
    },
    {
        question: "What are credits for?",
        answer: `AI work: generating projects, running voice mock interviews and building assessments. Each plan includes a monthly pool, from ${n(UNI_PLANS.FREE.maxCreditsPerMonth)} credits on Free to ${n(UNI_PLANS.GROWTH.maxCreditsPerMonth)} on Growth.`,
    },
    {
        question: "What does early access mean?",
        answer: "The workspace runs today for setting up a campus, its faculty and their assignments. We are building classes, rosters, delivery to students, results and readiness with a small number of campuses first. Request early access and we will set yours up with you.",
    },
]

/** The five /uni/<slug> pages. Sources as on the cards above. */
export interface UniFeature {
    slug: "students" | "assignments" | "faculty" | "placements" | "analytics"
    card: ModuleCardData["id"]
    headline: string
    intro: string
    steps: string[]
    different: string[]
    limits: string[]
    faqs: { question: string; answer: string }[]
    /** Not built yet: the page reads as planned, in the future tense (plan/web/story ST-15). */
    planned?: boolean
}

export const UNI_FEATURES: UniFeature[] = [
    {
        slug: "students",
        card: "uni-students",
        planned: true,
        headline: "Every student, and how ready they are",
        intro: "Being built: your students by department and class, verified as belonging to your campus, with a readiness picture from the practice, projects and mock interviews they do on ShipItHQ.",
        steps: [
            "Students will join with their ShipItHQ account and ask to be verified for your campus.",
            "Your team will verify them one by one or in bulk, and enroll them in classes.",
            "You will allocate credits from the campus pool to a student or a whole class.",
            "Each student's work will sit in one place: practice, projects, mocks and assessments.",
        ],
        different: [
            "Readiness will come from work students did, not a self-reported form.",
            "The same account will follow the student from first year to their first job.",
            "Verification will keep the roster to people who really belong to your campus.",
        ],
        limits: [
            `Students per plan: ${n(UNI_PLANS.FREE.maxStudents)} on Free, ${n(UNI_PLANS.STARTER.maxStudents)} on Starter, ${n(UNI_PLANS.GROWTH.maxStudents)} on Growth.`,
            "Students see only their own work; faculty see the classes they are assigned to.",
        ],
        faqs: [
            { question: "Can we add students today?", answer: "Not yet. Rosters, verification and enrolment are the next part being built; request early access and we will bring your campus in as they land." },
            { question: "Will we be able to give students credits?", answer: "Yes, from the institution's monthly pool, to a student or a class, once rosters are built." },
            { question: "What will readiness include?", answer: "The practice, projects, mock interviews and assessments a student completes on ShipItHQ." },
        ],
    },
    {
        slug: "assignments",
        card: "uni-classes",
        headline: "Assign work students can talk about",
        intro: "Design a project generated with AI for a stack and a level, a voice mock interview, or a quiz, code or mixed assessment, each with a deadline and instructions. Sending it to classes is being built.",
        steps: [
            "Choose the kind of work: a project, a voice mock interview or an assessment.",
            "For a project, choose the type (full stack, frontend, mobile app, programs, AI/ML, AI agent), the level and the stack, and AI writes the brief.",
            "For a mock, choose the category, level, length and number of questions; for an assessment, quiz, code or mixed, AI-generated or written by you.",
            "Add a deadline, credits and instructions. Sending it to a class, and results back, are being built.",
        ],
        different: [
            "Projects are generated for the stack and level you pick, so every batch gets fresh work.",
            "Mock interviews run by voice, at any hour, without booking a faculty member.",
            "Students will do the work where they already practise, not in a separate portal.",
        ],
        limits: [
            `Classes per faculty member: ${n(UNI_PLANS.FREE.maxClassesPerFaculty)} on Free, ${n(UNI_PLANS.STARTER.maxClassesPerFaculty)} on Starter, ${n(UNI_PLANS.GROWTH.maxClassesPerFaculty)} on Growth.`,
            "AI work draws on the institution's monthly credits.",
        ],
        faqs: [
            { question: "What kinds of projects can AI generate?", answer: "Full stack, frontend, mobile app, programs, AI/ML and AI agent projects, at the level and with the stack you choose." },
            { question: "What categories of mock interview are there?", answer: "Technical, behavioural, HR round, system design, live coding and general, at the level and length you set." },
            { question: "Can an assessment include code?", answer: "Yes. An assessment can be a quiz, a code test, or mixed, with a time limit, and a live mode for in-class tests." },
            { question: "Can students take them today?", answer: "Not yet. Faculty can design all three today; creating classes and delivering the work to students is the next part being built." },
        ],
    },
    {
        slug: "faculty",
        card: "uni-faculty",
        headline: "The whole faculty, each with the right access",
        intro: "Invite faculty with a role, a job title and a department, and decide exactly what each person can do, down to single permissions.",
        steps: [
            "Invite a faculty member with their email, name, role, title and department; they are sent temporary credentials to sign in.",
            "Choose a role: Department Head, Placement Officer, Finance Officer, Faculty or Teaching Assistant. Whoever set up the workspace is its University Admin.",
            "Turn single permissions on or off for each person: 21 of them, from creating assignments to verifying students.",
            "Revoke an invitation nobody has used.",
        ],
        different: [
            "Roles match how a campus is organised, not a generic admin and member.",
            "21 permissions, switched per person, not per role only.",
            "A job title and a department on every member, so the directory reads like your campus.",
        ],
        limits: [
            `Faculty per plan: ${n(UNI_PLANS.FREE.maxFaculty)} on Free, ${n(UNI_PLANS.STARTER.maxFaculty)} on Starter, ${n(UNI_PLANS.GROWTH.maxFaculty)} on Growth.`,
            "Single sign-on is not available yet.",
        ],
        faqs: [
            { question: "Who can invite faculty?", answer: "Today, the University Admin: the person who set up the workspace." },
            { question: "Can we change what someone can do?", answer: "Yes. Turn individual permissions on or off for each member." },
            { question: "What happens to an invitation nobody used?", answer: "It stays pending, and you can revoke it." },
        ],
    },
    {
        slug: "placements",
        card: "uni-placements",
        headline: "Bring companies to students who are ready",
        planned: true,
        intro: "Being built: campus-only jobs, company referrals, and every student followed from applied to placed, with the work they did on ShipItHQ behind each application.",
        steps: [
            "You will post a job for your students only, or share public roles from the ShipItHQ jobs feed.",
            "You will refer companies you work with; they hire through ShipItHQ Hiring, which runs today.",
            "Students will apply with their projects, practice and mock results behind them.",
            "You will follow each drive: who applied and who was placed.",
        ],
        different: [
            "Companies will see work, not just a CGPA and a resume.",
            "Campus-only jobs will stay visible to your students alone.",
            "The same platform students prepared on is where they will be hired.",
        ],
        limits: [
            "The placement module is on Growth and Enterprise.",
            "Companies hire through ShipItHQ Hiring, with their own plans.",
        ],
        faqs: [
            { question: "Can a job be for our students only?", answer: "That is the plan: campus-only jobs visible only to your verified students, once Placements is built." },
            { question: "How do companies get involved today?", answer: "Through ShipItHQ Hiring, which runs today: a company designs its interview rounds and students who clear them send their results." },
            { question: "Which plan will include placements?", answer: "Growth and Enterprise." },
        ],
    },
    {
        slug: "analytics",
        card: "uni-analytics",
        headline: "Know how ready each department is",
        planned: true,
        intro: "Being built: readiness by department and class, assignment completion and scores, credit use and placement outcomes, in one view for the placement cell and heads of department.",
        steps: [
            "You will see active students and assignments across the campus.",
            "You will compare readiness and completion by department and class.",
            "You will track credit use against the monthly pool.",
            "You will follow placement outcomes season by season.",
        ],
        different: [
            "Built from the work students did, so the numbers will mean something.",
            "Department heads will see their department; the placement cell the campus.",
            "Advanced reports on Growth for the numbers accreditation asks about.",
        ],
        limits: [
            "Analytics from Starter; advanced reports from Growth.",
            "API access is on Enterprise.",
        ],
        faqs: [
            { question: "Which plan will include analytics?", answer: "Starter and above, with advanced reports on Growth and Enterprise." },
            { question: "Will a department head see only their department?", answer: "Yes. What each person sees will follow their role and permissions." },
            { question: "Will we be able to export the data?", answer: "API access for your own systems is planned for Enterprise." },
        ],
    },
]

export const uniFeatureBySlug = (slug: string) => UNI_FEATURES.find((f) => f.slug === slug)
