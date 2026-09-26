import { UNI_PLANS } from "@repo/pricing"
import type { ModuleCardData } from "@/components/home/modules"
import type { FaqItem } from "@/components/faq-accordion"
import type { Step } from "@/components/marketing/sections"
import type { TourTab } from "@/components/marketing/product-tour"

/**
 * What shipithq.com/uni says (plan/web/revamp REV-31). Sources are apps/uni paths,
 * checked 2026-09-26.
 *
 * ── What runs today, and what this page promises ──
 * Niraj, 2026-09-26: describe the whole product ("build it properly ... later we will
 * start working on this uni as well core things"). Running today: institution
 * onboarding ((auth)/onboarding), faculty with roles and permissions (/faculty,
 * /faculty/roles), and assignments: AI projects, AI mock interviews, quizzes and code
 * assessments with deadlines (/assignments). Students, classes, placements, analytics
 * and billing have server actions but no working screens yet; they are the uni core
 * work that follows (REV-33). Re-read this file against apps/uni when that lands.
 */

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
        meta: ["6 roles", "14 permissions"],
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
        meta: ["Starter and up"],
    },
]

export const UNI_STEPS: string[] = [
    // (auth)/onboarding: university info, departments, campus
    "Set up your institution in three steps: its details, its departments and the campus.",
    // /faculty, /faculty/roles
    "Invite faculty by email with a role and a department, and decide exactly what each role can do.",
    // /assignments
    "Assign projects, mock interviews and assessments to classes, each with a deadline.",
    // /analytics, /placements
    "Watch readiness by department, and bring companies to the students who are ready.",
]

export const UNI_STEP_CARDS: Step[] = [
    { title: "Set up the campus", body: UNI_STEPS[0]!, art: "uni-students" },
    { title: "Bring in faculty", body: UNI_STEPS[1]!, art: "uni-faculty" },
    { title: "Assign real work", body: UNI_STEPS[2]!, art: "uni-classes" },
    { title: "Place who is ready", body: UNI_STEPS[3]!, art: "uni-placements" },
]

