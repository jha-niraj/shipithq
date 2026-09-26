import type { AuthorKey } from './authors'
import { ACTIVE_BLOG_SLUGS } from './active-posts'

// ─── Categories (topic hubs) ─────────────────────────────────────────────────
// Each key is also a real URL: /blogs/topics/<key>. Hubs give the cluster an
// internal-linking centre so authority collects somewhere instead of being spread
// evenly across seventeen orphan pages.

export const BLOG_CATEGORIES = {
    'interview-prep': 'Interview Prep',
    'career': 'Career',
    'resume': 'Resume & Applications',
    'dsa': 'DSA & Practice',
    'portfolio': 'Portfolio & Projects',
    'open-source': 'Open Source',
    'ai-tools': 'AI & Developer Tools',
    // For companies (plan/web/revamp REV-83): listed at /hire/guides, not on the student /blogs index.
    'hiring': 'Hiring',
    // For universities (plan/web/revamp REV-31): placement cells, TPOs and heads of department.
    'placements': 'Placements',
} as const

export type BlogCategory = keyof typeof BLOG_CATEGORIES

export const BLOG_CATEGORY_KEYS = Object.keys(BLOG_CATEGORIES) as BlogCategory[]

/** Short intro copy for each topic hub page. Also used as the hub meta description. */
export const BLOG_CATEGORY_INTROS: Record<BlogCategory, string> = {
    'interview-prep': 'Behavioural rounds, system design, mock practice and the questions to ask back. Everything between the phone screen and the offer.',
    'career': 'Getting in, levelling up and staying employable - roadmaps, career ladders, placements and new-grad job hunting for software engineers.',
    'resume': 'Resumes, cover letters and applications that survive automated screening and get read by a human.',
    'dsa': 'Data structures, algorithms and where to actually practise them - study plans, problem lists and platforms worth your time.',
    'portfolio': 'Projects and portfolios that prove you can build, not just that you finished a tutorial.',
    'open-source': 'Finding a project, landing your first merged pull request, and turning contributions into a hiring signal.',
    'ai-tools': 'The AI tooling working engineers actually use, and how to use it without hollowing out your own skills.',
    'hiring': 'For hiring teams: designing a technical interview loop, setting pass marks, work samples and structured interviews, grounded in selection research.',
    'placements': 'For placement cells and faculty: running a placement season, measuring readiness beyond CGPA, mock interviews at batch scale and coursework projects students can defend.',
}

// ─── Post model ──────────────────────────────────────────────────────────────

export interface BlogPost {
    /** H1 / card title. */
    title: string
    /** <title> tag. Kept separate so it can be shorter and keyword-front-loaded. */
    pageTitle: string
    description: string
    category: BlogCategory
    author: AuthorKey
    datePublished: string
    dateModified: string
    /** Target search terms. Emitted as Article `keywords` and page `keywords`. */
    keywords: readonly string[]
    readingTime: number
    /** Rendered on-page and emitted as FAQPage JSON-LD. Aim for four. */
    faqs: readonly { q: string; a: string }[]
    /** Three hand-picked slugs. Drives the related-posts block and internal linking. */
    relatedSlugs: readonly string[]
    /** Scannable summary shown above the article body. */
    takeaways: readonly string[]
    featured?: boolean
}

