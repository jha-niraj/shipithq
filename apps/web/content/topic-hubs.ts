import type { BlogCategory } from './blog'

/**
 * The content that makes a topic hub a page rather than a heading over a grid.
 *
 * ── Why this exists ──
 *
 * `plan/web/seo/tasks.md` SEO-44 resolved the pillar-page question as "the hubs ARE the
 * pillars": a separate `/blogs/dsa-guide` alongside `/blogs/topics/dsa` would be two of our
 * own pages competing for one query, which is cannibalisation.
 *
 * That decision left an obligation, and for a while it was unmet. Each hub had **fifteen to
 * twenty words** of copy. A pillar with twenty words is not a pillar; it is a category
 * listing with an intro sentence, and it will not rank for the head term the cluster is
 * built around.
 *
 * So each hub now carries what a pillar would have: a real introduction that defines the
 * topic, an ordered reading path, and questions answered on the page.
 *
 * ── The reading path is the point ──
 *
 * A grid sorted by publication date tells a reader nothing about where to start. `path`
 * orders the cluster by where the READER is, with one line saying why that post comes at
 * that point. It is the single most useful thing a hub can do that an index cannot.
 *
 * The grid below it still shows everything, so nothing is hidden - the path is a
 * recommendation, not a filter.
 *
 * ── `faqs` earns a second rich result ──
 *
 * Answered on the page and emitted as `FAQPage`. Answer-first, standing alone without the
 * question, because that is the form assistants quote (see `03-aeo.md`).
 *
 * Every slug referenced here is checked against `BLOG_POSTS` at build time by the hub page
 * itself, so a typo or a deleted post fails loudly rather than rendering a dead row.
 */

export interface TopicHub {
    /** Two or three paragraphs. What this topic is, who it is for, and what it is not. */
    body: readonly string[]
    /** The ordered reading path. `why` says what this post does at this point in the sequence. */
    path: readonly { slug: string; why: string }[]
    /** Answered on the page, and emitted as FAQPage. */
    faqs: readonly { question: string; answer: string }[]
    /** One line under the path, pointing at the adjacent cluster. */
    nextStep: { label: string; href: string }
}

