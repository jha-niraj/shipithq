import type { ArtKind } from "@/components/marketing/card-art"

/**
 * The deeper sections on each feature page (plan/web/revamp REV-92; Niraj,
 * 2026-09-26: "very less content here"). Keyed by the art id each page already uses:
 * the five student modules and the five hire features.
 *
 * Every line restates a fact already sourced in content/modules.ts or content/hire.ts
 * (the product research of 2026-09-25). Nothing here is new capability; check those
 * files before adding a claim.
 */

export interface FeatureExtras {
    /** Three capabilities, each with a scene, shown as alternating rows. */
    spotlights: { title: string; body: string; art: ArtKind }[]
    /** Who gets the most from it. */
    forWho: { title: string; body: string }[]
    /** How it hands off to the rest of the product. `href` is a page on this site. */
    connects: { title: string; body: string; href: string; art: ArtKind }[]
    /** Added to the page's FAQ. */
    moreFaqs: { question: string; answer: string }[]
}

export const FEATURE_EXTRAS: Partial<Record<ArtKind, FeatureExtras>> = {
    projects: {
        spotlights: [
            { title: "A blueprint before you start", body: "Every curated project comes with a blueprint and a numbered setup guide with checks you can tick, so the first hour goes on building, not on configuring.", art: "changelog" },
            { title: "A workspace with a live preview", body: "Write code in the workspace and watch it run in a live preview. Where a project runs in the browser, each task has tests you can check it against.", art: "practice" },
            { title: "Interviewed on your own build", body: "At the end of each sprint, a quiz scores what you learnt and a mock interview asks about the decisions in your own task notes. Answer by typing or by voice.", art: "mock" },
        ],
        forWho: [
            { title: "You finished the tutorials", body: "And still have nothing of your own to show. Four sprints end with something you built and can explain." },
            { title: "You are switching careers", body: "You need proof of work more than a certificate. A finished project with an interview behind it is that proof." },
            { title: "You have interviews coming", body: "\"Tell me about a project\" is the most common question there is. The sprint mocks are rehearsal for exactly that." },
        ],
        connects: [
            { title: "Practice the algorithms it needs", body: "Stuck on a data structure mid-sprint? Practise it in a real container, then come back.", href: "/features/practice", art: "practice" },
            { title: "Put it on your resume", body: "Import your work and let the resume builder describe what you actually built.", href: "/features/ai", art: "ai" },
            { title: "Rehearse the conversation", body: "Take a voice mock on the material you just built.", href: "/features/mock", art: "mock" },
        ],
        moreFaqs: [
            { question: "How long does a project take?", answer: "Four sprints of five tasks, and each task shows an estimated time. You set the pace; the board remembers where you stopped." },
            { question: "Can I work on projects other than the curated ones?", answer: "Yes. Enrolling in a platform project is free; other projects cost a small number of credits to enrol." },
        ],
    },
    practice: {
        spotlights: [
            { title: "A real Linux container", body: "JavaScript, TypeScript, Python, Java and C++ run in a Linux container, with real compiler output, not a browser sandbox that guesses.", art: "practice" },
            { title: "Hidden tests decide", body: "Run against the sample cases while you work. A problem is accepted only when it passes the hidden tests, and every seeded problem's tests are checked against a reference solution.", art: "hire-questions" },
            { title: "Design and backend, too", body: "System design problems open on a drawing canvas, and backend problems come with an API tester, so the practice looks like the interview.", art: "hire-pipelines" },
        ],
        forWho: [
            { title: "Coding rounds are coming", body: "76 DSA problems across 16 categories, with a guided path through them." },
            { title: "System design scares you", body: "Draw the architecture on a canvas instead of only reading about one." },
            { title: "You want feedback, not answers", body: "The mentor records what you understood, so the next session starts from there." },
        ],
        connects: [
            { title: "Build something with it", body: "Put the patterns to work in a four-sprint project.", href: "/features/projects", art: "projects" },
            { title: "Say it out loud", body: "Explain your approach in a voice mock.", href: "/features/mock", art: "mock" },
            { title: "Find roles that fit", body: "Jobs match the skills you have practised.", href: "/features/jobs", art: "jobs" },
        ],
        moreFaqs: [
            { question: "Is there a guided path?", answer: "Yes. DSA walks you through a sequenced path, with a short onboarding at the start of each sub-module." },
            { question: "How many problems are there?", answer: "76 seeded DSA problems (22 easy, 49 medium, 5 hard) across 16 categories, plus any you add from a link or by name." },
        ],
    },
    ai: {
        spotlights: [
            { title: "Start from what you have", body: "Upload a resume (parsing is free) or import your details from LinkedIn and GitHub, instead of filling in a blank form.", art: "jobs" },
            { title: "Tailor it to the job", body: "Paste a job description to tailor the resume, then get an ATS score out of 100 with the keywords it found missing and suggestions.", art: "ai" },
            { title: "Share it properly", body: "Export a PDF, write a cover letter from the same material, or send a public link instead of an attachment.", art: "hire-jobs" },
        ],
        forWho: [
            { title: "Your first resume", body: "Import from LinkedIn and GitHub and start from something, not a blank page." },
            { title: "Applying to many roles", body: "Tailor one base resume to each job description in minutes." },
            { title: "Switching fields", body: "See which keywords a role expects that your resume does not yet show." },
        ],
        connects: [
            { title: "Give it something to say", body: "A finished project is the strongest line on a resume.", href: "/features/projects", art: "projects" },
            { title: "Apply with it", body: "Jobs show how your skills match each role.", href: "/features/jobs", art: "jobs" },
            { title: "Prepare for the call", body: "Rehearse the interview the resume earns.", href: "/features/mock", art: "mock" },
        ],
        moreFaqs: [
            { question: "How many templates are there?", answer: "Five templates, sharing two PDF layouts today." },
            { question: "What does it cost?", answer: "Parsing an upload is free. An ATS score is 5 credits, a cover letter 15, and tailoring to a job or importing from LinkedIn and GitHub 20 each." },
        ],
    },
    jobs: {
        spotlights: [
            { title: "A match score you can read", body: "Each job shows the share of its required skills you already have, and lists the ones you are missing.", art: "jobs" },
            { title: "Spark: one job at a time", body: "See a single role with your match, the skills you have and miss, and its hiring process, then decide.", art: "hire-candidates" },
            { title: "Rounds on the platform", body: "Companies attach interview pipelines to their jobs: aptitude, DSA, system design and voice rounds you work through here.", art: "hire-pipelines" },
        ],
        forWho: [
            { title: "New graduates", body: "See which roles you already fit, and what to practise for the rest." },
            { title: "Switching jobs", body: "Save roles, follow companies, and track what you applied to." },
            { title: "Tired of silent rejections", body: "A low match warns you before you apply, not after." },
        ],
        connects: [
            { title: "Close the skill gap", body: "Practise the skills a role says you are missing.", href: "/features/practice", art: "practice" },
            { title: "Tailor the resume", body: "Match your resume to the job description first.", href: "/features/ai", art: "ai" },
            { title: "Rehearse the rounds", body: "A voice mock before the real voice round.", href: "/features/mock", art: "mock" },
        ],
        moreFaqs: [
            { question: "Where do the jobs come from?", answer: "Companies post them on ShipItHQ Hiring; public, active jobs appear in the jobs feed." },
            { question: "Can I follow a company?", answer: "Yes. Follow companies and save jobs to come back to them." },
        ],
    },
    mock: {
        spotlights: [
            { title: "Built on your material", body: "Set up a mock in three steps: the role, a knowledge base you paste in, and settings. It interviews you on that, not a fixed list.", art: "guides" },
            { title: "A live voice interviewer", body: "Talk it through in a live voice session, with no one to schedule and nothing to install.", art: "mock" },
            { title: "A scored breakdown", body: "An overall score, communication, technical skills and problem solving out of 100, your strengths and areas to improve.", art: "ai" },
        ],
        forWho: [
            { title: "Phone screens are next", body: "Rehearse out loud before it counts." },
            { title: "You freeze when speaking", body: "Practise the same kind of questions until talking through them feels normal." },
            { title: "You want a number", body: "Retake the mock and compare the scores." },
        ],
        connects: [
            { title: "Talk about your project", body: "Build something, then rehearse explaining it.", href: "/features/projects", art: "projects" },
            { title: "Sharpen the technical side", body: "Practise the problems behind the questions.", href: "/features/practice", art: "practice" },
            { title: "Then apply", body: "Find roles that match your skills.", href: "/features/jobs", art: "jobs" },
        ],
        moreFaqs: [
            { question: "How much does a mock cost?", answer: "A voice mock session costs 15 credits." },
            { question: "Can I retake a mock?", answer: "Yes. Retake it and compare the results." },
        ],
    },
    "hire-pipelines": {
        spotlights: [
            { title: "Five round types", body: "Aptitude, coding (DSA), system design, a voice behavioural interview and a voice culture conversation.", art: "hire-questions" },
            { title: "Gates you decide", body: "Each round has a pass mark, a time limit and a retake cool-down, and is a hard gate or advisory.", art: "hire-pipelines" },
            { title: "Drafted in seconds", body: "Start from one of three starter pipelines or draft one with AI, then edit it round by round.", art: "ai" },
        ],
        forWho: [
            { title: "No interview process yet", body: "Start from a template for a backend, frontend or full-stack role." },
            { title: "Too many applicants", body: "Hard gates on the early rounds screen at volume." },
            { title: "Inconsistent interviews", body: "Every candidate for a job takes the same rounds." },
        ],
        connects: [
            { title: "Fill the rounds", body: "320 aptitude questions and 12 design prompts.", href: "/hire/questions", art: "hire-questions" },
            { title: "Attach it to a job", body: "The pipeline travels with the role.", href: "/hire/jobs", art: "hire-jobs" },
            { title: "Review who passed", body: "One board from Applied to Hired.", href: "/hire/candidates", art: "hire-candidates" },
        ],
        moreFaqs: [
            { question: "What are the starter pipelines?", answer: "Three: Backend SDE-1, Frontend intern and Full-stack SDE-1, built from aptitude, DSA, system design and voice rounds with a pass mark of 60." },
            { question: "Is there a limit on AI drafts?", answer: "Yes, a daily limit per company; it is listed on the pipelines page." },
        ],
    },
    "hire-questions": {
        spotlights: [
            { title: "A 320-question pool", body: "Aptitude questions across quantitative, logical and verbal reasoning, drawn fresh for each attempt.", art: "hire-questions" },
            { title: "Design prompts", body: "Twelve system design prompts to choose from, beside any you add yourself.", art: "compare" },
            { title: "Generate with AI", body: "Generate an aptitude set with AI when you want something specific to your role.", art: "ai" },
        ],
        forWho: [
            { title: "No question bank", body: "Start screening today from a ready pool." },
            { title: "Leaked questions", body: "Fresh draws per attempt mean answers do not travel." },
            { title: "Specific roles", body: "Add your own design prompts for the systems you run." },
        ],
        connects: [
            { title: "Build the pipeline", body: "Put the questions into gated rounds.", href: "/hire/pipelines", art: "hire-pipelines" },
            { title: "Post the job", body: "Attach the interview to a role.", href: "/hire/jobs", art: "hire-jobs" },
            { title: "Read the research", body: "How to set pass marks that mean something.", href: "/blogs/pass-marks-technical-assessments", art: "guides" },
        ],
        moreFaqs: [
            { question: "How long is a default aptitude round?", answer: "20 questions in 25 minutes; you can change both." },
        ],
    },
    "hire-jobs": {
        spotlights: [
            { title: "One form", body: "Title, skills, location and details in one form, with an interview pipeline attached.", art: "hire-jobs" },
            { title: "Straight to developers", body: "Public, active jobs appear in the jobs feed developers use on ShipItHQ.", art: "jobs" },
            { title: "Your company page", body: "A logo, a cover and a media gallery give candidates the context a job post cannot.", art: "about" },
        ],
        forWho: [
            { title: "Hiring engineers", body: "Reach developers who are already practising on the platform." },
            { title: "Several open roles", body: "Duplicate a job and change only what differs." },
            { title: "Changing plans", body: "Pause or close a job any time." },
        ],
        connects: [
            { title: "Design the interview", body: "Build the pipeline the job uses.", href: "/hire/pipelines", art: "hire-pipelines" },
            { title: "Review applicants", body: "Everyone who applies lands on one board.", href: "/hire/candidates", art: "hire-candidates" },
            { title: "Hire as a team", body: "Invite the people who will review.", href: "/hire/team", art: "hire-team" },
        ],
        moreFaqs: [
            { question: "Does a job need a pipeline?", answer: "You choose an interview process in the job form; the rounds are what candidates take." },
        ],
    },
    "hire-candidates": {
        spotlights: [
            { title: "Six stages", body: "Applied, Reviewing, Shortlisted, Interviewing, Offered and Hired, per job or across every job.", art: "hire-candidates" },
            { title: "Take-home assignments", body: "Attach a take-home to a job, send it, and score each submission with a mark and written feedback.", art: "projects" },
            { title: "A funnel you can read", body: "Views, applications, active jobs, time to hire and the funnel, on one analytics page.", art: "changelog" },
        ],
        forWho: [
            { title: "Spreadsheet hiring", body: "Move status, notes and assignments into one place." },
            { title: "Hiring as a team", body: "Everyone reviews the same board, with their role's permissions." },
            { title: "Losing candidates", body: "See where they drop out of the funnel." },
        ],
        connects: [
            { title: "Screen before the board", body: "Gated rounds decide who arrives.", href: "/hire/pipelines", art: "hire-pipelines" },
            { title: "Invite reviewers", body: "Custom roles for everyone who reviews.", href: "/hire/team", art: "hire-team" },
            { title: "Read the research", body: "Work samples versus take-home assignments.", href: "/blogs/work-sample-vs-take-home-assignment", art: "guides" },
        ],
        moreFaqs: [
            { question: "Can I message candidates?", answer: "Yes, and you can tidy a message with AI before you send it." },
        ],
    },
    "hire-team": {
        spotlights: [
            { title: "Company email only", body: "Free and temporary addresses cannot create or join a company, so every account belongs to the company.", art: "hire-team" },
            { title: "Custom roles", body: "Create roles and choose exactly what each can do, beyond admin and member.", art: "hire-pipelines" },
            { title: "One workspace", body: "Jobs, pipelines and candidates shared by the whole team, owned by the person who created it.", art: "about" },
        ],
        forWho: [
            { title: "A hiring manager and a team", body: "Everyone reviews in one place." },
            { title: "Sensitive roles", body: "Limit who can see what with custom permissions." },
            { title: "Growing teams", body: "Invite, resend and revoke invites as people join." },
        ],
        connects: [
            { title: "Design together", body: "Build the pipeline the team will use.", href: "/hire/pipelines", art: "hire-pipelines" },
            { title: "Review together", body: "One board for every applicant.", href: "/hire/candidates", art: "hire-candidates" },
            { title: "Read the research", body: "Why structured interviews beat chemistry.", href: "/blogs/structured-interviews-engineering-hiring", art: "guides" },
        ],
        moreFaqs: [
            { question: "Who owns the workspace?", answer: "Whoever creates it becomes its Owner and can invite the team and set roles." },
        ],
    },
}