export const BLOG_POSTS: Record<string, BlogPost> = {
    // ───────────────────────── Hiring (for companies, REV-83) ─────────────────────────
    'technical-interview-process-design': {
        title: 'How to Design a Technical Interview Process That Predicts Performance',
        pageTitle: 'How to Design a Technical Interview Process',
        description: 'Design an engineering interview loop on purpose: one round per job need, a pass mark and a gate for each, a rubric before the first interview, and a week, not a month.',
        category: 'hiring',
        author: 'niraj',
        datePublished: '2026-09-25',
        dateModified: '2026-09-25',
        keywords: ['technical interview process', 'engineering interview loop', 'how to interview software engineers', 'hiring process design', 'technical hiring'],
        readingTime: 5,
        featured: true,
        takeaways: [
            'Start from four or five things the job needs; every round maps to exactly one.',
            'Structured interviews and work samples are among the strongest predictors of performance.',
            'Decide which rounds are hard gates and which only inform, before anyone applies.',
            'Four rounds in one week beats seven rounds in a month.',
        ],
        faqs: [
            { q: 'How many rounds should an engineering interview have?', a: 'For most roles, four: an aptitude or screening round, a coding round, a system design round and a structured conversation. More rounds mostly cost you your best candidates.' },
            { q: 'What predicts job performance best?', a: 'In the selection research, structured interviews and work samples are among the strongest predictors, and unstructured interviews are among the weakest.' },
            { q: 'What is a hard gate?', a: 'A round where a score below the pass mark ends the process. Other rounds can be advisory: recorded and discussed, but not disqualifying on their own.' },
            { q: 'When should the rubric be written?', a: 'Before the first interview. A rubric written afterwards describes the candidate you liked rather than the job.' },
        ],
        relatedSlugs: ['pass-marks-technical-assessments', 'structured-interviews-engineering-hiring', 'work-sample-vs-take-home-assignment'],
    },
    'pass-marks-technical-assessments': {
        title: 'Setting Pass Marks for Technical Assessments',
        pageTitle: 'How to Set Pass Marks for Technical Assessments',
        description: 'A pass mark is a floor, not a picture of a great hire. Three ways to set it, why hard gates need lower marks, and the checks to run after your first cohort.',
        category: 'hiring',
        author: 'niraj',
        datePublished: '2026-09-25',
        dateModified: '2026-09-25',
        keywords: ['assessment pass mark', 'cut score', 'technical assessment scoring', 'angoff method', 'coding test pass mark'],
        readingTime: 5,
        takeaways: [
            'A pass mark marks the floor of competence, not the score of a good hire.',
            'Set it by item-level expert judgement, by benchmarking current engineers, or from a moderate default.',
            'Hard gates deserve conservative marks; let later rounds do the fine sorting.',
            'After 30 candidates, check the distribution, agreement with later rounds, and adverse impact.',
        ],
        faqs: [
            { q: 'What pass mark should a coding assessment have?', a: 'There is no universal number. Anchor it to what a minimally competent engineer would score, start moderate (60 is a common default), and adjust with data from your first cohort.' },
            { q: 'What is the Angoff method?', a: 'A standard-setting method where experts estimate, for each question, the probability that a minimally competent candidate answers it correctly. The pass mark is the sum of those estimates.' },
            { q: 'What is the four-fifths rule?', a: 'A guideline from the US EEOC: if a group is selected at less than 80% of the rate of the highest-selected group, that is generally treated as evidence of adverse impact.' },
            { q: 'Should candidates be allowed to retake?', a: 'Yes, with a cool-down. A retake after a day costs little, and drawing a fresh question set discourages memorising.' },
        ],
        relatedSlugs: ['technical-interview-process-design', 'hiring-junior-engineers-without-resume-filter', 'work-sample-vs-take-home-assignment'],
    },
    'work-sample-vs-take-home-assignment': {
        title: 'Work Samples vs Take-Home Assignments: Which to Use When',
        pageTitle: 'Work Sample vs Take-Home Assignment in Hiring',
        description: 'Short, timed work samples predict well and are fair at volume. Take-homes cost candidates a weekend. When each is right, and how to make a take-home fair.',
        category: 'hiring',
        author: 'niraj',
        datePublished: '2026-09-25',
        dateModified: '2026-09-25',
        keywords: ['take home assignment', 'work sample test', 'coding take home', 'technical assessment', 'hiring assignment'],
        readingTime: 4,
        takeaways: [
            'A work sample is a short, timed task that looks like the job; a take-home is a longer task on the candidate\'s time.',
            'Take-homes filter for free time and hide who did the work.',
            'Use them only where sustained independent work is the job, with a cap, a rubric and a follow-up conversation.',
            'Never make both a hard gate in the same loop.',
        ],
        faqs: [
            { q: 'How long should a take-home assignment take?', a: 'Two hours or less, with the scope capped in writing. If it runs longer, pay for it or offer a live alternative.' },
            { q: 'Are work samples better than interviews?', a: 'They are among the stronger predictors in the research, and they produce real work to judge. A structured interview complements them well.' },
            { q: 'How do I know the candidate did the take-home themselves?', a: 'Ask about two or three specific decisions in a follow-up conversation. Understanding shows quickly.' },
            { q: 'Which should I use for junior roles?', a: 'A timed work sample. It is fair at volume and does not penalise people without free weekends.' },
        ],
        relatedSlugs: ['technical-interview-process-design', 'structured-interviews-engineering-hiring', 'hiring-junior-engineers-without-resume-filter'],
    },
    'structured-interviews-engineering-hiring': {
        title: 'Structured Interviews for Engineering Hiring',
        pageTitle: 'Structured Interviews for Engineers: A Guide',
        description: 'Same questions, tied to the job, scored against a rubric written in advance, recorded independently. Why structure predicts so much better, and how to write the rubric.',
        category: 'hiring',
        author: 'niraj',
        datePublished: '2026-09-25',
        dateModified: '2026-09-25',
        keywords: ['structured interview', 'interview rubric', 'behavioral interview engineers', 'interview scorecard', 'reduce interview bias'],
        readingTime: 4,
        takeaways: [
            'Structure means the same questions, tied to the job, scored against a rubric, recorded independently.',
            'Structured interviews had the highest estimated validity in a 2022 re-analysis of selection research.',
            'Write strong, acceptable and weak anchors for every question before any interview.',
            'Collect every score before the debrief starts.',
        ],
        faqs: [
            { q: 'What makes an interview structured?', a: 'The same job-related questions for every candidate, a rubric written in advance, and scores recorded independently before discussion.' },
            { q: 'Does structure make interviews robotic?', a: 'No. It constrains what you ask and how you judge, not how warm you are.' },
            { q: 'What scale should a rubric use?', a: 'A small one, 1 to 4 works well because it removes the easy middle score.' },
            { q: 'Can a voice interview be structured?', a: 'Yes. Asking every candidate the same questions and scoring against the same rubric is exactly what structure means.' },
        ],
        relatedSlugs: ['technical-interview-process-design', 'work-sample-vs-take-home-assignment', 'pass-marks-technical-assessments'],
    },
    'hiring-junior-engineers-without-resume-filter': {
        title: 'Hiring Junior Engineers Without a Resume Filter',
        pageTitle: 'How to Hire Junior Engineers Without Resume Filters',
        description: 'Resume filters on junior roles select for background. Replace them with a short, fair first round for everyone, then judge the projects the survivors can explain.',
        category: 'hiring',
        author: 'niraj',
        datePublished: '2026-09-25',
        dateModified: '2026-09-25',
        keywords: ['hiring junior developers', 'entry level engineering hiring', 'skills based hiring', 'resume screening alternatives', 'campus hiring'],
        readingTime: 4,
        takeaways: [
            'For juniors, a resume mostly describes circumstances, not ability.',
            'Send every applicant the same short, auto-scored first round with a floor pass mark.',
            'Then ask the survivors about decisions in one project they built.',
            'Keep the loop to a week, and check pass rates across groups.',
        ],
        faqs: [
            { q: 'How do I screen hundreds of junior applicants?', a: 'With a short, automatically scored first round that everyone takes, instead of reading every resume.' },
            { q: 'What should the first round be?', a: 'An aptitude set or one easy coding problem, 20 to 30 minutes, drawn from a pool so answers do not circulate.' },
            { q: 'What should I ask about their projects?', a: 'About decisions: why this database, what broke and how they found it, what they would change.' },
            { q: 'How do I know the round is fair?', a: 'Compare pass rates across groups; a rate under 80% of the highest group is a signal to review the round.' },
        ],
        relatedSlugs: ['pass-marks-technical-assessments', 'technical-interview-process-design', 'structured-interviews-engineering-hiring'],
    },

    // ───────────────────────── Placements (for universities, REV-31) ─────────────────────────
    'placement-season-plan': {
        title: 'How to Run a Campus Placement Season: A Semester Plan for Placement Cells',
        pageTitle: 'Campus Placement Season Plan for Placement Cells',
        description: 'A month-by-month plan for placement cells: a readiness baseline, resume clinics, mock interviews, company outreach with evidence, drive logistics and offer tracking.',
        category: 'placements',
        author: 'niraj',
        datePublished: '2026-09-26',
        dateModified: '2026-09-26',
        keywords: ['placement season plan', 'training and placement officer', 'campus placement process', 'placement cell activities', 'campus drive planning'],
        readingTime: 6,
        featured: true,
        takeaways: [
            'Measure the batch in the first month, with the same short baseline for every department.',
            'Fix resumes and projects early; they are cheap to fix and the first thing a recruiter sees.',
            'Pitch companies with evidence about the batch, not a headcount.',
            'Most bad drives fail on logistics: eligibility, clashes, lab machines and no-shows.',
        ],
        faqs: [
            { q: 'When should a placement cell start preparing for the season?', a: 'At least a semester before the first drive. The months before the season are when readiness can still change; during the season the work is mostly logistics.' },
            { q: 'What should a readiness baseline include?', a: 'A short timed aptitude set, one or two easy coding problems, a resume check and the one project each student would talk about in an interview. Under an hour, identical for every department.' },
            { q: 'How do we make company outreach more effective?', a: 'Send a one-page profile per department built from real baseline and mock results, with the dates, rooms and contact person you can offer. Keep it honest.' },
            { q: 'When should the offer policy be decided?', a: 'Before the first drive, in writing. A policy decided mid-season always looks like favouritism to someone.' },
        ],
        relatedSlugs: ['placement-readiness-metrics', 'mock-interviews-at-scale', 'campus-recruiting-what-companies-want'],
    },
    'placement-readiness-metrics': {
        title: 'Measuring Placement Readiness: What to Track Beyond CGPA',
        pageTitle: 'Placement Readiness Metrics Beyond CGPA',
        description: 'Five signals that say more about placement readiness than CGPA, how to baseline a batch in an hour, and how to track departments without surveilling students.',
        category: 'placements',
        author: 'niraj',
        datePublished: '2026-09-26',
        dateModified: '2026-09-26',
        keywords: ['placement readiness', 'employability assessment', 'placement cell metrics', 'student readiness tracking', 'beyond cgpa'],
        readingTime: 6,
        takeaways: [
            'CGPA decides eligibility; it does not say whether a student clears the rounds.',
            'Track five signals: problem solving, one finished project, a mock score, resume quality and communication.',
            'Use three buckets per signal and compare each department with itself over the semester.',
            'Report aggregates outside the cell, never track activity, and let students see their own record.',
        ],
        faqs: [
            { q: 'Is CGPA a good measure of placement readiness?', a: 'It is a necessary input, because many companies use it as an eligibility cut-off, but it does not measure whether a student can solve problems under time pressure or explain their own work.' },
            { q: 'What should a placement cell measure instead?', a: 'Timed problem solving, one finished project the student can explain, a structured mock interview score, resume quality against a written standard, and communication.' },
            { q: 'How often should readiness be measured?', a: 'Three times: at the start of the semester, in the middle, and before the season opens. The movement between runs is the useful number.' },
            { q: 'How do we avoid readiness tracking feeling like surveillance?', a: 'Tell students what is measured and why, report only aggregates to faculty, do not track activity such as login times, and let students see and correct their own record.' },
        ],
        relatedSlugs: ['placement-season-plan', 'mock-interviews-at-scale', 'project-based-learning-cs'],
    },
    'mock-interviews-at-scale': {
        title: 'Mock Interviews for a Whole Batch: How to Run Them Without Burning Out Faculty',
        pageTitle: 'Mock Interviews at Scale for Placement Cells',
        description: 'A structure and a four-line rubric for batch mock interviews, AI voice mocks as the first pass for everyone, and faculty time saved for the final rounds.',
        category: 'placements',
        author: 'niraj',
        datePublished: '2026-09-26',
        dateModified: '2026-09-26',
        keywords: ['mock interviews for students', 'campus mock interview', 'mock interview rubric', 'ai mock interview', 'placement training'],
        readingTime: 5,
        takeaways: [
            'Give every student the same structured 25-minute mock, drawn from a question pool.',
            'Score four things on a 1 to 4 scale: clarity, depth on their own work, reasoning and evidence.',
            'Use AI voice mocks as the first pass for the whole batch, and save faculty for final rounds.',
            'Feedback within a day, one thing to change, and a second mock to check it took.',
        ],
        faqs: [
            { q: 'How long should a campus mock interview be?', a: 'About 25 minutes: a short introduction, a project walkthrough, one technical question and one behavioural question.' },
            { q: 'What rubric should mock interviewers use?', a: 'Four criteria scored 1 to 4: clarity, depth on the student\'s own work, reasoning on the technical question, and evidence in behavioural answers, each with written anchors.' },
            { q: 'Can AI voice mocks replace faculty mock interviews?', a: 'No. They are a good first pass for structure, timing and obvious gaps, and they scale to a whole batch. Faculty and alumni are still needed for the final rounds and unexpected follow-ups.' },
            { q: 'How do we stop faculty burning out on mocks?', a: 'Cap slots per faculty member per week, give them the rubric and question pool in advance, route students through a first pass, and require confirmation the evening before.' },
        ],
        relatedSlugs: ['placement-readiness-metrics', 'campus-recruiting-what-companies-want', 'placement-season-plan'],
    },
    'project-based-learning-cs': {
        title: 'Real Projects in Coursework: Assigning Work Students Can Talk About in Interviews',
        pageTitle: 'Project-Based Learning in CS Coursework',
        description: 'How faculty can scope, schedule and grade coursework projects so every student leaves with one finished project they can explain, and copying stops paying.',
        category: 'placements',
        author: 'niraj',
        datePublished: '2026-09-26',
        dateModified: '2026-09-26',
        keywords: ['project based learning computer science', 'engineering student projects', 'mini project ideas assessment', 'project rubric', 'final year project'],
        readingTime: 5,
        takeaways: [
            'Recruiters ask about decisions, bugs and trade-offs, not technologies.',
            'Scope one core feature with a real constraint, and specify the problem rather than the stack.',
            'Use checkpoints, and require a decision log; it is what students revise from before interviews.',
            'Put most of the marks in the decision log and an individual viva, the parts that cannot be copied.',
        ],
        faqs: [
            { q: 'What do interviewers ask about a student project?', a: 'Why they chose the approach, the hardest bug and how they found it, what would break at ten times the users, what they would change, and which part they built themselves.' },
            { q: 'How should a coursework project be scoped?', a: 'Small enough to finish and deploy within the course: one core feature done properly, a real constraint that forces decisions, and freedom to choose the stack.' },
            { q: 'How do we stop students copying projects?', a: 'Make the brief local, check code similarity within the batch, and let an individual viva decide: ask the student to change or explain a part of their code live.' },
            { q: 'Should students be allowed to use AI tools on projects?', a: 'Banning them is unenforceable. Require students to state what they used and to explain every line they submit in the viva.' },
        ],
        relatedSlugs: ['placement-readiness-metrics', 'mock-interviews-at-scale', 'campus-recruiting-what-companies-want'],
    },
    'campus-recruiting-what-companies-want': {
        title: 'What Companies Look For in Campus Hiring, and How to Prepare Students for It',
        pageTitle: 'What Companies Look For in Campus Hiring',
        description: 'The rounds of a campus hiring process, from online test to HR, what each one is for, and a one-page brief placement cells can send students before every drive.',
        category: 'placements',
        author: 'niraj',
        datePublished: '2026-09-26',
        dateModified: '2026-09-26',
        keywords: ['campus recruitment process', 'what companies look for in freshers', 'campus placement rounds', 'placement preparation for students', 'campus drive briefing'],
        readingTime: 6,
        takeaways: [
            'Campus hiring is a funnel: cheap automatic rounds first, expensive human rounds last.',
            'Early rounds clear a floor quickly; late rounds test judgement. Prepare for them differently.',
            'Freshers get light design questions that test trade-offs, not architecture diagrams.',
            'Send a one-page brief before every drive, and record what was asked afterwards.',
        ],
        faqs: [
            { q: 'What rounds does a campus placement usually have?', a: 'Commonly an online screening test, a coding round, one or more technical interviews, sometimes a light system design question, and a behavioural or HR round. Each company varies.' },
            { q: 'Do freshers get system design questions?', a: 'Some product companies ask a light one: how to store some data or make a page faster. The test is reasoning about trade-offs, not designing large distributed systems.' },
            { q: 'What should a pre-drive brief contain?', a: 'The company in three lines, the rounds in order, exact eligibility, logistics, one tip per round and the offer policy. One page, sent two or three days before.' },
            { q: 'How can a placement cell build better preparation material?', a: 'Spend ten minutes after every drive writing down what was actually asked. Over a season it becomes the most accurate preparation material the college has.' },
        ],
        relatedSlugs: ['placement-season-plan', 'mock-interviews-at-scale', 'project-based-learning-cs'],
    },

    // ───────────────────────── Portfolio & Projects ─────────────────────────
    'software-engineering-portfolio-guide': {
        title: 'How to Build a Software Engineering Portfolio That Gets You Hired',
        pageTitle: 'Software Engineering Portfolio: What to Build',
        description: 'What to include in a software engineering portfolio and what to skip. Three finished, deployed projects beat twelve half-built repositories.',
        category: 'portfolio',
        author: 'niraj',
        datePublished: '2025-05-01',
        dateModified: '2026-07-30',
        keywords: ['software engineering portfolio', 'developer portfolio', 'portfolio projects for software engineer', 'github portfolio', 'web developer portfolio'],
        readingTime: 13,
        featured: true,
        takeaways: [
            'Three finished, deployed projects beat twelve half-built repos every time.',
            'A recruiter gives your portfolio under 30 seconds - lead with a live demo link, not a wall of text.',
            'Every project needs a README that explains the problem, the decisions, and the trade-offs you made.',
            'Clone projects are fine as practice, but only original problems differentiate you.',
        ],
        faqs: [
            { q: 'How many projects should a software engineering portfolio have?', a: 'Three strong projects is the sweet spot. Each should be deployed, documented, and something you can talk about for ten minutes. A long list of unfinished repos actively hurts you because it signals you do not ship.' },
            { q: 'Do I need a portfolio website or is GitHub enough?', a: 'GitHub alone is enough to get a first look, but a simple portfolio site converts better because it controls the narrative. It lets you lead with live demos and outcomes instead of file trees.' },
            { q: 'Are clone projects like a Netflix clone bad for a portfolio?', a: 'They are not disqualifying, but they are not differentiating either - hundreds of candidates have the same one. Use clones to learn a stack, then build one original project that solves a problem you personally have.' },
            { q: 'What should a project README contain?', a: 'A one-line description, a live demo link, a screenshot or GIF, the problem it solves, the architecture at a high level, and the trade-offs you made. Setup instructions come last, not first.' },
        ],
        relatedSlugs: ['portfolio-project-ideas-software-engineer', 'deploy-your-portfolio-project', 'github-profile-software-engineer'],
    },

    // ───────────────────────── Interview Prep ─────────────────────────
    'system-design-interview-prep': {
        title: 'System Design Interview Prep: The Complete Roadmap for CS Students',
        pageTitle: 'System Design Interview Prep: A Complete Roadmap',
        description: 'A twelve-week plan for system design interviews: the fundamentals worth knowing, how to structure the conversation, and thirty problems that cover most rounds.',
        category: 'interview-prep',
        author: 'niraj',
        datePublished: '2025-05-05',
        dateModified: '2026-07-30',
        keywords: ['system design interview', 'system design interview prep', 'system design roadmap', 'scalability interview', 'distributed systems interview'],
        readingTime: 14,
        featured: true,
        takeaways: [
            'System design is graded on your process, not on arriving at one correct architecture.',
            'Spend the first five minutes clarifying requirements - candidates who skip this almost always fail.',
            'Learn the five building blocks (load balancer, cache, queue, database, CDN) before memorising any case study.',
            'Estimate numbers out loud. Interviewers want to see you reason about scale, not recite it.',
        ],
        faqs: [
            { q: 'How long does it take to prepare for a system design interview?', a: 'Six to eight weeks of consistent study is realistic for a first system design loop, assuming five to seven hours a week. Engineers with production experience often need less because they have seen the failure modes already.' },
            { q: 'Do new grads get system design interviews?', a: 'Increasingly yes, though the bar is lower. New-grad system design rounds test whether you understand components and trade-offs, not whether you can design a globally distributed system.' },
            { q: 'What should I say in the first five minutes of a system design interview?', a: 'Ask clarifying questions: who the users are, expected scale, read/write ratio, latency expectations, and which features are in scope. Then state your assumptions out loud before drawing anything.' },
            { q: 'Is it bad to say "I do not know" in a system design interview?', a: 'No, as long as you follow it with how you would find out or reason toward an answer. Bluffing a wrong answer confidently is far worse than admitting a gap and working through it.' },
        ],
        relatedSlugs: ['technical-phone-screen-guide', 'mock-technical-interview-guide', 'dsa-study-plan-coding-interview'],
    },

    'mock-technical-interview-guide': {
        title: 'Mock Technical Interviews: Practice That Actually Improves Performance',
        pageTitle: 'Mock Technical Interviews: A Practical Guide',
        description: 'How to run a mock interview worth the hour, who to do it with, and the feedback that changes your performance rather than flattering it.',
        category: 'interview-prep',
        author: 'niraj',
        datePublished: '2025-05-11',
        dateModified: '2026-07-30',
        keywords: ['mock interview practice', 'mock technical interview', 'technical interview practice', 'coding interview practice', 'how to practice for technical interviews'],
        readingTime: 12,
        takeaways: [
            'Solving problems silently is not interview practice - the performance is the skill being tested.',
            'Record yourself. Nearly every fixable weakness is obvious on playback and invisible in the moment.',
            'One mock per week with real feedback beats five unstructured sessions.',
            'Practise the failure case: what you do when you are stuck is what actually gets graded.',
        ],
        faqs: [
            { q: 'How many mock interviews should I do before a real one?', a: 'Four to six full-length mocks is enough for most candidates to stop freezing. What matters more is that each one is followed by a review where you identify one specific thing to change.' },
            { q: 'Are AI mock interviews as good as practising with a human?', a: 'They are better for volume, consistency and immediate feedback on structure and communication. Human mocks are still better for reading ambiguity and pushback. Most candidates should use AI mocks for reps and humans for calibration.' },
            { q: 'What should I do when I get stuck in a technical interview?', a: 'Say what you are thinking, state what you have ruled out, and propose a brute-force solution to establish a baseline. Silence is the only genuinely bad option.' },
            { q: 'Should I practise coding on a whiteboard or in an editor?', a: 'Practise in whatever medium the real interview uses. Most companies now use a shared editor without autocomplete, so practising in a full IDE builds a dependency you will not have on the day.' },
        ],
        relatedSlugs: ['technical-phone-screen-guide', 'how-to-approach-coding-interview-problems', 'behavioral-interview-questions-software-engineer'],
    },

    'star-method-interview-software-engineers': {
        title: 'The STAR Method for Software Engineers: Answer Any Behavioural Question',
        pageTitle: 'STAR Method for Software Engineers',
        description: 'The STAR method applied to engineering answers, the mistake most people make in the Result step, and worked examples for the questions you will get.',
        category: 'interview-prep',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['star method interview', 'star interview method', 'star method examples', 'behavioural interview software engineer', 'star technique interview answers'],
        readingTime: 14,
        featured: true,
        takeaways: [
            'STAR is Situation, Task, Action, Result - and Result is the part almost everyone drops.',
            'Spend roughly 10% on Situation, 10% on Task, 60% on Action, 20% on Result.',
            'Say "I", not "we". Interviewers are grading your contribution, not your team\'s.',
            'Six prepared stories cover almost every behavioural question you will be asked.',
            'Quantify the result even when the number is unglamorous - "cut deploy time from 40 to 12 minutes" beats "improved things".',
        ],
        faqs: [
            { q: 'What does STAR stand for in interviews?', a: 'Situation, Task, Action, Result. You set the context, state what you were responsible for, describe what you specifically did, then close with the measurable outcome. The final step is the one candidates most often skip.' },
            { q: 'How long should a STAR answer be?', a: 'Between 90 seconds and two minutes. Under a minute usually means you skipped the Action detail; past three minutes interviewers stop tracking the story and start waiting for you to finish.' },
            { q: 'How many STAR stories should I prepare?', a: 'Six well-chosen stories covering conflict, failure, leadership, a technical deep dive, a tight deadline and an ambiguous problem will map onto almost any behavioural question with light reframing.' },
            { q: 'Can I use the same STAR story for more than one question?', a: 'Yes. Within a single interview loop use each story once, but reusing a story across different rounds is normal and expected. Adjust which part you emphasise to match the question being asked.' },
        ],
        relatedSlugs: ['behavioral-interview-questions-software-engineer', 'questions-to-ask-interviewer-software-engineer', 'mock-technical-interview-guide'],
    },

    'behavioral-interview-questions-software-engineer': {
        title: '30 Behavioural Interview Questions for Software Engineers (With Real Answers)',
        pageTitle: 'Behavioural Interview Questions for Engineers',
        description: 'The behavioural questions engineers actually get asked, what each is really testing, and how to prepare stories that survive a follow-up.',
        category: 'interview-prep',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['behavioral interview questions software engineer', 'software engineer behavioral interview', 'behavioural questions developers', 'tell me about yourself software engineer', 'engineering culture fit interview'],
        readingTime: 10,
        takeaways: [
            'Behavioural rounds are not a formality - they are where most senior candidates get rejected.',
            'Every question maps to a small set of traits: ownership, collaboration, judgement, and how you handle being wrong.',
            '"Tell me about a failure" is testing whether you can be honest, not whether you have failed.',
            'Prepare stories, not answers. Questions vary; the underlying material does not.',
        ],
        faqs: [
            { q: 'Do behavioural interviews matter for software engineers?', a: 'They matter enormously, especially from mid-level upwards. Many companies weight the behavioural round equally with technical rounds, and it is a common reason otherwise strong candidates are rejected.' },
            { q: 'What is the best way to answer "tell me about yourself" as a software engineer?', a: 'Give a 90-second arc: where you are now, one or two things you have built that matter, and why this role is the logical next step. It is a positioning statement, not a biography.' },
            { q: 'How do I answer "tell me about a time you failed" without hurting my chances?', a: 'Pick a real failure with real consequences, own your part in it without blaming teammates, and spend most of the answer on what you changed afterwards. Interviewers are testing self-awareness, not looking for a perfect record.' },
            { q: 'Should I prepare answers word for word?', a: 'No. Memorised answers sound rehearsed and collapse under follow-up questions. Prepare the beats of each story - context, your action, the outcome - and let the wording vary.' },
        ],
        relatedSlugs: ['star-method-interview-software-engineers', 'questions-to-ask-interviewer-software-engineer', 'mock-technical-interview-guide'],
    },

    'questions-to-ask-interviewer-software-engineer': {
        title: 'Questions to Ask Your Interviewer (And What the Answers Actually Reveal)',
        pageTitle: 'Questions to Ask Your Interviewer',
        description: 'Questions that tell you something real about a job, grouped by who to ask them of, plus the ones that quietly cost you an offer.',
        category: 'interview-prep',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['questions to ask interviewer software engineer', 'questions to ask at end of interview', 'reverse interview questions', 'what to ask hiring manager engineering', 'engineering interview red flags'],
        readingTime: 8,
        takeaways: [
            'The questions you ask are scored. "No, I think you covered everything" is a weak signal.',
            'Ask about process and reality, not perks - on-call, code review, how work gets prioritised.',
            'Match the question to the interviewer: engineers get technical questions, managers get team questions.',
            'Vague answers about deployment frequency or on-call load are the most reliable red flag there is.',
        ],
        faqs: [
            { q: 'How many questions should I ask at the end of an interview?', a: 'Two or three well-chosen questions is right for a 45-minute round. Prepare five or six so you are not stranded when earlier conversation has already covered some of them.' },
            { q: 'Is it bad to ask about salary in a technical interview?', a: 'It is not bad, but the technical round is the wrong venue. Compensation belongs with the recruiter or hiring manager, where it will not eat into time you could use to learn about the work.' },
            { q: 'What questions reveal the most about engineering culture?', a: 'Ask how long it takes for a one-line change to reach production, what the on-call rotation looks like, and how the team decided what to build this quarter. The specificity of the answers tells you more than the answers themselves.' },
            { q: 'What are red flags in an interviewer\'s answers?', a: 'Not being able to name a recent deploy, describing on-call vaguely, "we are like a family", and long pauses when asked about work-life balance. Any of these deserve a follow-up question.' },
        ],
        relatedSlugs: ['behavioral-interview-questions-software-engineer', 'star-method-interview-software-engineers', 'new-grad-software-engineer-jobs'],
    },

    // ───────────────────────── DSA & Practice ─────────────────────────
    'dsa-study-plan-coding-interview': {
        title: 'The 3-Month DSA Study Plan to Crack Any Coding Interview',
        pageTitle: '3-Month DSA Study Plan for Coding Interviews',
        description: 'A three-month DSA plan with a week-by-week sequence, the problems to solve in each, and what to do when a topic will not stick.',
        category: 'dsa',
        author: 'niraj',
        datePublished: '2025-05-12',
        dateModified: '2026-07-30',
        keywords: ['dsa study plan', 'dsa roadmap', 'data structures and algorithms plan', 'coding interview preparation', 'leetcode study plan'],
        readingTime: 15,
        featured: true,
        takeaways: [
            'Pattern coverage beats problem count - 150 problems across 15 patterns outperforms 500 random ones.',
            'Do not start with dynamic programming. It is the last topic, not the first.',
            'Re-solve problems you got wrong after a week. First-pass solving builds recognition, not recall.',
            'Two focused hours a day for three months is enough for most interview loops.',
        ],
        faqs: [
            { q: 'How many LeetCode problems do I need to solve for interviews?', a: 'Around 150 to 200 problems chosen to cover the common patterns is enough for most companies. Candidates who grind 500 problems without tracking patterns typically do worse than those who do 150 deliberately.' },
            { q: 'How long does it take to prepare DSA from scratch?', a: 'Three months at roughly two focused hours a day is realistic if you already know one language well. Starting from no programming experience, plan on six months.' },
            { q: 'Which topics matter most for coding interviews?', a: 'Arrays and hashing, two pointers, sliding window, binary search, trees, graphs and heaps cover the large majority of questions. Dynamic programming appears often but is rarely the deciding factor at entry level.' },
            { q: 'Should I use Python or my main language for interviews?', a: 'Use the language you are fastest in, unless the role explicitly requires another. Python is popular in interviews because it minimises syntax overhead, but a fluent Java or C++ candidate should not switch weeks before a loop.' },
        ],
        relatedSlugs: ['coding-interview-patterns', 'dynamic-programming-interview-guide', 'leetcode-alternatives'],
    },

    'leetcode-alternatives': {
        title: 'LeetCode Alternatives: 12 Better Ways to Practise for Coding Interviews',
        pageTitle: 'LeetCode Alternatives Worth Your Time',
        description: 'LeetCode is not the only way to prepare, and for some formats it is the wrong one. Twelve alternatives compared by what each is good at.',
        category: 'dsa',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['leetcode alternative', 'leetcode alternatives', 'coding practice sites', 'best coding interview platforms', 'sites like leetcode'],
        readingTime: 8,
        takeaways: [
            'LeetCode optimises for algorithmic puzzles - it does not prepare you for take-homes, debugging rounds or system design.',
            'Match the platform to the interview format you are actually facing.',
            'Free tiers are enough for the large majority of candidates.',
            'Reading other people\'s solutions is a legitimate practice mode and badly underused.',
        ],
        faqs: [
            { q: 'Is LeetCode still worth it?', a: 'Yes, for companies that run algorithmic screens - which is still most large tech employers. It just should not be your only preparation, because it does not cover take-homes, debugging rounds or design interviews.' },
            { q: 'What is the best free alternative to LeetCode?', a: 'Codeforces for algorithmic depth, Exercism for language fluency with human mentorship, and NeetCode for a structured pattern-first path through the classic problem set. All three have substantial free tiers.' },
            { q: 'Which platform is best for practising system design?', a: 'System design is poorly served by problem grinders. Structured written case studies plus mock sessions where you have to defend decisions out loud work far better than any problem list.' },
            { q: 'How do I practise for take-home assignments?', a: 'Build small, complete projects under a real time limit - four hours, scoped, tested, with a README. The skill being tested is judgement about scope and quality bars, which no algorithm site trains.' },
        ],
        relatedSlugs: ['coding-interview-patterns', 'dsa-study-plan-coding-interview', 'big-o-notation-explained'],
    },

    // ───────────────────────── Resume & Applications ─────────────────────────
    'ats-resume-software-engineer': {
        title: 'ATS Resume Guide for Software Engineers: Beat the Bots, Get Interviews',
        pageTitle: 'ATS Resume Guide for Software Engineers',
        description: 'How applicant tracking systems actually work, what they really filter out, and exactly how to format a software engineering resume so a human ever sees it.',
        category: 'resume',
        author: 'niraj',
        datePublished: '2025-05-09',
        dateModified: '2026-07-30',
        keywords: ['ats resume', 'ats resume checker', 'software engineer resume', 'applicant tracking system resume', 'resume format for software engineer'],
        readingTime: 11,
        featured: true,
        takeaways: [
            'Most ATS platforms do not auto-reject you - recruiters filter by keyword search, which is a different failure mode.',
            'Single column, standard headings, no text inside images or tables.',
            'Mirror the exact wording of the job description for skills you genuinely have.',
            'One page until roughly eight years of experience, then two at most.',
        ],
        faqs: [
            { q: 'Do applicant tracking systems automatically reject resumes?', a: 'Rarely. Most systems parse your resume and let recruiters search and filter it. The real failure is being parsed badly or missing the keywords a recruiter searches for, so you never appear in their results.' },
            { q: 'What resume format is most ATS-friendly?', a: 'A single-column layout with standard section headings, a common font, no text inside images, tables or headers, and a PDF export generated from real text rather than a scan.' },
            { q: 'Should I include a skills section on a software engineer resume?', a: 'Yes. It is the section recruiters keyword-search most. List technologies you can actually be interviewed on, grouped simply, without proficiency bars or star ratings.' },
            { q: 'How long should a software engineer resume be?', a: 'One page for students and engineers with under about eight years of experience. Two pages is acceptable beyond that, but a padded two-page resume reads worse than a tight one-page one.' },
        ],
        relatedSlugs: ['software-engineer-resume-bullet-points', 'ai-resume-screening-explained', 'software-engineer-cover-letter'],
    },

    'software-engineer-cover-letter': {
        title: 'The Software Engineer Cover Letter That Actually Gets Read',
        pageTitle: 'Software Engineer Cover Letter Guide',
        description: 'When a cover letter is worth writing, the four-paragraph structure that works, and the opening paragraph almost everybody gets wrong.',
        category: 'resume',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['software engineer cover letter', 'cover letter for developer', 'cover letter examples software engineering', 'how to write a cover letter developer', 'tech cover letter template'],
        readingTime: 10,
        takeaways: [
            'A cover letter is only worth writing if it says something your resume cannot.',
            'Four short paragraphs, under 250 words. Nobody reads more than that.',
            'Open with a specific reason you want this company, not "I am writing to apply for".',
            'Generic AI-written letters are now easy to spot and actively count against you.',
        ],
        faqs: [
            { q: 'Do software engineers still need cover letters?', a: 'For most large-company applications they are optional and rarely read. They matter disproportionately for startups, career changers, and any role where you need to explain a gap or an unusual background.' },
            { q: 'How long should a software engineer cover letter be?', a: 'Under 250 words, in four short paragraphs. Anything longer will be skimmed at best, and length is not read as effort.' },
            { q: 'Should I use AI to write my cover letter?', a: 'Use it to draft and tighten, not to generate wholesale. Recruiters see hundreds of the same AI-generated phrasing each week, and an obviously templated letter is worse than no letter at all.' },
            { q: 'What should the first line of a cover letter be?', a: 'A specific, verifiable reason you are applying to this company in particular - a product decision you admire, a technical blog post they published, a problem in their domain you have worked on.' },
        ],
        relatedSlugs: ['ats-resume-software-engineer', 'new-grad-software-engineer-jobs', 'behavioral-interview-questions-software-engineer'],
    },

    // ───────────────────────── Career ─────────────────────────
    'how-to-become-a-software-engineer': {
        title: 'How to Become a Software Engineer: The Realistic Path',
        pageTitle: 'How to Become a Software Engineer',
        description: 'An honest route into software engineering in a hard entry-level market: what to learn, in what order, and the realistic timeline.',
        category: 'career',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['how to become a software engineer', 'software engineer career', 'become a developer without a degree', 'software engineer requirements', 'how long to become a software engineer'],
        readingTime: 9,
        featured: true,
        takeaways: [
            'You do not need a CS degree, but you do need what a CS degree provides: fundamentals, projects, and a network.',
            'Twelve to twenty-four months of consistent work is the honest timeline for job-readiness.',
            'Depth in one stack beats shallow familiarity with six.',
            'The entry-level market is harder than it was in 2021 - proof of work matters more than credentials.',
        ],
        faqs: [
            { q: 'Can I become a software engineer without a degree?', a: 'Yes, and many working engineers have. Without a degree you carry more of the burden of proof, which in practice means shipped projects, open source contributions, and a referral network doing the work a degree would otherwise do.' },
            { q: 'How long does it take to become a software engineer?', a: 'Twelve to twenty-four months of consistent, structured effort is the realistic range for someone starting from scratch and working at it seriously part-time. Bootcamp marketing claims of three months describe the classroom, not employability.' },
            { q: 'Which programming language should I learn first?', a: 'Python or JavaScript for most people. Both have enormous job markets, gentle syntax, and huge learning ecosystems. The specific choice matters far less than picking one and going deep.' },
            { q: 'Is software engineering still a good career?', a: 'Yes, though entry-level is genuinely more competitive than it was during the 2021 hiring boom. Demand for engineers who can work effectively with AI tooling and reason about systems remains strong.' },
        ],
        relatedSlugs: ['full-stack-developer-roadmap', 'software-engineer-career-path', 'new-grad-software-engineer-jobs'],
    },

    'full-stack-developer-roadmap': {
        title: 'The Full Stack Developer Roadmap',
        pageTitle: 'Full Stack Developer Roadmap',
        description: 'A no-nonsense full stack developer roadmap - what to learn, in what order, what to safely ignore, and how to tell when you are actually ready to apply for jobs.',
        category: 'career',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['full stack developer roadmap', 'full stack roadmap', 'how to become a full stack developer', 'full stack developer skills', 'web development roadmap'],
        readingTime: 9,
        featured: true,
        takeaways: [
            'Learn HTML, CSS and JavaScript properly before any framework. Skipping this is the most common and most expensive mistake.',
            'One frontend framework, one backend runtime, one database. Add nothing until you have shipped with those.',
            'Databases and HTTP are the two areas self-taught developers are consistently weakest in.',
            'You are ready to apply when you can build and deploy a full CRUD app with auth from an empty folder.',
        ],
        faqs: [
            { q: 'How long does it take to become a full stack developer?', a: 'Around twelve to eighteen months of consistent part-time study for someone starting from scratch. The frontend half typically takes less time than most people expect and the backend half more.' },
            { q: 'Should I learn frontend or backend first?', a: 'Frontend first, because the feedback loop is visual and immediate, which sustains motivation. Once you can build interfaces, backend concepts like APIs and databases have somewhere concrete to attach to.' },
            { q: 'Do I need to learn TypeScript?', a: 'Yes, for essentially any modern JavaScript job. Learn plain JavaScript first so you understand what TypeScript is adding, then switch - most professional codebases you will join are TypeScript.' },
            { q: 'Is full stack development still in demand?', a: 'Yes, particularly at startups and mid-sized companies where one engineer owning a feature end to end is more valuable than deep specialisation. Large companies still tend to hire for one side or the other.' },
        ],
        relatedSlugs: ['how-to-become-a-software-engineer', 'software-engineering-portfolio-guide', 'software-engineer-career-path'],
    },

    'software-engineer-career-path': {
        title: 'The Software Engineer Career Path: From Intern to Staff Engineer',
        pageTitle: 'Software Engineer Career Path: Levels Explained',
        description: 'The engineering ladder from junior to staff, what changes at each level, and where the individual contributor and management tracks split.',
        category: 'career',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['software engineer career path', 'software engineer levels', 'senior software engineer requirements', 'staff engineer vs engineering manager', 'engineering career ladder'],
        readingTime: 9,
        takeaways: [
            'Levels are defined by scope of ownership, not years served or technical difficulty.',
            'The jump from mid-level to senior is about owning ambiguity, not writing better code.',
            'Promotion follows demonstrated behaviour at the next level - you operate there first, then get the title.',
            'Management is a different job, not a promotion from engineering.',
        ],
        faqs: [
            { q: 'How long does it take to become a senior software engineer?', a: 'Typically five to eight years, though it varies widely by company and how much ownership you have been given. Time served is necessary but not sufficient - senior is about scope, not tenure.' },
            { q: 'What is the difference between a staff engineer and an engineering manager?', a: 'Both operate at similar organisational scope, but a staff engineer drives outcomes through technical direction and influence while a manager drives them through people, hiring and process. They are parallel tracks, not a hierarchy.' },
            { q: 'Do I have to go into management to keep progressing?', a: 'No. Most established engineering organisations now maintain an individual contributor ladder to staff, principal and beyond. Smaller companies often do not, which is a real reason engineers change jobs.' },
            { q: 'What actually gets you promoted as a software engineer?', a: 'Consistently operating at the next level before you hold the title, and having someone senior able to point to specific evidence of it. Documenting your own impact is not self-promotion, it is a prerequisite.' },
        ],
        relatedSlugs: ['how-to-become-a-software-engineer', 'new-grad-software-engineer-jobs', 'questions-to-ask-interviewer-software-engineer'],
    },

    'new-grad-software-engineer-jobs': {
        title: 'How to Land a New Grad Software Engineer Job in a Hard Market',
        pageTitle: 'New Grad Software Engineer Jobs: How to Land One',
        description: 'Finding a new-grad software engineering job when timing, referrals and targeting matter far more than application volume.',
        category: 'career',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['new grad software engineer jobs', 'entry level software engineer', 'graduate software engineer roles', 'how to get first developer job', 'junior developer job search'],
        readingTime: 9,
        takeaways: [
            'New grad pipelines open in August and September and fill before most students start applying.',
            'Referrals convert several times better than cold applications - and asking for one is normal.',
            'Twenty tailored applications beat two hundred generic ones.',
            'Mid-sized companies hire more new grads than the household names and get a fraction of the applicants.',
        ],
        faqs: [
            { q: 'When should new grads start applying for software engineering jobs?', a: 'August and September of your final year for roles starting the following summer. Many large new-grad programmes close applications by October, well before most students have begun looking.' },
            { q: 'How many applications does it take to get a new grad offer?', a: 'There is no reliable number, but quality dominates volume. Candidates who tailor twenty applications and pursue referrals consistently outperform those sending hundreds of untargeted ones.' },
            { q: 'Are internships required to get a new grad job?', a: 'Not required, but they are the single strongest signal available to you, and many new-grad roles are filled by returning interns. Without one, shipped projects and open source contributions have to carry that weight.' },
            { q: 'How do I ask a stranger for a referral?', a: 'Send a short, specific message naming the role, one sentence on why you are a fit, and your resume. Make it easy to say yes and easy to ignore. A low response rate is normal and not personal.' },
        ],
        relatedSlugs: ['campus-placement-preparation-guide', 'ats-resume-software-engineer', 'software-engineering-portfolio-guide'],
    },

    'campus-placement-preparation-guide': {
        title: 'Campus Placement Preparation: A Complete Guide for CS Students',
        pageTitle: 'Campus Placement Preparation Guide',
        description: 'A six-month plan for campus placements: the funnel, what gets asked in each round, and the two under-prepared areas that decide most outcomes.',
        category: 'career',
        author: 'niraj',
        datePublished: '2026-07-30',
        dateModified: '2026-07-30',
        keywords: ['placement preparation', 'campus placement preparation', 'placement preparation for cse students', 'campus recruitment preparation', 'how to prepare for placements'],
        readingTime: 9,
        takeaways: [
            'Start six months before your placement season, not six weeks.',
            'Aptitude rounds eliminate more candidates than coding rounds do - and they are the easiest to fix.',
            'Core subjects (OS, DBMS, networks, OOP) come up in almost every interview and are widely under-prepared.',
            'Projects you can explain in depth beat projects that sound impressive.',
        ],
        faqs: [
            { q: 'When should I start preparing for campus placements?', a: 'Six months before your placement season at minimum. A common split is three months on DSA and aptitude, two on core subjects and projects, and one on mock interviews and revision.' },
            { q: 'How important is CGPA for campus placements?', a: 'It matters mainly as a filter - many companies set a cutoff around 6.5 or 7.0 and never look at it again after shortlisting. Clearing the cutoff matters; the difference between 7.5 and 8.5 rarely does.' },
            { q: 'What core subjects are asked in placement interviews?', a: 'Operating systems, DBMS, computer networks and object-oriented programming are asked in the large majority of interviews. Candidates over-prepare DSA and consistently under-prepare these.' },
            { q: 'How do I prepare for the HR round of a campus placement?', a: 'Prepare four or five structured stories about your projects, teamwork and setbacks, and be able to answer why this company specifically. The HR round is rarely a formality and does eliminate candidates.' },
        ],
        relatedSlugs: ['dsa-study-plan-coding-interview', 'system-design-interview-prep', 'github-profile-software-engineer'],
    },

    // ───────────────────────── Open Source ─────────────────────────
    'open-source-contribution-beginners': {
        title: 'How to Get Your First Open Source Pull Request Merged',
        pageTitle: 'Open Source for Beginners: Your First Merged PR',
        description: 'Finding a first issue, getting a pull request merged, and the social conventions nobody writes down. A step-by-step first contribution.',
        category: 'open-source',
        author: 'niraj',
        datePublished: '2025-05-07',
        dateModified: '2026-07-30',
        keywords: ['open source contribution', 'first open source pull request', 'open source for beginners', 'good first issue', 'how to contribute to open source'],
        readingTime: 13,
        takeaways: [
            'Start with projects you already use - context is the hardest part of contributing, and you already have it.',
            'Read CONTRIBUTING.md before writing any code. Most rejected PRs break a documented rule.',
            'Documentation and test contributions are real contributions and the fastest route to a first merge.',
            'Comment on the issue and get maintainer buy-in before you start work.',
        ],
        faqs: [
            { q: 'How do I find a good first open source issue?', a: 'Filter by the "good first issue" and "help wanted" labels on projects you already use. GitHub\'s own issue search across labels is the most efficient starting point, and familiarity with the tool matters more than the label.' },
            { q: 'Do open source contributions help you get hired?', a: 'They can, because they are public evidence of how you write code, respond to review and communicate in a real codebase. A handful of substantive merged PRs is worth more than a long list of trivial ones.' },
            { q: 'What if my pull request gets rejected?', a: 'It is routine and not a judgement of you. Ask what would need to change, make the change if it is reasonable, and move on if the maintainer has decided against the direction.' },
            { q: 'How long does it take to get a first PR merged?', a: 'Anywhere from a day to several weeks, depending entirely on maintainer availability. Commenting on the issue first and keeping the change small are the two biggest levers on that timeline.' },
        ],
        relatedSlugs: ['open-source-for-your-resume', 'github-profile-software-engineer', 'software-engineering-portfolio-guide'],
    },

    // ───────────────────────── AI & Developer Tools ─────────────────────────
    'ai-tools-developers-2025': {
        title: '10 AI Tools Every Developer Should Actually Use',
        pageTitle: 'AI Tools for Developers, Assessed',
        description: 'The AI tooling working engineers actually use, what each is good at, where each falls short, and how they fit together in a real workflow.',
        category: 'ai-tools',
        author: 'niraj',
        datePublished: '2025-05-13',
        dateModified: '2026-07-30',
        keywords: ['ai coding tools', 'ai tools for developers', 'best ai for coding', 'ai developer productivity', 'github copilot alternatives'],
        readingTime: 12,
        takeaways: [
            'AI is best at code you could write but do not want to - boilerplate, tests, migrations.',
            'Review every generated line. Reviewing badly is where AI-assisted teams actually lose time.',
            'Learning with AI requires deliberately not accepting the first answer.',
            'Interviewers can tell when a candidate has only ever coded with autocomplete on.',
        ],
        faqs: [
            { q: 'Will AI replace software engineers?', a: 'Not on current evidence. It is compressing the time spent on mechanical work while raising the value of judgement, system design and debugging - the parts AI is weakest at. The job is changing rather than disappearing.' },
            { q: 'Is it cheating to use AI in coding interviews?', a: 'In almost all live interviews, yes, and it is usually explicitly prohibited. Take-home assignments increasingly permit it but expect you to be able to defend every line in the follow-up conversation.' },
            { q: 'Does using AI tools make you a worse programmer?', a: 'It can, if you accept output without understanding it. Used deliberately - generating a solution, then explaining why it works before accepting it - the effect goes the other way.' },
            { q: 'Which AI coding tool should I start with?', a: 'An in-editor assistant is the highest-leverage first tool because it meets you where you already work. Add a conversational model for design discussion and debugging once the editor workflow is habit.' },
        ],
        relatedSlugs: ['learning-to-code-with-ai', 'ai-resume-screening-explained', 'how-to-become-a-software-engineer'],
    },

    // ───────────────────────── DSA & Practice ─────────────────────────
    'coding-interview-patterns': {
        title: 'The 15 Coding Interview Patterns That Cover Most Problems',
        pageTitle: 'Coding Interview Patterns: The 15 That Matter',
        description: 'Most interview questions are the same fifteen problems in different clothes. Each pattern, the signal that triggers it, and problems to make it stick.',
        category: 'dsa',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['coding interview patterns', 'leetcode patterns', 'interview problem patterns', 'algorithm patterns interview', 'coding interview preparation'],
        readingTime: 10,
        takeaways: [
            'Pattern recognition beats problem count - four hundred problems builds recall, fifteen patterns builds transfer.',
            'The trigger is in the wording: \'contiguous\' means sliding window, \'all valid ways\' means backtracking.',
            'Binary search applies to any monotonic answer space, not only to sorted arrays.',
            'After each problem, write the pattern and the trigger in one sentence. If you cannot, you memorised a solution.',
        ],
        faqs: [
            { q: 'How many coding interview patterns are there?', a: 'Around fifteen cover the large majority of interview questions: two pointers, fast and slow pointers, sliding window, prefix sums, hash map counting, binary search, stack, heap, intervals, tree traversal, graph traversal, topological sort, backtracking, dynamic programming and union-find.' },
            { q: 'Is it better to learn patterns or solve more problems?', a: 'Patterns, then problems within each pattern. Solving problems at random builds recall for problems you have seen and little ability to handle ones you have not. Three problems in one pattern back to back transfers far better than thirty scattered across all of them.' },
            { q: 'How do I know which pattern a problem needs?', a: 'From the wording. \'Contiguous subarray\' means sliding window. \'All permutations\' means backtracking. \'Prerequisites\' means topological sort. \'Have I seen this\' means a hash map. The trigger table in this guide maps the common phrasings.' },
            { q: 'How long does it take to learn the patterns?', a: 'Roughly one pattern per week with three problems each, so three to four months for full coverage. The bottleneck is spaced repetition, not reading - doing one cold problem from a pattern a week later is what tells you it went in.' },
        ],
        relatedSlugs: ['dsa-study-plan-coding-interview', 'dynamic-programming-interview-guide', 'how-to-approach-coding-interview-problems'],
    },
    // ───────────────────────── DSA & Practice ─────────────────────────
    'dynamic-programming-interview-guide': {
        title: 'Dynamic Programming for Interviews: Patterns, Not Puzzles',
        pageTitle: 'Dynamic Programming Interview Guide with Examples',
        description: 'DP is hard because recognising it is hard, not because the recurrences are. Five patterns, a worked table, and what interviewers actually score.',
        category: 'dsa',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['dynamic programming interview', 'dp interview questions', 'dynamic programming patterns', 'memoization vs tabulation', 'coin change dynamic programming'],
        readingTime: 10,
        takeaways: [
            'A problem is DP when it has overlapping subproblems AND optimal substructure. Check both.',
            'Coin Change with [1,3,4] to 6 shows exactly why greedy fails: 4+1+1 is three coins, 3+3 is two.',
            'Write a small table by hand before writing the loop, every single time.',
            'Five patterns - linear, knapsack, two-sequence, grid, interval - cover most interview DP.',
        ],
        faqs: [
            { q: 'What makes a problem a dynamic programming problem?', a: 'Two conditions together: overlapping subproblems, meaning a naive recursion solves the same input more than once, and optimal substructure, meaning the best overall answer is built from best answers to its parts. If only the first holds you have memoisation; if neither holds it is not DP.' },
            { q: 'Should I use memoisation or tabulation in an interview?', a: 'Write memoisation first, because it maps directly onto the recurrence you just reasoned about and is faster to get correct under pressure. Then say out loud that the bottom-up version avoids recursion depth and often collapses to O(1) space, and convert it if there is time.' },
            { q: 'Why does greedy fail on Coin Change?', a: 'With coins [1,3,4] and a target of 6, greedy takes the largest coin that fits: 4, then 1, then 1. Three coins. The optimal answer is 3+3, two coins. Taking the 4 was locally best and left a remainder the coin set handles badly, and no local rule sees that coming.' },
            { q: 'What order should I practise DP problems in?', a: 'Climbing Stairs, House Robber, Coin Change, Longest Increasing Subsequence, Unique Paths, Longest Common Subsequence, Word Break, Partition Equal Subset Sum, Edit Distance, then Best Time to Buy and Sell Stock with Cooldown. After each, write what dp[i] means in plain English.' },
        ],
        relatedSlugs: ['coding-interview-patterns', 'dsa-study-plan-coding-interview', 'big-o-notation-explained'],
    },
    // ───────────────────────── DSA & Practice ─────────────────────────
    'big-o-notation-explained': {
        title: 'Big O Notation, Explained Without the Maths Degree',
        pageTitle: 'Big O Notation Explained for Coding Interviews',
        description: 'Big O describes how work grows as input grows, not how fast code is. The complexities you will meet, how to count them, and what makes an answer good.',
        category: 'dsa',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['big o notation', 'time complexity', 'space complexity', 'big o cheat sheet', 'algorithm complexity interview'],
        readingTime: 10,
        takeaways: [
            'Big O is about growth, not speed. An O(n squared) algorithm can beat an O(n log n) one on small inputs.',
            'The gap that matters is n log n versus n squared: at a million elements that is 20 million operations versus a trillion.',
            'Hash map lookup is O(1) average and O(n) worst case. The qualifier is the answer interviewers want.',
            'State time and space, name the variable, and say which case. All three are cheap and all three are noticed.',
        ],
        faqs: [
            { q: 'What is Big O notation in simple terms?', a: 'Big O describes how the work an algorithm does grows as its input grows. It ignores constant factors and lower-order terms, which is what makes it describe the algorithm rather than the machine it runs on.' },
            { q: 'What is the difference between O(n) and O(log n)?', a: 'O(n) means the work grows in step with the input - a million items means a million operations. O(log n) means it grows by one step each time the input doubles, so a million items is about twenty operations. Binary search is the standard example.' },
            { q: 'Is O(1) always faster than O(n)?', a: 'No. Big O describes growth, not absolute speed. An O(1) operation with a large constant cost can be slower than an O(n) pass over ten elements. It becomes reliably faster as the input grows, which is what the notation is for.' },
            { q: 'What is amortised complexity?', a: 'The average cost across a sequence of operations rather than a single one. Appending to a dynamic array is O(1) amortised: most appends are constant, the occasional resize copies everything, and spreading that copy across the appends that caused it gives constant cost.' },
        ],
        relatedSlugs: ['coding-interview-patterns', 'dynamic-programming-interview-guide', 'dsa-study-plan-coding-interview'],
    },
    // ───────────────────────── DSA & Practice ─────────────────────────
    'how-to-approach-coding-interview-problems': {
        title: 'What to Do in the First Five Minutes of a Coding Interview',
        pageTitle: 'How to Approach a Coding Interview Problem',
        description: 'A seven-step procedure for the part of a coding interview nobody practises: the five minutes before you write any code, which decide most of the outcome.',
        category: 'dsa',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['how to approach coding interview problems', 'coding interview process', 'technical interview tips', 'thinking out loud interview', 'coding interview strategy'],
        readingTime: 10,
        takeaways: [
            'Restate, clarify, work an example by hand, state a brute force, name the waste, propose, then code.',
            'Ask about input size at minute six. It decides the target complexity and interviewers wait to see whether you ask.',
            'Naming the specific waste is the hinge - it turns \'I remembered this\' into \'I derived this\'.',
            'Being stuck is not the failure. Being stuck silently is.',
        ],
        faqs: [
            { q: 'What should I do first in a coding interview?', a: 'Restate the problem in your own words and confirm it. It takes fifteen seconds, catches a misunderstanding while it is still free, and buys thinking time that reads as diligence rather than a pause.' },
            { q: 'Should I explain my thinking during a coding interview?', a: 'Yes, continuously, and more than feels natural. Interviewers are largely assessing whether they would want to be stuck on a problem with you. Silence gives them nothing to assess, and on a phone screen it is indistinguishable from being lost.' },
            { q: 'Is it bad to ask for a hint in a coding interview?', a: 'No. Asking after a genuine attempt costs far less than twenty minutes of visible flailing. Say what you have tried and what you are missing, then ask specifically - about the data structure, for example, rather than for the answer.' },
            { q: 'Should I give a brute-force solution first?', a: 'Yes, even when it is obviously bad. It sets a baseline for the conversation and shows you can reach correct before clever. Candidates who jump to a memorised optimal solution they cannot explain score worse than candidates who visibly reason upward.' },
        ],
        relatedSlugs: ['coding-interview-patterns', 'technical-phone-screen-guide', 'mock-technical-interview-guide'],
    },
    // ───────────────────────── Interview Prep ─────────────────────────
    'technical-phone-screen-guide': {
        title: 'The Technical Phone Screen: What It Is and How to Pass It',
        pageTitle: 'Technical Phone Screen: A Guide',
        description: 'The round that eliminates the most candidates and gets the least preparation. What the 45 minutes contain and the three ways people lose it.',
        category: 'interview-prep',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['technical phone screen', 'phone screen interview', 'coding phone interview', 'phone screen tips software engineer', 'first round technical interview'],
        readingTime: 9,
        takeaways: [
            'A phone screen decides whether the company should spend five engineers\' afternoons on you, not whether to hire you.',
            'They cannot see you, so narrate more than feels natural. Silence and being stuck look identical.',
            'A correct O(n squared) beats an incomplete O(n) in almost every rubric.',
            'Test your own code before saying you are done. Finding your own bug and having them find it are not the same event.',
        ],
        faqs: [
            { q: 'How long is a technical phone screen?', a: 'Usually 45 minutes: about five for introductions, five for the problem and clarifying questions, twenty-five coding, five on complexity and edge cases, and five for your questions.' },
            { q: 'What should I do if I get stuck on a phone screen?', a: 'Say what you have tried and what you are missing, then ask for a specific hint. On a phone screen especially, going quiet gives the interviewer no information about whether you are thinking or lost, and they are writing notes either way.' },
            { q: 'Is a phone screen harder than an onsite?', a: 'Not usually harder in content, but it is more compressed and you get no visual feedback. Twenty-five minutes of coding is short, which is why the clarifying questions at the start matter more here than anywhere else.' },
            { q: 'What language should I use in a phone screen?', a: 'The one you are fastest in. A confident Python solution beats a hesitant C++ one unless the role is explicitly a C++ role. Check the shared editor beforehand - most have a practice pad - so you are not learning the tooling at minute eleven.' },
        ],
        relatedSlugs: ['how-to-approach-coding-interview-problems', 'mock-technical-interview-guide', 'system-design-interview-prep'],
    },
    // ───────────────────────── Resume & Applications ─────────────────────────
    'software-engineer-resume-bullet-points': {
        title: 'Resume Bullet Points for Software Engineers That Get Read',
        pageTitle: 'Software Engineer Resume Bullet Points: Examples',
        description: 'A bullet should say what you did, how, and what changed. The formula, where to find numbers when you think you have none, and three rewrites.',
        category: 'resume',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['software engineer resume bullet points', 'resume bullet points examples', 'resume action verbs', 'quantify resume achievements', 'developer resume writing'],
        readingTime: 10,
        takeaways: [
            'Action verb plus what you built plus how plus a measurable outcome. Every bullet, every time.',
            'You do have numbers: scale, time, volume, frequency and cost. Credible estimates are allowed; invention is not.',
            'Your resume is the agenda for the first fifteen minutes of the interview. A bullet nobody can ask about does no work.',
            'Write what you personally did. \'We\' collapses fast under a specific follow-up question.',
        ],
        faqs: [
            { q: 'How do I quantify my resume if I have no metrics?', a: 'Use scale (users, requests, rows), time (before and after durations), volume (services, endpoints, tests), frequency (deploys per week) or cost. Credible estimates you can defend are fine. A precise-looking number you cannot explain is a trap, because the follow-up is always how you measured it.' },
            { q: 'How many bullet points per job on a software engineer resume?', a: 'Three to five for your most recent role, two to three for older ones. Your last job gets the most space; a role from four years ago gets one line about the biggest thing you did.' },
            { q: 'What action verbs should I use on a developer resume?', a: 'Built, designed, implemented, led, owned, shipped, cut, reduced, migrated. Avoid \'responsible for\', \'worked on\', \'helped with\' and \'involved in\' - they describe attendance rather than a decision. Never use \'utilised\'.' },
            { q: 'Should I tailor my resume for every application?', a: 'Reorder rather than rewrite. Move the relevant experience up and use the posting\'s own vocabulary where it genuinely matches what you did, since both the parser and the human are matching on it. Do not add things you did not do.' },
        ],
        relatedSlugs: ['ats-resume-software-engineer', 'ai-resume-screening-explained', 'software-engineer-cover-letter'],
    },
    // ───────────────────────── Resume & Applications ─────────────────────────
    'linkedin-profile-software-engineer': {
        title: 'The LinkedIn Profile a Recruiter Actually Searches For',
        pageTitle: 'LinkedIn Profile Tips for Software Engineers',
        description: 'Recruiters find you by searching a job title and a technology, then decide in ten seconds. What to fix, in order of impact, in twenty minutes.',
        category: 'resume',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['linkedin profile software engineer', 'linkedin headline developer', 'linkedin for developers', 'linkedin open to work', 'linkedin tips engineers'],
        readingTime: 9,
        takeaways: [
            'Your headline is a search field, not a slogan. Job title, three technologies, and what you are looking for.',
            'LinkedIn truncates About after two lines on mobile. Lead with the definition, not the story.',
            'Reorder your top three skills - recruiters filter on them and it is a drag-and-drop.',
            'If you are employed, use the recruiter-only open-to-work setting rather than the public green frame.',
        ],
        faqs: [
            { q: 'What should a software engineer put in a LinkedIn headline?', a: 'Job title, three or four technologies, and what you are looking for if you are looking. \'Backend Engineer | Python, Go, Postgres | Distributed Systems\' matches searches recruiters actually run. \'Aspiring developer\' and \'tech enthusiast\' match nothing.' },
            { q: 'Does the LinkedIn open-to-work banner hurt your chances?', a: 'The public green frame is visible to everyone including your employer. LinkedIn also has a recruiter-only setting that surfaces you in LinkedIn Recruiter without appearing on your public profile - that is the one to use if you are currently employed.' },
            { q: 'Do software engineers need to post on LinkedIn?', a: 'No. It is optional and oversold. A well-structured profile with good project entries outperforms a badly written weekly post. Post if you enjoy writing about something specific you built; do not force it.' },
            { q: 'How important is the LinkedIn About section?', a: 'The first two lines matter and the rest is largely unread, because LinkedIn truncates it behind a \'see more\' on mobile. Open with what you are and one concrete result, not with how you have been fascinated by technology since childhood.' },
        ],
        relatedSlugs: ['software-engineer-resume-bullet-points', 'github-profile-software-engineer', 'new-grad-software-engineer-jobs'],
    },
    // ───────────────────────── Portfolio & Projects ─────────────────────────
    'portfolio-project-ideas-software-engineer': {
        title: 'Portfolio Project Ideas That Are Not a To-Do App',
        pageTitle: 'Portfolio Project Ideas for Software Engineers',
        description: 'A project is worth building when it forces a decision you can be interviewed about. Nine projects chosen for their hard parts, and how to finish.',
        category: 'portfolio',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['portfolio project ideas', 'software engineer projects', 'project ideas for developers', 'portfolio projects resume', 'coding project ideas'],
        readingTime: 10,
        takeaways: [
            'The test: what decision will this force, and what alternative will I have rejected? Cannot name one, do not build it.',
            'A to-do app forces no decisions, which is why no interviewer can ask you anything interesting about it.',
            'Three finished and deployed beats twelve started. Abandoned repositories read as evidence you do not finish.',
            'Write the README first. It is the most effective scope control there is.',
        ],
        faqs: [
            { q: 'What makes a good portfolio project for a software engineer?', a: 'One that forces a technical decision with a real alternative - cursor versus offset pagination, polling versus WebSockets, doing work in the request or in a background job. If you cannot name a decision the project forced, an interviewer has nothing to ask you about.' },
            { q: 'How many projects should be in a portfolio?', a: 'Three finished, deployed projects. Twelve half-built repositories are worse than three complete ones, because an abandoned project reads as evidence you do not finish things, which is the most expensive impression to give.' },
            { q: 'Are to-do apps bad portfolio projects?', a: 'They are fine for learning and worthless for a portfolio. They force no decisions, so there is nothing an interviewer can ask that has an interesting answer. The same applies to weather dashboards and landing-page clones.' },
            { q: 'How do I stop abandoning side projects?', a: 'Scope to the smallest version that still contains the hard part, write the README before the code, and set a deadline you ship on regardless of state. A deployed smaller thing is worth more than a perfect unshipped one.' },
        ],
        relatedSlugs: ['software-engineering-portfolio-guide', 'deploy-your-portfolio-project', 'github-profile-software-engineer'],
    },
    // ───────────────────────── Portfolio & Projects ─────────────────────────
    'deploy-your-portfolio-project': {
        title: 'How to Deploy Your Portfolio Project So It Actually Counts',
        pageTitle: 'How to Deploy a Portfolio Project for Free',
        description: 'A project that is not deployed is a claim; a deployed one is evidence. Where to host what for free, and the three things that always go wrong.',
        category: 'portfolio',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['deploy portfolio project', 'free hosting for projects', 'how to deploy a web app', 'vercel cloudflare deployment', 'portfolio project hosting'],
        readingTime: 10,
        takeaways: [
            'Nobody clones your repository. A live URL is the difference between \'I built this\' and \'here, look\'.',
            'Deployed means: loads for a stranger, has data in it, and shows the main feature without a sign-up wall.',
            'Never commit .env. If you already did, rotate the secret - deleting the file does not remove it from history.',
            'Client-side environment variables are inlined at build time. Setting one on the host afterwards changes nothing.',
        ],
        faqs: [
            { q: 'Where can I deploy a portfolio project for free?', a: 'Cloudflare Pages, Vercel or Netlify for static sites and most frontend frameworks; Fly.io, Render or Railway for APIs; Neon or Supabase for Postgres; Upstash for Redis. All have genuine free tiers, though the limits change and are worth checking before you commit.' },
            { q: 'Does a portfolio project need to be deployed?', a: 'Yes, if you want it to count. A repository is a claim that a recruiter or interviewer will not clone, install and run. A live URL proves it works outside your machine, that you handled configuration and a real database, and that you finished.' },
            { q: 'What do I do if I committed a .env file?', a: 'Rotate every secret in it immediately. Deleting the file does not help, because it remains in the git history and history is public. Assume anything ever pushed to a public repository has been scraped - automated scanners find committed keys within minutes.' },
            { q: 'Why does my app work locally but break when deployed?', a: 'Almost always a hardcoded localhost URL or a missing environment variable. Watch the build-time versus runtime distinction too: client-side variables are compiled into the bundle, so setting one on the host after the build changes nothing already shipped.' },
        ],
        relatedSlugs: ['portfolio-project-ideas-software-engineer', 'software-engineering-portfolio-guide', 'github-profile-software-engineer'],
    },
    // ───────────────────────── Portfolio & Projects ─────────────────────────
    'github-profile-software-engineer': {
        title: 'Your GitHub Profile Has Ten Seconds. Here Is What to Fix',
        pageTitle: 'GitHub Profile Tips for Software Engineers',
        description: 'A recruiter sees your profile README, your pins and your contribution graph, and stops. A twenty-minute pass that makes those three say something.',
        category: 'portfolio',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['github profile', 'github profile readme', 'pinned repositories', 'github for recruiters', 'github portfolio'],
        readingTime: 9,
        takeaways: [
            'Three things get read: the profile README, six pins, and the contribution graph. Optimise those and stop.',
            'A wall of technology badges compresses to \'this person has heard of things\'. Three sentences compress to a person.',
            'Pin only finished, deployed work, best first, each with a description and a website URL filled in.',
            'Archive abandoned repositories rather than deleting them - archived reads as retired, not abandoned.',
        ],
        faqs: [
            { q: 'Do recruiters actually look at your GitHub?', a: 'Technical recruiters and interviewers do, for about ten seconds. In that time they see your profile README, your pinned repositories and your contribution graph, so those three are the whole optimisation.' },
            { q: 'What should a GitHub profile README contain?', a: 'Three to five sentences saying what you build, a link to your best deployed project, two or three recent things with links, and how to reach you. Leave out badge walls, animated GIFs, visitor counters and trophy widgets - they take space from what you want read.' },
            { q: 'How many repositories should I pin on GitHub?', a: 'Four to six, and fewer is fine. Four strong pins beat six where two are weak. Pin only finished, deployed work, and put the most interesting one first because the first pin is the one that gets clicked.' },
            { q: 'Does an empty GitHub contribution graph matter?', a: 'It is worth filling, but with real work rather than manufactured commits - automated daily commits are obvious and getting caught is worse than an empty graph. If your work is on a private or company account, enable private contribution counts in settings.' },
        ],
        relatedSlugs: ['software-engineering-portfolio-guide', 'open-source-for-your-resume', 'linkedin-profile-software-engineer'],
    },
    // ───────────────────────── Open Source ─────────────────────────
    'open-source-for-your-resume': {
        title: 'Turning Open Source Contributions Into a Hiring Signal',
        pageTitle: 'Open Source on Your Resume: How to Present It',
        description: 'A merged pull request is one of the few resume claims anybody can verify. What it proves, how to write it, and why unmerged work is worse than none.',
        category: 'open-source',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['open source resume', 'open source contributions resume', 'github contributions job', 'open source for hiring', 'merged pull request resume'],
        readingTime: 10,
        takeaways: [
            'Only list merged work. An open or closed-unmerged PR turns a positive claim into a negative one in front of the reader.',
            'Include the PR number. It is verifiable, and including it signals you expect to be checked.',
            'Bug fixes with a regression test are the sweet spot - documentation fixes teach the workflow but are weak signal.',
            'Four merged PRs into one project beats one PR into ten, and the maintainer becomes a reference.',
        ],
        faqs: [
            { q: 'Do open source contributions help you get hired?', a: 'They are the most verifiable thing on a resume - a hiring manager can read your actual code and the actual review of it in thirty seconds. That is worth a lot for a candidate with no professional experience, because it converts \'I can do this\' into a link.' },
            { q: 'Should I put unmerged pull requests on my resume?', a: 'No. The first thing an interested reader does is open the link, and finding a PR that was closed without merging or has sat unreviewed for months converts a positive claim into a negative one. If nothing has merged yet, do not claim the category.' },
            { q: 'What kind of open source contribution looks best to employers?', a: 'A bug fix with a regression test. It shows you reproduced a problem, understood unfamiliar code well enough to fix it, and cared enough to prevent it recurring. Documentation fixes are the easiest to merge and the weakest as signal.' },
            { q: 'How many open source contributions do I need?', a: 'Two or three merged pull requests into one active project is enough to get the benefit. Depth beats breadth: ten one-line fixes across ten repositories reads as farming contributions, while four into one project reads as becoming useful to a codebase.' },
        ],
        relatedSlugs: ['open-source-contribution-beginners', 'github-profile-software-engineer', 'software-engineer-resume-bullet-points'],
    },
    // ───────────────────────── AI & Developer Tools ─────────────────────────
    'learning-to-code-with-ai': {
        title: 'Learning to Code With AI Without Hollowing Out Your Skills',
        pageTitle: 'Learning to Code With AI, Without Losing It',
        description: 'The risk is not bad code. It is shipping code you could not have written and finding out in an interview. How to use assistants by phase.',
        category: 'ai-tools',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['learning to code with ai', 'ai coding assistant', 'github copilot learning', 'using ai to learn programming', 'ai coding tools skills'],
        readingTime: 10,
        takeaways: [
            'Recognition is not learning. Agreeing that generated code is correct feels like understanding and does not transfer.',
            'The rule: never accept code you could not have written without first understanding why it works.',
            'Turn autocomplete off when learning a concept and when practising for interviews. Use it heavily when building.',
            'The self-check: reimplement a piece from scratch with no assistant. It is the only way to tell which happened.',
        ],
        faqs: [
            { q: 'Does using AI to code make you a worse programmer?', a: 'Only if you accept code you could not have written without understanding it. Learning happens through effortful retrieval, not recognition - agreeing that generated code is correct feels like understanding but does not build the ability to produce it yourself.' },
            { q: 'Should I use AI while learning to program?', a: 'Turn inline suggestions off while learning a concept, because they finish the thought you were about to have and the struggle is the learning. Use the assistant afterwards instead: write your version, then ask what is wrong with it.' },
            { q: 'Can I use AI when practising for coding interviews?', a: 'No. The interview is a retrieval test with no assistant, so practising with one trains a skill you will not have. The one legitimate use is afterwards - solve it cold, then ask for a critique of your solution.' },
            { q: 'How do I know if AI is hurting my learning?', a: 'Pick something you built with assistance and reimplement a piece from scratch with no assistant and no reference. If you can, you learned it. If you cannot, you shipped it - which is fine for boilerplate and a problem for the parts you will be interviewed about.' },
        ],
        relatedSlugs: ['ai-tools-developers-2025', 'how-to-approach-coding-interview-problems', 'coding-interview-patterns'],
    },
    // ───────────────────────── AI & Developer Tools ─────────────────────────
    'ai-resume-screening-explained': {
        title: 'What Actually Happens to Your Resume After You Click Apply',
        pageTitle: 'AI Resume Screening: What Really Happens',
        description: 'No AI reads your resume for potential. There is a parser, a search index and a human running queries. That changes what is worth optimising.',
        category: 'ai-tools',
        author: 'niraj',
        datePublished: '2026-08-21',
        dateModified: '2026-08-21',
        keywords: ['ai resume screening', 'applicant tracking system', 'ats resume scanner', 'resume keyword matching', 'how ats works'],
        readingTime: 10,
        takeaways: [
            'The pipeline is parse, index, recruiter search, six-second human skim. Nothing in it scores your resume for quality.',
            'The failure that actually costs interviews is parsing, and it is invisible from your side.',
            'Hidden white-text keywords are extracted and then read by a human as a paragraph of hidden keywords.',
            'Use an ATS tool to see what a parser extracts, and ignore the score - it is not the system you applied through.',
        ],
        faqs: [
            { q: 'Does AI reject resumes automatically?', a: 'Overwhelmingly no. An applicant tracking system parses your file into fields and indexes the text; a recruiter then runs a keyword search and skims the results. Most rejections at this stage are a person looking at a list, not a model rejecting you.' },
            { q: 'Do I need to hit a match percentage to pass an ATS?', a: 'No. Some systems compute a match score, but it is a sorting hint in the recruiter\'s interface rather than a threshold your application must clear. Optimising a number no employer sees is a way to spend an evening.' },
            { q: 'Does putting white keywords on your resume work?', a: 'No, and it backfires. The text is extracted whether or not it is visible, so the human reading the parsed output sees a paragraph of hidden keywords. It reads as dishonest and it is found routinely.' },
            { q: 'What is the most common ATS mistake?', a: 'A two-column layout. Parsers read left to right and interleave the columns, so your job titles and skills merge into unusable text. Single column, standard section headers and a real text-based PDF fix the large majority of parsing failures.' },
        ],
        relatedSlugs: ['ats-resume-software-engineer', 'software-engineer-resume-bullet-points', 'linkedin-profile-software-engineer'],
    },
}