export const TOPIC_HUBS: Record<BlogCategory, TopicHub> = {
    'interview-prep': {
        body: [
            'Interview preparation is four separate skills that people treat as one. Solving an algorithm problem, explaining a system out loud, telling a story about something that went wrong, and asking questions that make you sound like somebody who has done the job before. Practising the first one does not improve the other three, which is why strong engineers still fail loops.',
            'The rounds also come in a fixed order, and they eliminate at different rates. The technical phone screen removes more candidates than any other stage, and it is the one people prepare for least because it feels like a formality. The behavioural round is where prepared candidates separate themselves, because almost nobody rehearses answers out loud and it is obvious within thirty seconds who has.',
            'These guides cover each round on its own terms. None of them are about tricks - the interview is mostly a test of whether you can think in front of a stranger, and that improves with rehearsal rather than with technique.',
        ],
        path: [
            { slug: 'technical-phone-screen-guide', why: 'Start here, because this is the round you will hit first and the one that eliminates the most people.' },
            { slug: 'star-method-interview-software-engineers', why: 'The structure behind every behavioural answer, and the mistake most people make in the Result step.' },
            { slug: 'behavioral-interview-questions-software-engineer', why: 'The questions you will actually be asked, and what each one is really testing.' },
            { slug: 'system-design-interview-prep', why: 'The round most people fail having never said an answer out loud. A twelve-week plan.' },
            { slug: 'mock-technical-interview-guide', why: 'How to rehearse properly. Everything above is theory until you have done it under time pressure.' },
            { slug: 'questions-to-ask-interviewer-software-engineer', why: 'The last five minutes, which are an information-gathering opportunity most candidates waste.' },
        ],
        faqs: [
            { question: 'How long should I prepare for a software engineering interview?', answer: 'Three months is a realistic full preparation cycle if you are starting from scratch: one month on fundamentals, one on patterns, one on simulation and weak areas. If you already code daily, four to six weeks focused on the specific rounds you will face is usually enough.' },
            { question: 'Which interview round eliminates the most candidates?', answer: 'The technical phone screen. It is compressed to about 45 minutes, gives you no visual feedback, and it is the round people prepare for least because it feels like a formality before the real interviews.' },
            { question: 'Do I need to prepare for behavioural interviews as a software engineer?', answer: 'Yes, and it is where prepared candidates separate themselves most easily. Almost nobody rehearses answers out loud, and it is obvious within thirty seconds who has. The technical rounds are more competitive precisely because everybody prepares for them.' },
            { question: 'What is the best way to practise interviewing?', answer: 'Out loud, under time pressure, with no solution button. Solving problems silently trains a different skill from explaining your reasoning to a stranger while typing, and only the second one is tested.' },
        ],
        nextStep: { label: 'The algorithm practice behind these rounds', href: '/blogs/topics/dsa' },
    },

    'dsa': {
        body: [
            'Data structures and algorithms is the most over-studied and least efficiently studied part of interview preparation. The common approach is volume: solve four hundred problems and hope coverage does the work. It half works, and it fails in a specific way - you build recall for problems you have seen and very little ability to handle problems you have not.',
            'The alternative is pattern-first. Around fifteen patterns recur often enough to be worth naming, and once you can identify which one a question belongs to, the blank page at minute one stops being frightening. You are no longer inventing an approach; you are choosing from a shortlist.',
            'That takes fewer problems and more reflection. After each one, name the pattern and the trigger in a single sentence. If you cannot, you memorised a solution rather than learned anything, and it will not transfer.',
        ],
        path: [
            { slug: 'coding-interview-patterns', why: 'Start here. The taxonomy, and the signal in a question that triggers each pattern.' },
            { slug: 'big-o-notation-explained', why: 'The vocabulary every answer needs. Read it early, because you will use it in every other post here.' },
            { slug: 'how-to-approach-coding-interview-problems', why: 'The procedure for the first five minutes, which decides most of the outcome and which nobody practises.' },
            { slug: 'dsa-study-plan-coding-interview', why: 'A three-month sequence that puts the patterns in a sensible order.' },
            { slug: 'dynamic-programming-interview-guide', why: 'The topic with the worst reputation, and the one where recognising the problem is harder than solving it.' },
            { slug: 'leetcode-alternatives', why: 'Where to actually practise, if LeetCode is not working for you or is not covering your interview format.' },
        ],
        faqs: [
            { question: 'How many LeetCode problems should I solve before interviewing?', answer: 'Around 150 problems chosen across the common patterns beats 500 chosen at random. Volume builds recall for problems you have already seen; pattern coverage builds the ability to handle ones you have not.' },
            { question: 'Is it better to learn patterns or solve more problems?', answer: 'Patterns first, then problems within each pattern. Three problems in one pattern solved back to back transfer far better than thirty scattered across all of them, because the reflection between them is what makes the trigger memorable.' },
            { question: 'How long does it take to get good at DSA for interviews?', answer: 'Three to four months at roughly one pattern per week with three problems each, assuming you already write code comfortably. The bottleneck is spaced repetition rather than reading - a cold problem from a pattern a week later is what tells you it went in.' },
            { question: 'Do I need to know dynamic programming for interviews?', answer: 'For most large tech companies, yes, at the level of recognising a DP problem and writing a memoised solution. You do not need the hardest interval DP variants; Climbing Stairs through Edit Distance covers what is realistically asked.' },
        ],
        nextStep: { label: 'The interview rounds this practice is for', href: '/blogs/topics/interview-prep' },
    },

    'career': {
        body: [
            'The entry-level software engineering market is harder than it was, and most career advice was written for the market before it. Junior roles get hundreds of applicants, companies that once hired three juniors now hire one mid-level engineer, and the gap between finishing a course and being employable has widened rather than closed.',
            'None of that makes the route impossible. It makes it more specific: what you learn, in what order, and what evidence you can show matter more than they used to, and applying in volume matters less. Timing matters a great deal and almost nobody talks about it.',
            'These guides cover getting in and moving up, with honest timelines rather than encouraging ones. Where the answer is "this takes eighteen months", they say eighteen months.',
        ],
        path: [
            { slug: 'how-to-become-a-software-engineer', why: 'Start here if you are deciding whether to do this at all. An honest read on the market and the timeline.' },
            { slug: 'full-stack-developer-roadmap', why: 'What to learn and in what order, once you have decided.' },
            { slug: 'campus-placement-preparation-guide', why: 'If you are at university with a placement season ahead, this is the six-month version.' },
            { slug: 'new-grad-software-engineer-jobs', why: 'The job search itself, where timing and referrals matter more than application volume.' },
            { slug: 'software-engineer-career-path', why: 'What happens after you get in - the ladder to staff, and where the management track splits off.' },
        ],
        faqs: [
            { question: 'How long does it take to become a software engineer?', answer: 'Twelve to eighteen months of consistent daily work to become employable if you are starting from zero, and that assumes shipping real projects rather than only completing courses. A CS degree front-loads the fundamentals but does not remove the need for the same portfolio work.' },
            { question: 'Is it still worth becoming a software engineer?', answer: 'The long-run demand picture remains good; the short-run entry-level market is genuinely harder than it was before 2022. The realistic framing is that it is still worth it and it takes longer to get the first job than it used to.' },
            { question: 'Do I need a computer science degree to get a software engineering job?', answer: 'No, and it does help. A degree gets you into campus pipelines and past some resume filters. Without one, the substitute is demonstrable work - deployed projects, merged open source contributions - and a longer job search.' },
            { question: 'What is the difference between junior, mid-level and senior engineer?', answer: 'A junior completes well-defined tasks, a mid-level engineer owns features end to end and thinks about what happens after the thing ships, and a senior engineer is trusted with ambiguous problems and is expected to make other people more effective.' },
        ],
        nextStep: { label: 'The applications and resume that get you in', href: '/blogs/topics/resume' },
    },

    'resume': {
        body: [
            'When you click apply, your resume goes into an applicant tracking system, and what happens next is more mechanical than the folklore suggests. A parser turns your PDF into fields, the text is indexed, a recruiter runs a keyword search, and a human skims what comes back for a few seconds each.',
            'Understanding that sequence eliminates most resume advice. There is no AI reading your document for potential. There is no match percentage you have to clear. What there is, is a parsing step that fails silently on creative layouts - and a two-column resume with a skills bar is the single most common way to have your job titles merged into unusable text without ever knowing.',
            'Once the file parses cleanly, everything left is about a person reading it in six seconds. That means outcomes at the start of bullets, numbers you can defend, and cutting anything an interviewer would not want to spend five minutes on.',
        ],
        path: [
            { slug: 'ai-resume-screening-explained', why: 'Start here. What actually happens after you click apply, which decides what is worth optimising.' },
            { slug: 'ats-resume-software-engineer', why: 'The format that parses correctly, and what a parser extracts from one that does not.' },
            { slug: 'software-engineer-resume-bullet-points', why: 'The wording, which is where most of the remaining value is once the format is right.' },
            { slug: 'software-engineer-cover-letter', why: 'When a cover letter is worth writing, and the four-paragraph structure that works.' },
            { slug: 'linkedin-profile-software-engineer', why: 'The other document, which is a discovery surface rather than a resume and follows different rules.' },
        ],
        faqs: [
            { question: 'How do I make my resume ATS-friendly?', answer: 'Single column, standard section headers like "Work Experience" and "Skills", a real text-based PDF, and no tables, text boxes, headers or footers. That fixes the large majority of parsing failures.' },
            { question: 'Does AI reject resumes automatically?', answer: 'Overwhelmingly no. An applicant tracking system parses and indexes your file; a recruiter then runs a keyword search and skims the results. Most rejections at this stage are a person looking at a list, not a model rejecting you.' },
            { question: 'How long should a software engineer resume be?', answer: 'One page for the first five years or so, two pages with more experience than that. Three pages does not get read, and a second page of filler lowers the average of what is on the first.' },
            { question: 'How do I quantify my resume if I have no metrics?', answer: 'Use scale, time, volume, frequency or cost - users served, before and after durations, services migrated, deploys per week. Credible estimates you can defend are fine; a precise-looking number you cannot explain is a trap, because the follow-up is always how you measured it.' },
        ],
        nextStep: { label: 'The projects that give you something to write about', href: '/blogs/topics/portfolio' },
    },

    'portfolio': {
        body: [
            'A portfolio project is worth building when it forces a decision you can be interviewed about. That single test eliminates most of the ideas people start with. A to-do app forces no decisions, which is exactly why no interviewer can ask anything interesting about it.',
            'The other half is finishing. The most common portfolio failure is not a bad idea; it is twelve repositories whose commit history stops in week two. An abandoned project reads as evidence that you do not finish things, which is the most expensive impression to give and the hardest to argue with.',
            'Three complete, deployed projects beat twelve started ones every time. Deployed matters more than people expect: a repository is a claim that nobody will clone and run, and a live URL is evidence that works in ten seconds.',
        ],
        path: [
            { slug: 'portfolio-project-ideas-software-engineer', why: 'Start here. The selection test, and nine projects chosen for their hard parts.' },
            { slug: 'software-engineering-portfolio-guide', why: 'Presenting the finished set - what to include, what to skip, and the README structure that works.' },
            { slug: 'deploy-your-portfolio-project', why: 'The step that turns a repository from a claim into evidence, and the three things that always go wrong.' },
            { slug: 'github-profile-software-engineer', why: 'The ten seconds before anybody opens a repository at all.' },
        ],
        faqs: [
            { question: 'How many projects should be in a software engineering portfolio?', answer: 'Three finished and deployed projects. Twelve half-built repositories are worse than three complete ones, because an abandoned project reads as evidence that you do not finish things.' },
            { question: 'What makes a good portfolio project?', answer: 'One that forces a technical decision with a real alternative you rejected - cursor versus offset pagination, polling versus WebSockets, work in the request versus a background job. If you cannot name a decision the project forced, an interviewer has nothing to ask about.' },
            { question: 'Do portfolio projects need to be deployed?', answer: 'Yes, if you want them to count. Nobody will clone your repository, install dependencies and provision a database. A live URL also proves the project runs outside your machine, that you handled configuration, and that you finished.' },
            { question: 'Are to-do apps bad portfolio projects?', answer: 'They are fine for learning and worthless for a portfolio, because they force no decisions. The same applies to weather dashboards, movie search pages and landing-page clones.' },
        ],
        nextStep: { label: 'Turning contributions into verifiable evidence', href: '/blogs/topics/open-source' },
    },

    'open-source': {
        body: [
            'A merged pull request is one of the very few claims on a resume that a hiring manager can verify in thirty seconds. That is what makes open source valuable for job hunting, and it is a different property from the one usually pitched - not that contributing teaches you a lot, though it does, but that the evidence is public, permanent and checkable.',
            'It is also evidence of the thing that is hardest to demonstrate otherwise: that you can read code you did not write and work inside somebody else is conventions. Every job posting says "collaborative", and a merged PR into a stranger is codebase is the only cheap proof of it.',
            'The rule that matters: merged, or it does not count. An open or closed-unmerged PR on a resume turns a positive claim into a negative one, because the first thing an interested reader does is open the link.',
        ],
        path: [
            { slug: 'open-source-contribution-beginners', why: 'Start here. Finding a first issue and getting through fork, branch, PR, review and merge once.' },
            { slug: 'open-source-for-your-resume', why: 'What to do with contributions once they merge, and what a maintainer is actually deciding when they review you.' },
        ],
        faqs: [
            { question: 'Do open source contributions help you get a job?', answer: 'They are the most verifiable thing on a resume, because a hiring manager can read your actual code and the actual review of it. For a candidate with no professional experience that is worth a lot, since it converts a claim into a link.' },
            { question: 'What should my first open source contribution be?', answer: 'A documentation fix, to learn the workflow without the pressure of code review. Then a bug fix with a regression test, which is the contribution type that carries real signal because it shows you reproduced a problem and prevented it recurring.' },
            { question: 'How many open source contributions do I need?', answer: 'Two or three merged pull requests into one active project. Depth beats breadth: ten one-line fixes across ten repositories reads as farming contributions, while four into one project reads as becoming useful to a codebase.' },
            { question: 'Should I list unmerged pull requests on my resume?', answer: 'No. The first thing a reader does is open the link, and finding a PR closed without merging or sitting unreviewed for months converts a positive claim into a negative one in front of them.' },
        ],
        nextStep: { label: 'The AI tooling that changes how you work', href: '/blogs/topics/ai-tools' },
    },

    'ai-tools': {
        body: [
            'AI tooling has changed what a working engineer does day to day, and the useful conversation about it is narrower than the loud one. The tools are good at some things, confidently wrong at others, and the difference is learnable.',
            'The genuine risk is not that they write bad code. It is that they let you ship code you could not have written, and you find out which in an interview, on a blank page, with nothing to autocomplete against. That gap is invisible day to day and shows up in exactly the forty-five minutes that decide an outcome.',
            'These guides cover which tools are worth using, how to use them without the underlying skill quietly failing to develop, and what happens on the other side of the hiring process - where the screening you are subject to is far less intelligent than people assume.',
        ],
        path: [
            { slug: 'ai-tools-developers-2025', why: 'Start here. What each tool is genuinely good at, where each falls short, and how they fit together.' },
            { slug: 'learning-to-code-with-ai', why: 'The rule that keeps the tools from costing you the skill they were supposed to accelerate.' },
            { slug: 'ai-resume-screening-explained', why: 'The other side of it - what actually reads your resume, which is less clever and more mechanical than the folklore.' },
        ],
        faqs: [
            { question: 'Does using AI to write code make you a worse programmer?', answer: 'Only if you accept code you could not have written without understanding why it works. Learning happens through effortful retrieval, not recognition, and agreeing that generated code is correct feels like understanding while building none of the ability to produce it.' },
            { question: 'Can I use AI while preparing for coding interviews?', answer: 'Not during practice. The interview is a retrieval test with no assistant, so practising with one trains a skill you will not have access to. Use it afterwards instead: solve the problem cold, then ask for a critique.' },
            { question: 'Which AI coding tools are actually worth using?', answer: 'The dividing line is whether you can verify the output faster than you could produce it. Boilerplate, regular expressions, translating between languages and explaining unfamiliar code all qualify. The architecture and the concurrency do not.' },
            { question: 'Do companies use AI to screen resumes?', answer: 'Far less than people assume. An applicant tracking system parses your file into fields and indexes the text; a recruiter runs a keyword search and skims the results. The failure that actually costs interviews is the parsing step, not a model judging you.' },
        ],
        nextStep: { label: 'The resume that screening actually reads', href: '/blogs/topics/resume' },
    },
    'hiring': {
        body: [
            'These guides are for the other side of the table: the engineers and managers designing how their company interviews. Most interview loops were not designed; they accreted a round at a time, and nobody checked what each round predicts.',
            'The selection research is unusually clear on a few points. Structure beats chemistry, doing the work beats talking about it, and a pass mark is a floor rather than a portrait of a great hire. The rest is making those ideas practical in a week-long loop.',
        ],
        path: [
            { slug: 'technical-interview-process-design', why: 'Start here. One round per job need, a gate for each, and a loop that fits in a week.' },
            { slug: 'structured-interviews-engineering-hiring', why: 'The single change with the largest effect on interview quality.' },
            { slug: 'work-sample-vs-take-home-assignment', why: 'How to see real work without costing candidates a weekend.' },
            { slug: 'pass-marks-technical-assessments', why: 'Choosing the number that decides who you never meet, and checking it afterwards.' },
            { slug: 'hiring-junior-engineers-without-resume-filter', why: 'Screening a large junior pool on ability instead of background.' },
        ],
        faqs: [
            { question: 'What predicts engineering job performance best?', answer: 'In the selection research, structured interviews and work samples are among the strongest predictors; unstructured interviews are among the weakest.' },
            { question: 'How long should an engineering interview process take?', answer: 'About a week and four rounds for most roles. Longer loops lose the strongest candidates first, because they have other offers.' },
            { question: 'Should every interview round be able to reject a candidate?', answer: 'No. Decide in advance which rounds are hard gates and which are advisory, so a single interviewer cannot veto on a feeling.' },
        ],
        nextStep: { label: 'ShipItHQ for hiring teams', href: '/hire' },
    },
    'placements': {
        body: [
            'These guides are for the people who run placements: Training and Placement Officers, heads of department, placement coordinators and the faculty whose coursework decides what students can talk about in an interview.',
            'Most of what decides a placement season happens before the first company arrives. A batch that has been measured honestly, has a finished project each, and has sat a structured mock interview walks into the drives knowing what each round is for. The season itself is then logistics.',
        ],
        path: [
            { slug: 'placement-season-plan', why: 'Start here. What to do in each month before and during the season.' },
            { slug: 'placement-readiness-metrics', why: 'The five signals worth tracking instead of CGPA alone, and how to track them fairly.' },
            { slug: 'project-based-learning-cs', why: 'Coursework projects that leave every student with something to defend in an interview.' },
            { slug: 'mock-interviews-at-scale', why: 'A mock interview for every student without exhausting faculty.' },
            { slug: 'campus-recruiting-what-companies-want', why: 'The rounds companies run on campus, and the brief to send students before each drive.' },
        ],
        faqs: [
            { question: 'When should a placement cell start preparing for the season?', answer: 'At least a semester before the first drive, starting with a short readiness baseline for the whole batch.' },
            { question: 'What should a placement cell track besides CGPA?', answer: 'Timed problem solving, one finished project, a structured mock interview score, resume quality and communication, reported by department.' },
            { question: 'How can a college give every student a mock interview?', answer: 'Use a fixed structure and rubric, run AI voice mocks as the first pass for everyone, and save faculty and alumni for the final rounds.' },
        ],
        nextStep: { label: 'Campus placement preparation for students', href: '/blogs/campus-placement-preparation-guide' },
    },
}
