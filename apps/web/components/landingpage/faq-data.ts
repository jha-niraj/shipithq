/**
 * The landing page FAQ, as data.
 *
 * Split out of `faqs.tsx` so `app/page.tsx` - a server component - can emit `FAQPage`
 * JSON-LD from the SAME array the accordion renders. It could not before: the list lived
 * inside a `"use client"` module, so the only way to get structured data was a second copy
 * of nine questions, which would have drifted the first time one was edited.
 *
 * Google requires the marked-up answer to match the visible one. One array is the only way
 * to guarantee that without a test.
 */

// Rewritten 2026-08-20. The previous set described a DIFFERENT PRODUCT - courses,
// lessons, videos, "new languages added regularly", certificates for completing a
// course. None of that exists here and none of it ever did on this platform; it is
// inherited from an earlier language-tutorial site. See plan/web/polish/01-content-truth.md.
//
// Every answer below is checked against a route in apps/main. Answers are written
// ANSWER-FIRST - the first sentence answers the question and stands on its own -
// because that is the form AI Overviews and assistants quote.
export const LANDING_FAQS: readonly { id: string; question: string; answer: string }[] = [
    {
        id: "item-1",
        question: "What is ShipItHQ?",
        answer: "ShipItHQ is an interview-preparation and portfolio platform for computer-science students and software engineers. In one place: pattern-based practice across DSA, system design, frontend and backend; guided portfolio projects broken into real tasks; voice mock interviews with scored feedback; AI tools for your resume and cover letters; a job's own interview rounds to practise; and incident cases, real production failures you work through with an AI lead."
    },
    {
        id: "item-2",
        question: "How is this different from LeetCode?",
        answer: "LeetCode gives you problems; ShipItHQ gives you the whole loop from practice to portfolio to interview. Practice is organised by pattern rather than by problem count, hints nudge rather than reveal, and the same account also builds the projects you talk about in an interview and runs the mock interview where you talk about them."
    },
    {
        id: "item-3",
        question: "Does my code actually run?",
        answer: "Yes - in a real Linux container, not a browser emulator. JavaScript, TypeScript, Python, Java and C++ execute server-side with the real toolchain, so your program behaves the way it would on your own machine rather than in a simulated subset."
    },
    {
        id: "item-4",
        question: "What are the mock interviews like?",
        answer: "They are spoken conversations with an AI interviewer, not multiple-choice quizzes. You talk through the round, the interviewer asks follow-up questions, and afterwards you get a transcript plus scored feedback on communication, technical depth and problem-solving with specific moments quoted back to you."
    },
    {
        id: "item-5",
        question: "How do credits work?",
        answer: "ShipItHQ is credit-based and every new account starts with 100 free credits, no card required. Credits are spent on AI operations - generating a project, tailoring a resume, running a mock interview - and each operation shows its cost before you confirm. Credits never expire, and if an AI operation fails, the credits are refunded automatically."
    },
    {
        id: "item-6",
        question: "Can it tailor my resume to a specific job?",
        answer: "Yes. Paste a job description and ShipItHQ writes a tailored copy of your existing resume rather than asking you to re-enter your experience. Your original is never overwritten - the tailored version is saved as a separate resume - and it will not invent employers, dates or skills you have not listed."
    },
    {
        id: "item-7",
        question: "Do I need experience to start?",
        answer: "No, but this is a platform for people who already write some code. If you are learning your first language, start with a language course elsewhere and come back when you can solve a basic problem unaided - practice here assumes you can read and write code, and the projects assume you can run a development environment."
    },
    {
        id: "item-8",
        question: "Do I get a certificate?",
        answer: "No, and that is deliberate. What you get instead is evidence a hiring manager can check: deployed projects with commit history, a public profile, and a record of what you have actually solved. A certificate from a platform nobody has heard of does less for you than one project you can explain in detail."
    },
    {
        id: "item-9",
        question: "Does it work on a phone?",
        answer: "Most of it does. Reading problems, reviewing projects, running mock interviews and editing your resume all work on a phone. Writing and running code is a desktop job - a code editor on a 360px screen is a worse experience than we are willing to ship."
    }
];

