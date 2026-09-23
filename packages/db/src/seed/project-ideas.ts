// The curated project catalogue (plan/projects, PJ-2).
//
// What the ideas page browses. Deliberately NOT what "Picked for you" uses: those
// are invented per person from their onboarding, because an idea shaped to the
// hours someone actually has beats the nearest row in a fixed list. This set is
// for the person who wants to look through something good rather than be told.
//
// Every entry names the thing, says what it does, and says what the hard part
// will be - the last one is what makes it a project rather than a tutorial.

export interface CuratedIdea {
    projectTitle: string
    projectDescription: string
    /** EASY | MEDIUM | HARD */
    difficulty: string
    technologies: string[]
    categories: string[]
    primaryLanguageOrFramework: string
}

export const PROJECT_IDEAS: CuratedIdea[] = [
    {
        projectTitle: "Habit tracker with a weekly review",
        projectDescription: "Track a handful of habits a day and get a weekly page that shows what actually held. The hard part is designing the weekly roll-up so it stays honest when you miss days.",
        difficulty: "EASY",
        technologies: ["React", "TypeScript", "localStorage"],
        categories: ["web", "productivity"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Personal bookmark API",
        projectDescription: "A small service that stores links with tags and returns them as JSON, with a one-page reader. The hard part is designing the tag query so it stays fast as the list grows.",
        difficulty: "EASY",
        technologies: ["Node.js", "Express", "SQLite"],
        categories: ["backend", "api"],
        primaryLanguageOrFramework: "Node.js",
    },
    {
        projectTitle: "Markdown notes with full-text search",
        projectDescription: "Write notes in markdown and find any of them in under a second. The hard part is search that ranks by relevance rather than by date.",
        difficulty: "MEDIUM",
        technologies: ["React", "IndexedDB", "TypeScript"],
        categories: ["web", "productivity"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Expense splitter for a shared house",
        projectDescription: "Record who paid for what and settle up with the fewest transfers. The hard part is the settle-up algorithm, which is a real graph problem.",
        difficulty: "MEDIUM",
        technologies: ["Next.js", "PostgreSQL", "Prisma"],
        categories: ["web", "fullstack"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectTitle: "URL shortener with click analytics",
        projectDescription: "Shorten links and show where the clicks came from. The hard part is counting clicks without slowing the redirect down.",
        difficulty: "MEDIUM",
        technologies: ["Node.js", "Redis", "PostgreSQL"],
        categories: ["backend", "api"],
        primaryLanguageOrFramework: "Node.js",
    },
    {
        projectTitle: "Job application tracker",
        projectDescription: "Track applications through stages with reminders for the ones going cold. The hard part is a board that stays usable at two hundred rows.",
        difficulty: "EASY",
        technologies: ["React", "TypeScript", "Supabase"],
        categories: ["web", "career"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Recipe scaler and shopping list",
        projectDescription: "Scale a recipe to any number of people and turn a week of them into one shopping list. The hard part is merging units that do not match.",
        difficulty: "EASY",
        technologies: ["React", "TypeScript"],
        categories: ["web", "utility"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Realtime poll with live results",
        projectDescription: "Ask a question, watch the bars move as people answer. The hard part is keeping every browser in step without hammering the server.",
        difficulty: "MEDIUM",
        technologies: ["Next.js", "WebSockets", "Redis"],
        categories: ["web", "realtime"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectTitle: "Flashcards with spaced repetition",
        projectDescription: "Cards that come back exactly when you are about to forget them. The hard part is the scheduling algorithm and proving it behaves over months.",
        difficulty: "MEDIUM",
        technologies: ["React", "TypeScript", "IndexedDB"],
        categories: ["web", "learning"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Git commit visualiser",
        projectDescription: "Point it at a repository and see who changed what, when. The hard part is turning a commit graph into something readable.",
        difficulty: "MEDIUM",
        technologies: ["TypeScript", "D3", "GitHub API"],
        categories: ["web", "devtools"],
        primaryLanguageOrFramework: "TypeScript",
    },
    {
        projectTitle: "Image compressor in the browser",
        projectDescription: "Drop images in, get smaller ones out, without anything leaving the machine. The hard part is doing the work off the main thread so the page never freezes.",
        difficulty: "MEDIUM",
        technologies: ["TypeScript", "Web Workers", "Canvas"],
        categories: ["web", "utility"],
        primaryLanguageOrFramework: "TypeScript",
    },
    {
        projectTitle: "Personal finance dashboard",
        projectDescription: "Import a bank statement and see where the money actually goes. The hard part is categorising transactions from messy descriptions.",
        difficulty: "MEDIUM",
        technologies: ["Next.js", "PostgreSQL", "Recharts"],
        categories: ["web", "fullstack"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectTitle: "Kanban board with drag and drop",
        projectDescription: "Columns, cards, and an order that survives a reload. The hard part is reordering without renumbering every card in the column.",
        difficulty: "MEDIUM",
        technologies: ["React", "TypeScript", "dnd-kit"],
        categories: ["web", "productivity"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Chat app with rooms and history",
        projectDescription: "People join a room, talk, and see what was said before they arrived. The hard part is delivering messages once and only once.",
        difficulty: "HARD",
        technologies: ["Node.js", "WebSockets", "PostgreSQL"],
        categories: ["backend", "realtime"],
        primaryLanguageOrFramework: "Node.js",
    },
    {
        projectTitle: "Rate limiter as a service",
        projectDescription: "An API that answers whether a caller is over their limit in under a millisecond. The hard part is the sliding window, and proving it under load.",
        difficulty: "HARD",
        technologies: ["Go", "Redis"],
        categories: ["backend", "infrastructure"],
        primaryLanguageOrFramework: "Go",
    },
    {
        projectTitle: "Static site generator",
        projectDescription: "Turn a folder of markdown into a site, with templates and an index. The hard part is rebuilding only what changed.",
        difficulty: "MEDIUM",
        technologies: ["Node.js", "TypeScript"],
        categories: ["devtools", "cli"],
        primaryLanguageOrFramework: "Node.js",
    },
    {
        projectTitle: "Weather dashboard with caching",
        projectDescription: "One page, several cities, and an API you are not allowed to call on every render. The hard part is a cache that is fresh enough to trust.",
        difficulty: "EASY",
        technologies: ["React", "TypeScript", "REST"],
        categories: ["web", "api"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Pomodoro timer that survives a refresh",
        projectDescription: "A timer that keeps its place when the tab closes, with a history of the sessions you finished. The hard part is time that is right after the laptop slept.",
        difficulty: "EASY",
        technologies: ["React", "TypeScript", "localStorage"],
        categories: ["web", "productivity"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Blog with comments and moderation",
        projectDescription: "Write posts, take comments, keep the spam out. The hard part is moderation that one person can actually run.",
        difficulty: "MEDIUM",
        technologies: ["Next.js", "PostgreSQL", "Auth"],
        categories: ["web", "fullstack"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectTitle: "File upload service with resumable uploads",
        projectDescription: "Upload a large file over a bad connection and pick up where it stopped. The hard part is chunking and reassembly.",
        difficulty: "HARD",
        technologies: ["Node.js", "S3", "TypeScript"],
        categories: ["backend", "infrastructure"],
        primaryLanguageOrFramework: "Node.js",
    },
    {
        projectTitle: "Code snippet manager with syntax highlighting",
        projectDescription: "Keep the snippets you always retype, find them instantly, copy them in a keystroke. The hard part is search that understands code.",
        difficulty: "EASY",
        technologies: ["React", "TypeScript", "Prism"],
        categories: ["web", "devtools"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Interview question bank with spaced review",
        projectDescription: "Your own questions, tagged by topic, resurfacing before an interview. The hard part is deciding what to show today.",
        difficulty: "EASY",
        technologies: ["Next.js", "SQLite"],
        categories: ["web", "career"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectTitle: "REST API with proper auth",
        projectDescription: "Sign up, sign in, refresh, sign out, and every route knowing who is calling. The hard part is tokens that cannot be replayed.",
        difficulty: "MEDIUM",
        technologies: ["Node.js", "JWT", "PostgreSQL"],
        categories: ["backend", "api"],
        primaryLanguageOrFramework: "Node.js",
    },
    {
        projectTitle: "Real-time collaborative text editor",
        projectDescription: "Two people typing in the same document without losing a keystroke. The hard part is merging edits that arrive out of order.",
        difficulty: "HARD",
        technologies: ["TypeScript", "WebSockets", "CRDT"],
        categories: ["web", "realtime"],
        primaryLanguageOrFramework: "TypeScript",
    },
    {
        projectTitle: "Podcast player with offline episodes",
        projectDescription: "Subscribe to feeds, download episodes, play them on a train. The hard part is storage that does not fill the phone.",
        difficulty: "MEDIUM",
        technologies: ["React", "Service Workers", "IndexedDB"],
        categories: ["web", "media"],
        primaryLanguageOrFramework: "React",
    },
    {
        projectTitle: "Screenshot to markdown table",
        projectDescription: "Drop a screenshot of a table and get markdown out. The hard part is deciding where the columns are.",
        difficulty: "HARD",
        technologies: ["TypeScript", "OCR", "Canvas"],
        categories: ["web", "utility"],
        primaryLanguageOrFramework: "TypeScript",
    },
    {
        projectTitle: "Deployment status page",
        projectDescription: "One page that says whether each of your services is up, with the history. The hard part is checks that do not lie during a deploy.",
        difficulty: "MEDIUM",
        technologies: ["Next.js", "Cron", "PostgreSQL"],
        categories: ["devops", "fullstack"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectTitle: "CLI for your own scripts",
        projectDescription: "A command line tool with subcommands, flags and helpful errors. The hard part is an interface someone else can use without reading the source.",
        difficulty: "EASY",
        technologies: ["Node.js", "TypeScript", "Commander"],
        categories: ["cli", "devtools"],
        primaryLanguageOrFramework: "Node.js",
    },
    {
        projectTitle: "Image gallery with tags and search",
        projectDescription: "Upload pictures, tag them, find them later. The hard part is thumbnails that load fast on a phone.",
        difficulty: "MEDIUM",
        technologies: ["Next.js", "S3", "PostgreSQL"],
        categories: ["web", "fullstack"],
        primaryLanguageOrFramework: "Next.js",
    },
    {
        projectTitle: "Study group scheduler",
        projectDescription: "Everyone marks when they are free, the app finds the overlap. The hard part is time zones, which will be wrong at least twice.",
        difficulty: "MEDIUM",
        technologies: ["React", "TypeScript", "PostgreSQL"],
        categories: ["web", "utility"],
        primaryLanguageOrFramework: "React",
    },
]