export const UNI_FAQS: FaqItem[] = [
    {
        question: "What is ShipItHQ for universities?",
        answer: "A workspace for the placement cell and faculty. You assign projects, mock interviews and assessments to classes; students do them on ShipItHQ, where they already practise; and you see how ready each department is before companies arrive.",
    },
    {
        question: "Who on campus can use it?",
        answer: "Six roles: University Admin, Department Head, Placement Officer, Finance Officer, Faculty and Teaching Assistant. Each role has its own permissions, and an admin can turn single permissions on or off.",
    },
    {
        question: "What can faculty assign?",
        answer: "Three kinds of work: a project generated with AI for a stack and a level, an AI mock interview by category (technical, behavioural, HR, system design, coding) and level, and a quiz or code assessment. Each goes to one or more classes, with a deadline.",
    },
    {
        question: "Do students need a separate account?",
        answer: "No. Students use their ShipItHQ account, the same one they practise and build projects on, so the work you assign sits beside everything else they do.",
    },
    {
        question: "How many students can we add?",
        answer: `${n(UNI_PLANS.FREE.maxStudents)} on the free plan, ${n(UNI_PLANS.STARTER.maxStudents)} on Starter, ${n(UNI_PLANS.GROWTH.maxStudents)} on Growth, and no limit on Enterprise. The plans are listed on the pricing page, in rupees or dollars.`,
    },
    {
        question: "What are credits for?",
        answer: `AI work: generating projects, running voice mock interviews and building assessments. Each plan includes a monthly pool, from ${n(UNI_PLANS.FREE.maxCreditsPerMonth)} credits on Free to ${n(UNI_PLANS.GROWTH.maxCreditsPerMonth)} on Growth.`,
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
}

export const UNI_FEATURES: UniFeature[] = [
    {
        slug: "students",
        card: "uni-students",
        headline: "Every student, and how ready they are",
        intro: "Your students by department and class, verified as belonging to your campus, with a readiness picture built from the practice, projects and mock interviews they actually do on ShipItHQ.",
        steps: [
            "Students join with their ShipItHQ account and ask to be verified for your campus.",
            "Verify them one by one or in bulk, and place them in departments and classes.",
            "Allocate credits from your pool to a student or a whole class.",
            "See each student's work in one place: practice, projects, mocks and assessments.",
        ],
        different: [
            "Readiness comes from work students did, not a self-reported form.",
            "The same account follows the student from first year to their first job.",
            "Verification keeps the roster to people who really belong to your campus.",
        ],
        limits: [
            `Students per plan: ${n(UNI_PLANS.FREE.maxStudents)} on Free, ${n(UNI_PLANS.STARTER.maxStudents)} on Starter, ${n(UNI_PLANS.GROWTH.maxStudents)} on Growth.`,
            "Students see only their own work; faculty see the classes they are assigned to.",
        ],
        faqs: [
            { question: "How do students get onto our roster?", answer: "They use their ShipItHQ account and request to join your campus; your team verifies them, individually or in bulk." },
            { question: "Can we give students credits?", answer: "Yes. Allocate credits from the institution's monthly pool to a student or a class." },
            { question: "What does readiness include?", answer: "The practice, projects, mock interviews and assessments a student completes on ShipItHQ." },
        ],
    },
    {
        slug: "assignments",
        card: "uni-classes",
        headline: "Assign work students can talk about",
        intro: "Give classes a project generated with AI for a stack and a level, an AI mock interview, or a quiz or code assessment, each with a deadline and instructions.",
        steps: [
            "Pick the classes and the kind of work: project, mock interview or assessment.",
            "For a project, choose the type (full stack, frontend, app, programs, AI/ML, AI agent), the level and the stack, and let AI write the brief.",
            "For a mock, choose the category, level, length and number of questions; for an assessment, quiz, code or mixed.",
            "Set a deadline and instructions, and publish it to the class.",
        ],
        different: [
            "Projects are generated for the stack and level you pick, so every batch gets fresh work.",
            "Mock interviews run by voice, at any hour, without booking a faculty member.",
            "Students do the work where they already practise, not in a separate portal.",
        ],
        limits: [
            `Classes per faculty member: ${n(UNI_PLANS.FREE.maxClassesPerFaculty)} on Free, ${n(UNI_PLANS.STARTER.maxClassesPerFaculty)} on Starter, ${n(UNI_PLANS.GROWTH.maxClassesPerFaculty)} on Growth.`,
            "AI work draws on the institution's monthly credits.",
        ],
        faqs: [
            { question: "What kinds of projects can AI generate?", answer: "Full stack, frontend, app, programs, AI/ML and AI agent projects, at the level and with the stack you choose. You can also assign an existing project." },
            { question: "What categories of mock interview are there?", answer: "Technical, behavioural, HR, system design, coding and general, at the level and length you set." },
            { question: "Can an assessment include code?", answer: "Yes. Assessments can be a quiz, a code test, or both, with a time limit." },
        ],
    },
    {
        slug: "faculty",
        card: "uni-faculty",
        headline: "The whole faculty, each with the right access",
        intro: "Invite faculty by email with a role, a job title and a department, and decide exactly what each role can do, down to single permissions.",
        steps: [
            "Invite a faculty member by email with a role, a title and a department.",
            "Choose from six roles: University Admin, Department Head, Placement Officer, Finance Officer, Faculty and Teaching Assistant.",
            "Turn single permissions on or off: classes, assignments, grading, verifying students, credits and administration.",
            "Revoke a pending invitation, or deactivate a member, at any time.",
        ],
        different: [
            "Roles match how a campus is organised, not a generic admin and member.",
            "Fourteen permissions across classes, assignments, students and administration.",
            "Titles from Chancellor to Lab Instructor, so the directory reads like your campus.",
        ],
        limits: [
            `Faculty per plan: ${n(UNI_PLANS.FREE.maxFaculty)} on Free, ${n(UNI_PLANS.STARTER.maxFaculty)} on Starter, ${n(UNI_PLANS.GROWTH.maxFaculty)} on Growth.`,
            "Single sign-on is not available yet.",
        ],
        faqs: [
            { question: "Who can invite faculty?", answer: "Anyone whose role has the invite permission, usually the University Admin and Department Heads." },
            { question: "Can we change what a role can do?", answer: "Yes. Turn individual permissions on or off for each member." },
            { question: "What happens to an invitation nobody accepted?", answer: "It stays pending until it is accepted, and you can revoke it." },
        ],
    },
    {
        slug: "placements",
        card: "uni-placements",
        headline: "Bring companies to students who are ready",
        intro: "Post campus-only jobs, refer companies, and follow every student from applied to placed, with the work they did on ShipItHQ behind each application.",
        steps: [
            "Post a job for your students only, or share public roles from the ShipItHQ jobs feed.",
            "Refer companies you work with; they hire through ShipItHQ Hiring.",
            "Students apply with their projects, practice and mock results behind them.",
            "Follow each drive: who applied, who was shortlisted, who was placed.",
        ],
        different: [
            "Companies see work, not just a CGPA and a resume.",
            "Campus-only jobs stay visible to your students alone.",
            "The same platform students prepared on is where they are hired.",
        ],
        limits: [
            "The placement module is on Growth and Enterprise.",
            "Companies hire through ShipItHQ Hiring, with their own plans.",
        ],
        faqs: [
            { question: "Can a job be for our students only?", answer: "Yes. Campus-only jobs are visible only to your verified students." },
            { question: "How do companies get involved?", answer: "Refer them; they hire through ShipItHQ Hiring and can run their own interview rounds." },
            { question: "Which plan includes placements?", answer: "Growth and Enterprise." },
        ],
    },
    {
        slug: "analytics",
        card: "uni-analytics",
        headline: "Know how ready each department is",
        intro: "Readiness by department and class, assignment completion and scores, credit use and placement outcomes, in one view for the placement cell and heads of department.",
        steps: [
            "See active students and assignments across the campus.",
            "Compare readiness and completion by department and class.",
            "Track credit use against the monthly pool.",
            "Follow placement outcomes season by season.",
        ],
        different: [
            "Built from the work students did, so the numbers mean something.",
            "Department heads see their department; the placement cell sees the campus.",
            "Advanced reports on Growth for the numbers accreditation asks about.",
        ],
        limits: [
            "Analytics from Starter; advanced reports from Growth.",
            "API access is on Enterprise.",
        ],
        faqs: [
            { question: "Which plan includes analytics?", answer: "Starter and above. Advanced reports are on Growth and Enterprise." },
            { question: "Can a department head see only their department?", answer: "Yes. What each person sees follows their role and permissions." },
            { question: "Can we export the data?", answer: "API access for your own systems is on Enterprise." },
        ],
    },
]

export const uniFeatureBySlug = (slug: string) => UNI_FEATURES.find((f) => f.slug === slug)

export const UNI_TOUR: TourTab[] = [
    {
        id: "assignments", label: "Assignments", art: "uni-classes", tone: "ink",
        title: "Coursework students can talk about in interviews",
        points: ["AI projects for a stack and a level", "Voice mock interviews at any hour", "Quizzes and code tests with deadlines"],
        href: "/uni/assignments", cta: "How assignments work",
    },
    {
        id: "students", label: "Students", art: "uni-students", tone: "mint",
        title: "Every student, and how ready they are",
        points: ["Verified students by department and class", "Readiness from real work", "Credits from the campus pool"],
        href: "/uni/students", cta: "How the roster works",
    },
    {
        id: "faculty", label: "Faculty", art: "uni-faculty", tone: "blush",
        title: "The whole faculty, each with the right access",
        points: ["Six campus roles", "Fourteen permissions", "Invite by email with a department"],
        href: "/uni/faculty", cta: "How roles work",
    },
    {
        id: "placements", label: "Placements", art: "uni-placements", tone: "butter",
        title: "Bring companies to students who are ready",
        points: ["Campus-only jobs", "Company referrals", "Applied to placed, per drive"],
        href: "/uni/placements", cta: "How placements work",
    },
]