// ─── Derived collections + helpers ───────────────────────────────────────────

/** Every slug that has content, published or drafted-ahead. Used by generateStaticParams. */
export const BLOG_SLUGS = Object.keys(BLOG_POSTS)

/** True once a post has been added to the publish gate in content/active-posts.ts. */
export function isPublished(slug: string): boolean {
    return ACTIVE_BLOG_SLUGS.includes(slug)
}

export interface BlogPostWithSlug extends BlogPost {
    slug: string
}

function withSlug(slug: string): BlogPostWithSlug {
    return { slug, ...(BLOG_POSTS[slug] as BlogPost) }
}

/** Published posts, newest first. This is what the blog index and sitemap render. */
export const publishedPosts: BlogPostWithSlug[] = ACTIVE_BLOG_SLUGS
    .filter((slug) => Boolean(BLOG_POSTS[slug]))
    .map(withSlug)
    .sort((a, b) => b.datePublished.localeCompare(a.datePublished))

export function getPostBySlug(slug: string): BlogPost | undefined {
    return BLOG_POSTS[slug]
}

export function getPostsByCategory(category: BlogCategory): BlogPostWithSlug[] {
    return publishedPosts.filter((p) => p.category === category)
}

/**
 * Related posts for a given slug. Hand-picked `relatedSlugs` come first; if any of
 * those are still unpublished the list is topped up from the same category so the
 * block is never short.
 */
export function getRelatedPosts(slug: string, limit = 3): BlogPostWithSlug[] {
    const post = BLOG_POSTS[slug]
    if (!post) return []

    const picked = post.relatedSlugs
        .filter((s) => s !== slug && BLOG_POSTS[s] && isPublished(s))
        .map(withSlug)

    if (picked.length >= limit) return picked.slice(0, limit)

    const seen = new Set([slug, ...picked.map((p) => p.slug)])
    const filler = getPostsByCategory(post.category).filter((p) => !seen.has(p.slug))

    return [...picked, ...filler].slice(0, limit)
}
