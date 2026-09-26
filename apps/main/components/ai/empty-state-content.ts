import type { EmptyAskItem, EmptyCreateItem, EmptyStateContent } from "@repo/ui/components/ai-chat/chat-empty-state";

// A new conversation's launcher in the student app (plan/ai-chat, AC-7): things the
// assistant can make (they lead to its write tools or richest reads), then
// questions it can answer. Everything sends straight away.

const CREATE: EmptyCreateItem[] = [
    {
        title: "Start a project",
        hint: "Pick an idea that fits you, get sprints and tasks",
        prompt: "Suggest a few projects I should build next based on my profile. Once I pick one, set it up for me.",
        glyph: "build",
    },
    {
        title: "Plan my DSA prep",
        hint: "Four weeks, starting from where you actually are",
        prompt: "Give me a 4-week DSA plan based on my practice so far.",
        glyph: "plan",
    },
    {
        title: "Review my resume",
        hint: "Gaps and phrasing, worst first",
        prompt: "Review my resume for a backend role. Lead with what is missing.",
        glyph: "resume",
    },
    {
        title: "Design a URL shortener",
        hint: "Walked through the way an interviewer would",
        prompt: "Design a URL shortener with me, the way an interviewer would run it.",
        glyph: "design",
    },
]

const ASK: EmptyAskItem[] = [
    { label: "What should I practice next?", prompt: "Looking at my practice stats, what should I practice next and why?" },
    { label: "Which of my projects shows my skills best?", prompt: "Which of my projects best shows my skills to a recruiter, and how could I make it stronger?" },
    { label: "How do I prepare for a system design round?", prompt: "How should I prepare for a system design interview round?" },
    { label: "Find jobs that match my profile", prompt: "Find jobs on ShipItHQ that match my profile." },
]

export const EMPTY_STATE: EmptyStateContent = {
	subtitle: { docked: "Projects, practice, your resume and interviews.", wide: "What would you like to get done?" },
	create: CREATE,
	ask: ASK,
	explainPage: true,
};

