import type { SeedSprint } from "./types"

// A search engine is the clearest way to learn why data structures matter: the
// same 2,000 notes are instant or unusable depending on what you built to look
// through them. Sprint 1 makes notes that survive a reload, sprint 2 builds the
// inverted index that scanning cannot replace, sprint 3 is the hard part of
// ranking results by relevance rather than by date, and sprint 4 keeps it fast
// while the notes are being edited under it.
const sprints: SeedSprint[] = [
    {
        name: "Notes that survive a reload",
        goal: "Markdown notes can be written, rendered and reopened after closing the tab, with nothing stored on a server.",
        duration: "1 week",
        tasks: [
            {
                title: "Set up the app and a typed note model",
                description: [
                    "Create the React and TypeScript app and define the note type once, in one file, with an id, a title, the markdown body and created and updated timestamps. Everything later in the project depends on this shape.",
                    "Keep the type strict from the start. A note whose body might be undefined will cost you an afternoon in the indexing sprint."
                ],
                criteria: [
                    "The project type checks with strict mode on and no use of any in the note model.",
                    "A note object constructed without a required field is a compile error, not a runtime surprise.",
                    "The app builds and renders a hard coded note."
                ],
                hints: [
                    "Decide whether timestamps are numbers or Date objects now. IndexedDB stores both, but only one of them sorts and compares without conversion.",
                    "An id that sorts by creation time saves you a secondary index later."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "45 minutes",
                category: "setup"
            },
            {
                title: "Store notes in IndexedDB",
                description: [
                    "Put the notes in an IndexedDB object store with the id as the key, and write the small layer that creates, reads, updates and deletes them. Include the version and upgrade handling, because you will change the schema twice in this project.",
                    "IndexedDB is asynchronous and event based underneath, which makes it awkward to call from React until you have wrapped it."
                ],
                criteria: [
                    "Creating three notes, closing the tab and reopening it shows the same three notes.",
                    "Bumping the database version runs an upgrade handler once and leaves existing notes readable.",
                    "Every store function returns a promise, so no component handles a raw request event."
                ],
                hints: [
                    "A thin promise wrapper around the raw API, or a small existing library, will save repeating the same event plumbing in every function.",
                    "The upgrade handler is the only place you are allowed to create stores and indexes. Design for that constraint rather than around it."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 15 minutes",
                category: "data"
            },
            {
                title: "Write and render markdown side by side",
                description: [
                    "Build the editor: a textarea of markdown on one side, the rendered result on the other, updating as you type. Support the usual subset of headings, lists, links, inline code and fenced blocks.",
                    "Rendering markdown means rendering whatever the user typed, so this is also where you decide what happens to a script tag pasted into a note."
                ],
                criteria: [
                    "Typing in the editor updates the preview within 100 milliseconds on a 2,000 word note.",
                    "A note containing a script tag renders as text and executes nothing.",
                    "A fenced code block renders with its content unchanged, including any markdown characters inside it."
                ],
                hints: [
                    "Re-parsing the entire document on every keystroke is fine at 2,000 words and not at 20,000. Measure before you decide whether to debounce.",
                    "Look at what your markdown renderer does with raw HTML by default, and whether that default is the one you want."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "frontend"
            },
            {
                title: "Save as you type without losing work",
                description: [
                    "Persist edits automatically rather than behind a save button, and make sure a note being edited when the tab is closed is not lost. Show the user when the last save happened.",
                    "Writing to IndexedDB on every keystroke is wasteful and writing on a timer can drop the last few seconds. The interesting part is the case in between."
                ],
                criteria: [
                    "Typing continuously for 30 seconds produces far fewer writes than keystrokes, and the note in the database matches the editor at the end.",
                    "Closing the tab within a second of the last keystroke still persists that keystroke.",
                    "The interface shows a saved indicator that reflects the actual write, not the intent to write."
                ],
                hints: [
                    "Debouncing alone loses the tail. There is a page lifecycle event for the moment a tab is being hidden or discarded, and it is not the one most people reach for first.",
                    "Treat the editor state as the truth and the database as a follower, rather than reading back after every write."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "frontend"
            },
            {
                title: "List, open and delete notes",
                description: [
                    "Build the note list with titles and dates, opening a note into the editor and deleting one with a confirmation. Derive the title from the first heading when the user has not set one.",
                    "This is the baseline the search has to beat. Sorted by date, a list of 50 notes is usable and a list of 2,000 is not, which is the point."
                ],
                criteria: [
                    "The list sorts by most recently updated, and editing a note moves it to the top without a reload.",
                    "A note with no explicit title shows its first heading, or its first line of text if it has no heading.",
                    "Deleting a note removes it from the list and from IndexedDB, and reopening the app does not bring it back."
                ],
                hints: [
                    "Read the list from an IndexedDB index on the updated timestamp rather than sorting every note in memory.",
                    "Generate a seed script that creates a few hundred notes now. You will need the volume in the next sprint."
                ],
                difficulty: "BEGINNER",
                estimatedTime: "1 hour",
                category: "frontend"
            }
        ]
    },
    {
        name: "Build an inverted index",
        goal: "Every word in every note is in a structure that maps terms to the notes containing them, maintained as notes change.",
        duration: "1 week",
        tasks: [
            {
                title: "Tokenise markdown into searchable terms",
                description: [
                    "Write the tokeniser: markdown in, a list of terms out. Decide what a term is, what to lowercase, what punctuation to drop and what to do with code blocks, URLs and hyphenated words.",
                    "Every later decision about ranking depends on this. If the tokeniser splits \"state-of-the-art\" into four terms, no amount of clever scoring recovers the phrase."
                ],
                criteria: [
                    "Tokenising a note containing markdown syntax returns no asterisks, hashes or bracket characters as terms.",
                    "Searching for a term that appears only inside a fenced code block finds the note, because code is indexed rather than stripped.",
                    "The tokeniser is a pure function with unit tests covering at least 15 cases, including URLs, contractions and hyphenated words."
                ],
                hints: [
                    "Splitting on whitespace is the obvious start and fails on punctuation attached to words. Look at what Unicode-aware word segmentation gives you for free in the browser.",
                    "Keep the character offset of each token as you go. Sprint 3 needs it for snippets and you will not want to tokenise twice."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Normalise terms so plurals and tenses match",
                description: [
                    "Add a normalisation step so that searching for \"running\" finds \"run\", and \"databases\" finds \"database\". Apply the same transformation at index time and at query time.",
                    "The trap is over-stemming: an aggressive algorithm collapses \"university\" and \"universe\" into the same term and the results start looking random."
                ],
                criteria: [
                    "Searching for \"running\" returns a note containing only the word \"run\" and vice versa.",
                    "A stop word list removes the most common words from the index, and the index for 500 notes is measurably smaller as a result.",
                    "Searching for a term that only exists as a stop word returns an explained empty result rather than every note."
                ],
                hints: [
                    "There are well known stemming algorithms with browser-sized implementations. Try one before writing suffix rules by hand.",
                    "Store the original token alongside the normalised one. Highlighting needs the word the user actually wrote."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Store the inverted index in IndexedDB",
                description: [
                    "Build the structure that maps each term to the notes containing it, with the number of occurrences and the positions, and store it in its own object store so it survives a reload without being rebuilt.",
                    "The design question is granularity: one record per term with a long posting list, or one record per term and note. Both work, and they fail in different ways."
                ],
                criteria: [
                    "After indexing 500 notes, reloading the page performs zero re-indexing and search works immediately.",
                    "Looking up a single term reads a bounded number of records rather than scanning the whole store.",
                    "The index for 500 notes of about 500 words each builds in under 10 seconds."
                ],
                hints: [
                    "Think about what happens to a posting list for a term that appears in every note when one note changes. That is the argument for the finer granularity.",
                    "IndexedDB key ranges over a compound key let you fetch all records for one term in a single cursor pass."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "data"
            },
            {
                title: "Keep the index current as notes change",
                description: [
                    "When a note is saved, remove its old postings and add its new ones. When it is deleted, remove them entirely. The index must never contain a note that no longer exists or miss one that does.",
                    "This is where search engines usually break in practice. The index is correct after the initial build and drifts from there."
                ],
                criteria: [
                    "Deleting a note and searching for a word unique to it returns no results.",
                    "Editing a note to remove a word and searching for that word no longer returns the note.",
                    "A consistency check that reindexes everything from scratch and compares finds zero differences after 50 mixed edits and deletes."
                ],
                hints: [
                    "Write the consistency check first. It is the only way you will know the incremental path is right.",
                    "The index update and the note write need to be one unit. Consider what happens if the tab closes between them."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Return exact and multi-term matches",
                description: [
                    "Wire the index to a search box. A single term returns every note containing it. Multiple terms return the notes containing all of them, by intersecting the posting lists.",
                    "Order does not matter yet: results can come back in any order. Getting the right set before the right order keeps the two problems separate."
                ],
                criteria: [
                    "Searching two terms returns only notes containing both, verified against a brute force scan over the same notes.",
                    "A search across 500 notes returns its result set in under 100 milliseconds.",
                    "An empty query returns no results rather than every note or an error."
                ],
                hints: [
                    "Intersect the shortest posting list against the longer ones rather than the other way round.",
                    "Keep the brute force scan in the codebase as a test oracle. You will compare against it for the rest of the project."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 15 minutes",
                category: "frontend"
            }
        ]
    },
    {
        name: "Rank by relevance",
        goal: "The most relevant note is first rather than the most recent one, and the result explains why it matched.",
        duration: "1 week",
        tasks: [
            {
                title: "Score results by term frequency and rarity",
                description: [
                    "Replace the arbitrary result order with a score. A term that appears in three notes out of 500 says far more about a match than one that appears in 400, and a note that uses a term eight times is a better match than one that uses it once.",
                    "This is the heart of the project. Implement a scoring function, and be able to say what each part of it is compensating for."
                ],
                criteria: [
                    "Searching a rare term ranks the note that uses it repeatedly above a note that mentions it once in passing.",
                    "A 10,000 word note is not automatically ranked above a 200 word note that is genuinely more on topic, because length is accounted for.",
                    "Scores are stable: running the same query twice returns the same order, including for notes that tie."
                ],
                hints: [
                    "Look up how term frequency and inverse document frequency are combined, and then at why the standard ranking function adds a saturation and a length term on top.",
                    "You need the document count and the average document length available at query time. Decide where those are kept updated."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "2 hours",
                category: "data"
            },
            {
                title: "Weight titles and headings above body text",
                description: [
                    "A term in a note's title means more than the same term in the fourth paragraph. Record which field or structural level each occurrence came from and use it in the score.",
                    "The tokeniser currently flattens the document. Preserving where a term appeared means carrying that through indexing without doubling the index size."
                ],
                criteria: [
                    "Of two notes containing a term the same number of times, the one with the term in its title ranks first.",
                    "The boost is configurable in one place and changing it reorders results without reindexing.",
                    "The field information adds less than 20 per cent to the stored index size."
                ],
                hints: [
                    "A small integer per posting is enough to say which field a term came from. You do not need a separate index per field.",
                    "Decide whether a heading inside the body counts as a title. Both answers are defensible and the tests should say which you chose."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 15 minutes",
                category: "data"
            },
            {
                title: "Show snippets with the matched terms highlighted",
                description: [
                    "Each result should show the passage that matched, not the first 200 characters of the note, with the query terms marked inside it. Pick the window of text that contains the most query terms.",
                    "This is what makes a result list scannable, and it is why the tokeniser kept character offsets."
                ],
                criteria: [
                    "A note whose only match is at word 3,000 shows a snippet from around word 3,000, not from the start.",
                    "A query with two terms prefers a snippet containing both over a snippet containing one.",
                    "Highlighted text shows the word the user typed as it appears in the note, including its original case and suffix."
                ],
                hints: [
                    "A sliding window over the matched positions is enough. Score each candidate window by how many distinct query terms it covers.",
                    "Building the highlight by string replacement will eventually inject something you did not intend. Build it from offsets instead."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 30 minutes",
                category: "frontend"
            },
            {
                title: "Search as the user types",
                description: [
                    "Run the search on each keystroke and show results live, with prefix matching so \"data\" matches \"database\" before the word is finished. Cancel work for queries the user has already moved past.",
                    "Instant search is a concurrency problem as much as a speed one: the results for \"dat\" must not arrive after the results for \"database\" and overwrite them."
                ],
                criteria: [
                    "Typing an eight character query shows results updating as the query grows, and the final results shown are those for the full query.",
                    "Typing quickly then stopping never leaves stale results for a shorter prefix on screen.",
                    "Each keystroke's results appear in under 150 milliseconds with 500 notes indexed."
                ],
                hints: [
                    "Prefix matching over the term store is a key range scan, not a filter over every term.",
                    "Tagging each search with a sequence number and discarding late arrivals is simpler than trying to cancel the work itself."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "frontend"
            },
            {
                title: "Support quoted phrases and excluded terms",
                description: [
                    "Parse a small query syntax: a quoted string matches those words adjacent and in order, and a leading minus excludes notes containing a term. Everything else stays as it is.",
                    "Phrase search is the payoff for storing positions rather than just counts, and the query parser is the first place a malformed input can take the whole search down."
                ],
                criteria: [
                    "Searching for a two word phrase in quotes returns only notes where those words are adjacent and in that order.",
                    "A query with a minus term returns no note containing that term, verified against the brute force scan.",
                    "An unbalanced quote or a query of only excluded terms returns a sensible result rather than throwing."
                ],
                hints: [
                    "Phrase matching is an intersection on positions: the candidates are notes containing all the terms, and then you check the offsets line up.",
                    "Write the query parser as its own function returning a structured query, so search does not deal with strings at all."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            }
        ]
    },
    {
        name: "Keep it fast at scale",
        goal: "Search stays under a second and the interface stays responsive with thousands of long notes and a growing index.",
        duration: "1 week",
        tasks: [
            {
                title: "Move indexing off the main thread",
                description: [
                    "Indexing a long note blocks the UI while it runs, which is exactly when the user is typing. Move the tokenising, normalising and index writing into a web worker and keep the main thread for rendering.",
                    "The interesting part is the message boundary: what you send, what you send back, and what happens if a second note is saved while the first is still being indexed."
                ],
                criteria: [
                    "Saving a 3,000 word note produces no frame longer than 50 milliseconds on the main thread, measured in the performance profiler.",
                    "Saving two notes in quick succession indexes both, in order, with no lost update.",
                    "Search results are identical to those produced before the worker was introduced, verified against the brute force scan."
                ],
                hints: [
                    "Both threads can open the same IndexedDB database. Decide which one is allowed to write the index and keep to it.",
                    "Structured cloning copies the message, so sending a whole note back and forth is not free. Send what is needed."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Measure search against a large corpus",
                description: [
                    "Generate 2,000 notes of realistic length and write a benchmark that reports index build time, index size and the time for a set of representative queries. Record the numbers.",
                    "Without a benchmark, every optimisation in this sprint is guesswork, and some of them will make things slower."
                ],
                criteria: [
                    "A note of 3,000 words is found by a term unique to it in under one second on the 2,000 note corpus.",
                    "The benchmark prints index build time, stored index size and per-query timings, and fails if a query exceeds one second.",
                    "The generated corpus has a realistic word distribution rather than random strings, so rare and common terms both exist."
                ],
                hints: [
                    "Random characters make every term unique, which makes the index look fast and the ranking look perfect. Use real text.",
                    "Measure with the profiler throttled to a slower device. Desktop numbers hide the problems this sprint exists to find."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour 15 minutes",
                category: "testing"
            },
            {
                title: "Reindex in the background without blocking search",
                description: [
                    "Changing the tokeniser or the stemmer invalidates the whole index. Build a reindex that runs in chunks, leaves the old index searchable while it works, and swaps over only when it is complete.",
                    "You will need this the first time you change a scoring decision, and doing it naively means a blank search box for 30 seconds."
                ],
                criteria: [
                    "A full reindex of 2,000 notes runs to completion while search continues to return results throughout.",
                    "Closing the tab mid-reindex leaves the previous index intact and searchable on reopening.",
                    "The index version is stored, and a mismatch with the code's expected version triggers the reindex automatically."
                ],
                hints: [
                    "Build into a second store and swap the pointer at the end, rather than mutating in place.",
                    "Chunk by note count and yield between chunks, so the worker does not hold the database in one long transaction."
                ],
                difficulty: "ADVANCED",
                estimatedTime: "1 hour 30 minutes",
                category: "data"
            },
            {
                title: "Handle a full or unavailable storage quota",
                description: [
                    "IndexedDB has a quota and it can be refused entirely in private browsing. Detect these cases, tell the user what has happened, and keep the app usable for reading rather than failing blank.",
                    "The index is the largest thing you are storing and the first thing to hit a quota, which gives you an option the note data does not have."
                ],
                criteria: [
                    "With storage denied, the app loads and shows a clear message instead of a blank page or a console error.",
                    "A quota exceeded error during indexing is caught, reported, and leaves the existing notes readable.",
                    "The app reports current usage against the quota somewhere the user can see it."
                ],
                hints: [
                    "There is a storage estimate API for usage and quota. Check what it reports in a private window before relying on it.",
                    "The index can be rebuilt from the notes. That asymmetry tells you what to sacrifice first when space runs out."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "1 hour",
                category: "data"
            },
            {
                title: "Export and import the whole notebook",
                description: [
                    "Add an export that writes every note out as markdown files in a single archive, and an import that reads one back. The index is not exported, because it is derived.",
                    "Local-only data with no way out is a trap for the user. This is also the honest test of whether your note model holds everything that matters."
                ],
                criteria: [
                    "Exporting 2,000 notes and importing them into an empty instance reproduces every note's title, body and timestamps.",
                    "The exported files open as ordinary markdown in a text editor, with no wrapper format around the body.",
                    "Importing into an instance that already has notes merges rather than replacing, and the index is correct afterwards."
                ],
                hints: [
                    "Filenames from note titles will collide and contain characters the filesystem rejects. Decide the rule before writing the loop.",
                    "Timestamps have to live somewhere in a plain markdown file. Front matter is the usual answer."
                ],
                difficulty: "INTERMEDIATE",
                estimatedTime: "45 minutes",
                category: "data"
            }
        ]
    }
]

export default sprints
