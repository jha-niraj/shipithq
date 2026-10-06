import type { Chapter, SourceRef } from "./types"

/**
 * Case four as chapters (plan/rag-latency/case-outline.md, approved 2026-10-06). Eight
 * chapters: four on what happened, three fixes, and the twist. A composite: Parcelly, its
 * people and its numbers are the story's own. The method (measure, then cut the problem in
 * half until one half is left) and the scenario follow Gaurav Sen's walkthrough, credited on
 * the case; the words are ours. Library behaviour cites pgvector, RedisVL and LangChain,
 * checked 2026-10-06.
 */

const G = (section: string): SourceRef => ({ source: "G", section })
const PGV = (section: string): SourceRef => ({ source: "PGV", section })
const RVL = (section: string): SourceRef => ({ source: "RVL", section })
const LCS = (section: string): SourceRef => ({ source: "LCS", section })

const DAY = 86_400_000
const HOUR = 3_600_000

export const BOT_GLOSSARY: Record<string, { term: string; definition: string }> = {
    rag: { term: "RAG", definition: "Retrieval-augmented generation: find the passages that match a question, then hand them to the model with the question so it answers from them." },
    p95: { term: "p95", definition: "The time 95 out of 100 requests beat. p50 is the middle one. A gap between them means some requests wait for something the others don't." },
    trace: { term: "Trace", definition: "One request, followed through every part of the system, with how long each part took." },
    firstwords: { term: "Time to first words", definition: "How long until the reply starts to appear. With streaming, it is what the user actually waits for." },
    ingest: { term: "Ingest", definition: "The half of a RAG system that turns documents into searchable pieces: parse, chunk, embed, store." },
    chunk: { term: "Chunk", definition: "A piece of a document small enough to search and to fit in the model's prompt, often a few paragraphs." },
    embedding: { term: "Embedding", definition: "A list of numbers that stands for the meaning of a piece of text. Texts that mean similar things get nearby numbers." },
    ann: { term: "Approximate nearest neighbour (ANN)", definition: "Finding the vectors closest to a question without comparing it with every vector, by trading a little accuracy for a lot of speed." },
    ivfflat: { term: "IVFFlat", definition: "A pgvector index that sorts vectors into lists and searches only the lists nearest the question. Fast to build; the number of lists must suit the table's size." },
    hnsw: { term: "HNSW", definition: "A pgvector index built as a layered graph of near neighbours. Faster to search for the same accuracy than IVFFlat, slower to build, and larger." },
    recall: { term: "Recall", definition: "Of the passages an exact search would return, the share an approximate search also finds. A faster index that loses recall gives worse answers faster." },
    pool: { term: "Connection pool", definition: "A fixed set of open database connections shared by requests. When all are busy, new requests wait in line." },
    semcache: { term: "Semantic cache", definition: "A cache keyed by meaning: it returns a stored answer when a new question is close enough to an old one, not only when it is identical." },
    shard: { term: "Shard", definition: "One part of a store that has been split, here by region, so each search covers a smaller set." },
    semchunker: { term: "Semantic chunker", definition: "A splitter that embeds every sentence and cuts a document where neighbouring sentences mean different things." },
}

export const BOT_CHAPTERS: Chapter[] = [
    // ── 1 ─────────────────────────────────────────────────────────────────────
    {
        id: "slow",
        act: "What happened",
        title: "Eleven seconds to say hello",
        lead: "The bot was right. It was just so slow that people stopped asking it.",
        terms: ["rag", "p95"],
        blocks: [
            { kind: "say", focus: "queue", text: "Hold one question while you listen. When everyone says the AI is slow, what is the first thing you need before you change anything?" },
            { kind: "say", focus: "queue:0", text: "Parcelly helps small sellers ship parcels. Its support bot, Ask Parcelly, answers from more than a million documents: carrier rate sheets, customs rules, packaging policies, help articles." },
            { kind: "say", focus: "queue:2", text: "On a Tuesday, a seller typed: hi, where is my parcel? Three dots appeared, and stayed. Eleven seconds later the answer came, and it was right. She had already opened a ticket." },
            { kind: "say", focus: "queue:4", text: "She was not the only one. Tickets that started with the bot is slow tripled in a week." },
            {
                kind: "see", id: "queue", title: "The support queue, Tuesday (example)",
                lines: [
                    { t: "09:12", who: "Ticket", text: "\"Your assistant takes forever, I just want my tracking link\"" },
                    { t: "09:40", who: "Ticket", text: "\"Is the chat broken? It thinks for ages\"" },
                    { t: "10:03", who: "Ticket", text: "\"hi where is my parcel\" (bot answered after 11 s; seller had left)", tone: "bad" },
                    { t: "10:30", who: "Support", text: "That's 41 bot-is-slow tickets since Monday", tone: "muted" },
                    { t: "10:31", who: "Support", text: "Paging on-call: the assistant is slow for everyone", tone: "bad" },
                ],
            },
            { kind: "say", focus: "clock:import", text: "Here is the incident on one clock. T plus zero is a quiet Monday evening, nine days earlier. A big carrier's catalogue finished importing, and the bot's library passed one million documents." },
            { kind: "say", focus: "clock:detect", text: "Nobody connected the two for eight days. The first complaints were put down to a busy week." },
            {
                kind: "timeline", id: "clock", timeline: {
                    start: "Monday, 6 pm: a carrier's catalogue finishes importing",
                    caption: "Times and numbers are the story's own (an example).",
                    events: [
                        { id: "import", at: 0, kind: "change", label: "Catalogue imported", detail: "The library grows past 1.1 million documents, about 11 million chunks." },
                        { id: "first", at: 1 * DAY + 15 * HOUR, kind: "signal", label: "First complaint", detail: "\"The assistant is a bit slow today.\"" },
                        { id: "busy", at: 3 * DAY, kind: "mistake", label: "Put down to a busy week" },
                        { id: "page", at: 8 * DAY + 16 * HOUR, kind: "comms", label: "On-call paged", detail: "41 tickets about a slow bot since Monday." },
                        { id: "traced", at: 8 * DAY + 17 * HOUR, kind: "action", label: "One request traced" },
                        { id: "cause", at: 8 * DAY + 19 * HOUR, kind: "resolution", label: "Cause: the vector search", detail: "An index built for 50,000 documents, searching 11 million chunks." },
                        { id: "rebuilt", at: 9 * DAY + 14 * HOUR, kind: "change", label: "Index rebuilt", detail: "Fix one ships. Search falls from seconds to milliseconds." },
                    ],
                    spans: [
                        { id: "detect", label: "Time to notice", from: "import", to: "page" },
                        { id: "diagnose", label: "Time to the cause", from: "page", to: "cause" },
                        { id: "mitigate", label: "Time to fix one", from: "page", to: "rebuilt" },
                    ],
                },
            },
            { kind: "say", focus: "board:p95", text: "And the dashboard on-call opened. The slowest five percent of answers, the p95, climbs from under two seconds to more than eleven after the import." },
            { kind: "say", focus: "board:p50", text: "The middle answer, the p50, rises too, but less. Hold on to that gap; chapter four explains it." },
            { kind: "say", focus: "board:docs", text: "Underneath both, the size of the library. One step up, and it never comes back down." },
            {
                kind: "dashboard", id: "board", dashboard: {
                    caption: "Response time to first words, and the library under it (example).",
                    series: [
                        { id: "p95", name: "p95 to first words", unit: "s", bad: true, points: [[0, 1.7], [2 * HOUR, 8.9], [2 * DAY, 10.8], [5 * DAY, 11.2], [8 * DAY, 11.4], [9 * DAY, 11.4]] },
                        { id: "p50", name: "p50 to first words", unit: "s", points: [[0, 1.1], [2 * HOUR, 6.4], [2 * DAY, 6.9], [5 * DAY, 7.0], [8 * DAY, 7.0], [9 * DAY, 7.0]] },
                        { id: "tickets", name: "Bot-is-slow tickets", unit: "per day", points: [[0, 1], [2 * DAY, 3], [4 * DAY, 5], [6 * DAY, 8], [8 * DAY, 11], [9 * DAY, 12]] },
                        { id: "docs", name: "Documents indexed", unit: "million", points: [[0, 0.31], [60_000, 1.1], [9 * DAY, 1.1]] },
                    ],
                    markers: [
                        { id: "m-import", at: 0, label: "import" },
                        { id: "m-page", at: 8 * DAY + 16 * HOUR, label: "paged" },
                    ],
                },
            },
            { kind: "say", focus: "number", text: "So, your question. Before any fix, you need a number, and where it was measured. Slow for whom, how slow, since when. Everything that follows comes from that." },
            { kind: "note", id: "number", text: "\"It's slow\" is not a problem yet. \"p95 to first words went from 1.7 s to 11.4 s the night the library tripled\" is." },
        ],
        check: [
            { id: "first-thing", kind: "single", prompt: "Everyone says the bot is slow. What do you need first?", options: [
                { id: "number", label: "A number: how slow, for whom, measured where, and since when" },
                { id: "model", label: "A faster model" },
                { id: "cache", label: "A cache in front of the bot" },
            ], answer: "number", explanation: "Every fix in this case was chosen by measuring. Without a number you can't tell whether a change helped, and without a place you don't know which part to look at." },
            { id: "p95-means", kind: "truefalse", prompt: "A p95 of 11.4 seconds means most answers take about 11 seconds.", answer: false, explanation: "It means 95 in 100 answers are faster than 11.4 s. Here the middle answer took about 7 s. The gap between the two is a clue of its own." },
            { id: "when", kind: "single", prompt: "Which event on the clock lines up with the slowdown?", options: [
                { id: "import", label: "The catalogue import that took the library past a million documents" },
                { id: "busy", label: "A busy week of support tickets" },
                { id: "page", label: "On-call being paged" },
            ], answer: "import", explanation: "The p95 jumped the evening the import finished, and the document count never came back down. The tickets were a result, not a cause." },
        ],
        sources: [G("Optimize the AI Chatbot")],
    },

    // ── 2 ─────────────────────────────────────────────────────────────────────
    {
        id: "model",
        act: "What happened",
        title: "Is it the model?",
        lead: "Everyone blamed the LLM. One trace cleared it.",
        terms: ["trace", "firstwords"],
        blocks: [
            { kind: "say", focus: "trace", text: "Guess first. In an AI product that has gone slow, which part would you blame?" },
            { kind: "say", focus: "trace", text: "Most of the team blamed the model. It is the expensive, mysterious part, and it writes long answers. So on-call didn't argue. They traced one slow request from end to end." },
            { kind: "say", focus: "trace:ask", text: "The seller's question reaches the Chat API." },
            { kind: "say", focus: "trace:vec", text: "The question is turned into an embedding by the model provider. Forty milliseconds." },
            { kind: "say", focus: "trace:wait", text: "Then the request needs a database connection, and waits for one. Four point four seconds, doing nothing." },
            { kind: "say", focus: "trace:rows", text: "The vector search itself: six seconds to find the twenty nearest chunks." },
            { kind: "say", focus: "trace:top", text: "A small re-ranker picks the best five. Three hundred milliseconds." },
            { kind: "say", focus: "trace:first", text: "Only now does the model see the question. Its first words come back seven tenths of a second later, and the answer streams to the seller as it is written." },
            {
                kind: "sequence", id: "trace", sequence: {
                    caption: "One slow request on Tuesday at 10 am (example). Times are from the question arriving.",
                    actors: [
                        { id: "browser", label: "Seller", sub: "the chat window" },
                        { id: "api", label: "Chat API", sub: "retrieval + prompt" },
                        { id: "provider", label: "Model provider", sub: "embeddings + LLM" },
                        { id: "db", label: "Vector store", sub: "Postgres + pgvector" },
                        { id: "reranker", label: "Re-ranker", sub: "a small model" },
                    ],
                    messages: [
                        { id: "ask", from: "browser", to: "api", label: "\"hi, where is my parcel?\"", at: 0 },
                        { id: "embed", from: "api", to: "provider", label: "embed the question", at: 0 },
                        { id: "vec", from: "provider", to: "api", label: "the question's vector", at: 40, kind: "response" },
                        { id: "wait", from: "api", to: "db", label: "wait for a free connection", at: 40, kind: "async" },
                        { id: "search", from: "api", to: "db", label: "nearest 20 chunks", at: 4_440 },
                        { id: "rows", from: "db", to: "api", label: "20 chunks", at: 10_440, kind: "response" },
                        { id: "rerank", from: "api", to: "reranker", label: "20 down to 5", at: 10_440 },
                        { id: "top", from: "reranker", to: "api", label: "the best 5", at: 10_740, kind: "response" },
                        { id: "prompt", from: "api", to: "provider", label: "question + 5 chunks", at: 10_740 },
                        { id: "first", from: "provider", to: "api", label: "first words", at: 11_440, kind: "response" },
                        { id: "stream", from: "api", to: "browser", label: "the answer, as it streams", at: 11_440, kind: "response" },
                    ],
                    cuts: [{ at: 3_000, label: "3 s: the team's target for first words (example)" }],
                },
            },
            { kind: "say", focus: "spans:Vector search", text: "Here is the same trace as shares. The vector search alone is more than half of the wait." },
            { kind: "say", focus: "spans:Waiting for a database connection", text: "Waiting for a connection is another third. That is time spent in line, not working." },
            { kind: "say", focus: "spans:The model, to first words", text: "And the model, the part everyone blamed, is six percent." },
            { kind: "compare", id: "spans", columns: ["Time", "Share of the wait"], rows: [
                { label: "Embedding the question", cells: ["40 ms", "0.4%"] },
                { label: "Waiting for a database connection", cells: ["4.4 s", "38%"] },
                { label: "Vector search", cells: ["6.0 s", "52%"] },
                { label: "Re-ranking", cells: ["0.3 s", "3%"] },
                { label: "The model, to first words", cells: ["0.7 s", "6%"] },
            ] },
            { kind: "say", focus: "cut", text: "So, your guess. Before you swap models, check whether the time is spent inside your own system or outside it. Here it was inside: in the database, before the model was even asked." },
            { kind: "note", id: "cut", text: "Cut the problem in two and measure which half is slow. Inside or outside our system was the first cut. The database was the answer." },
        ],
        check: [
            { id: "where-time", kind: "pick", figure: "map", prompt: "Tap the part of the system that spent most of the time.", parts: [
                { id: "browser", label: "Seller" },
                { id: "api", label: "Chat API" },
                { id: "provider", label: "Model provider" },
                { id: "vectordb", label: "Vector store" },
                { id: "reranker", label: "Re-ranker" },
            ], answer: ["vectordb"], explanation: "Waiting for a connection and the search itself, together 10.4 of the 11.4 seconds, were both spent on the vector store." },
            { id: "long-answer", kind: "single", prompt: "The model writes long answers. Why isn't that the problem here?", options: [
                { id: "stream", label: "The answer streams, so the seller waits only for the first words: 0.7 s" },
                { id: "short", label: "The answers are actually short" },
                { id: "cached", label: "The model's answers are cached" },
            ], answer: "stream", explanation: "With streaming, what a person waits for is the first words. The model took 0.7 s to start; the other 10.7 s came before it was asked." },
            { id: "faster-model", kind: "truefalse", prompt: "Switching to a faster model would roughly halve the wait.", answer: false, explanation: "The model is 6 percent of the wait. Even a model twice as fast saves about 0.35 s of 11.4." },
        ],
        sources: [G("Root Cause Analysis")],
    },

    // ── 3 ─────────────────────────────────────────────────────────────────────
    {
        id: "halves",
        act: "What happened",
        title: "Two halves of a RAG bot",
        lead: "A RAG bot does two jobs. Only one of them was running.",
        terms: ["ingest", "chunk", "embedding"],
        blocks: [
            { kind: "say", focus: "halves", text: "Guess first. The bot gets its knowledge from documents. Could turning documents into knowledge be what is slow?" },
            { kind: "say", focus: "halves:upload", text: "Every RAG system has two halves. The top row is ingest: it runs when a document arrives." },
            { kind: "say", focus: "halves:parse", text: "Read the file, whatever its format." },
            { kind: "say", focus: "halves:chunk", text: "Cut it into chunks: pieces small enough to search, and to fit in a prompt." },
            { kind: "say", focus: "halves:iembed", text: "Turn each chunk into an embedding, a list of numbers standing for its meaning." },
            { kind: "say", focus: "halves:store", text: "And store the vectors, here in Postgres with the pgvector extension." },
            { kind: "say", focus: "halves:ask", text: "The bottom row is answering. It runs on every question." },
            { kind: "say", focus: "halves:search", text: "Embed the question, find the nearest chunks in the store, re-rank them, and hand the best to the model." },
            {
                kind: "flow", id: "halves", flow: {
                    width: 780, height: 250,
                    caption: "Ingest (top) was switched off for customers. Only the bottom row ran when a seller asked.",
                    nodes: [
                        { id: "upload", label: "A document arrives", x: 10, y: 20, w: 140, tone: "muted", order: 1 },
                        { id: "parse", label: "Parse", x: 165, y: 20, w: 110, tone: "muted", order: 2 },
                        { id: "chunk", label: "Chunk", x: 290, y: 20, w: 110, tone: "muted", order: 3 },
                        { id: "iembed", label: "Embed chunks", x: 415, y: 20, w: 130, tone: "muted", order: 4 },
                        { id: "store", label: "Vector store", sub: "11 M vectors", x: 600, y: 95, w: 170, tone: "strong", order: 5 },
                        { id: "ask", label: "A question", x: 10, y: 170, w: 140, order: 6 },
                        { id: "qembed", label: "Embed it", x: 165, y: 170, w: 110, order: 7 },
                        { id: "search", label: "Search", sub: "nearest 20", x: 290, y: 170, w: 110, tone: "bad", order: 7 },
                        { id: "rerank", label: "Re-rank", sub: "best 5", x: 415, y: 170, w: 130, order: 8 },
                    ],
                    edges: [
                        { from: "upload", to: "parse", dashed: true },
                        { from: "parse", to: "chunk", dashed: true },
                        { from: "chunk", to: "iembed", dashed: true },
                        { from: "iembed", to: "store", dashed: true },
                        { from: "ask", to: "qembed", flowing: true },
                        { from: "qembed", to: "search", flowing: true },
                        { from: "search", to: "store", bad: true, label: "every question" },
                        { from: "search", to: "rerank" },
                    ],
                },
            },
            { kind: "say", focus: "halves:upload", text: "Now your guess. Ingest ran when Parcelly's team loaded documents, overnight, in batches. Customers could not upload anything yet, so no seller's question ever waited on it." },
            { kind: "say", focus: "method", text: "That is the second cut. Not the model; not ingest. The slow part was the answer path's search, which every single question goes through." },
            { kind: "note", id: "method", text: "Each cut throws away half the system: inside or outside, ingest or answering, search or re-rank. Keep cutting until one part is left." },
        ],
        check: [
            { id: "order-answer", kind: "order", prompt: "Put the answer path in order.", items: [
                { id: "q", label: "The seller asks a question" },
                { id: "e", label: "The question is turned into an embedding" },
                { id: "s", label: "The vector store finds the nearest chunks" },
                { id: "r", label: "The re-ranker keeps the best few" },
                { id: "m", label: "The model answers from them" },
            ], explanation: "Search happens on every question, before the model sees anything. That is why a slow search makes every answer slow." },
            { id: "sort-halves", kind: "buckets", prompt: "Sort each step into its half.", buckets: [
                { id: "ingest", label: "Ingest" },
                { id: "answer", label: "Answering" },
            ], items: [
                { id: "parse", label: "Parse a PDF", bucket: "ingest" },
                { id: "chunk", label: "Cut a document into chunks", bucket: "ingest" },
                { id: "search", label: "Find the nearest chunks", bucket: "answer" },
                { id: "rerank", label: "Re-rank 20 chunks to 5", bucket: "answer" },
            ], explanation: "Ingest prepares the library; answering reads it. With uploads off, only answering ran when a seller was waiting." },
        ],
        sources: [G("Root Cause Analysis")],
    },

    // ── 4 ─────────────────────────────────────────────────────────────────────
    {
        id: "size",
        act: "What happened",
        title: "Ten million vectors per question",
        lead: "The index was built for fifty thousand documents. There were more than a million.",
        terms: ["ann", "ivfflat", "pool"],
        blocks: [
            { kind: "say", focus: "why:trigger", text: "Hold one question while you listen. Why was the p95, the slow tail, so much worse than the middle answer?" },
            { kind: "say", focus: "why:symptom", text: "Start with the size. One point one million documents, about ten chunks each. That is roughly eleven million vectors, and every question is compared against them." },
            { kind: "say", focus: "why:ann", text: "Nobody compares a question with all eleven million. An approximate nearest neighbour index exists to skip most of them, trading a little accuracy for a lot of speed." },
            { kind: "say", focus: "why:index", text: "Parcelly's index was an IVFFlat index. It sorts vectors into lists, and a search only looks inside the lists nearest the question." },
            { kind: "say", focus: "why:index", text: "It was created a year earlier, on fifty thousand documents, with a hundred lists. Back then, a hundred lists of five thousand vectors made sense." },
            { kind: "say", focus: "why:index", text: "The lists were never rebuilt. With eleven million vectors, each of the hundred lists now held about a hundred and ten thousand. And the search looked in ten of them: more than a million comparisons for every question." },
            { kind: "say", focus: "why:pool", text: "Then the second effect. Each slow search held a database connection for six seconds. The pool had ten connections. At ten in the morning, two questions arrived every second, and two a second for six seconds each needs twelve." },
            { kind: "say", focus: "why:queue", text: "So questions queued for a connection, and the queue grew whenever traffic rose. That is the four point four seconds of waiting in the trace, and that is why the slow tail grew faster than the middle." },
            {
                kind: "causes", id: "why", causes: {
                    caption: "Read it from the symptom back: each of these had to be true.",
                    symptom: { id: "symptom", label: "11.4 s to first words at peak", detail: "7 s at quiet times." },
                    trigger: { id: "trigger", label: "The library grew to 11 M vectors", detail: "One carrier import, overnight." },
                    contributing: [
                        { id: "index", label: "An index sized for 50,000 documents", detail: "100 lists of ~110,000 vectors each; 10 lists searched.", sources: [PGV("IVFFlat")] },
                        { id: "pool", label: "A pool of 10 connections", detail: "Each held for 6 s by a slow search." },
                        { id: "queue", label: "Queueing at peak", detail: "2 questions a second need 12 connections." },
                    ],
                    latent: [
                        { id: "ann", label: "Index settings never revisited", detail: "Right for the table it was built on, wrong for the one it became." },
                        { id: "nomeasure", label: "No alert on search time", detail: "Only on errors, and a slow search is not an error." },
                    ],
                },
            },
            { kind: "say", focus: "ann:IVFFlat", text: "Here are the three ways to search. pgvector's own guide says how to size an IVFFlat index: build it after the table has data, about rows divided by a thousand lists up to a million rows, and the square root of the rows beyond that." },
            { kind: "say", focus: "ann:HNSW", text: "HNSW is a graph of near neighbours instead of lists. The same guide says it searches faster for the same accuracy, but takes longer to build and uses more memory." },
            { kind: "compare", id: "ann", columns: ["How it searches", "The trade"], rows: [
                { label: "Exact search", cells: ["Compares the question with every vector", "Perfect recall; far too slow at 11 million"] },
                { label: "IVFFlat", cells: ["Searches only the lists nearest the question", "Fast to build, small; lists must match the table's size"] },
                { label: "HNSW", cells: ["Walks a layered graph of near neighbours", "Better speed for the same recall; slower build, more memory"] },
            ] },
            { kind: "say", focus: "tail", text: "So, your question. The middle answer paid for a slow search. The slow tail paid for the slow search and for the line in front of it. When a gap opens between p50 and p95, look for something requests wait in." },
            { kind: "note", id: "tail", text: "An index is sized for a table. When the table grows thirty times, the index is a different index." },
        ],
        check: [
            { id: "gap", kind: "single", prompt: "Why was p95 (11.4 s) so much worse than p50 (7 s)?", options: [
                { id: "queue", label: "At peak, questions also queued for a database connection" },
                { id: "model", label: "The model was slower for some questions" },
                { id: "network", label: "Some sellers had slow internet" },
            ], answer: "queue", explanation: "Each slow search held a connection for 6 s. With 10 connections and 2 questions a second, requests waited in line, and the line was longest at peak." },
            { id: "lists", kind: "single", prompt: "pgvector's guide suggests how many IVFFlat lists for 11 million rows?", options: [
                { id: "sqrt", label: "About the square root of the rows: roughly 3,300" },
                { id: "same", label: "Keep 100: lists don't depend on size" },
                { id: "rows", label: "One list per row" },
            ], answer: "sqrt", explanation: "rows / 1000 up to a million rows, sqrt(rows) beyond. sqrt(11,000,000) is about 3,317." },
            { id: "where-wait", kind: "pick", figure: "map", prompt: "Tap the part where questions queued.", parts: [
                { id: "api", label: "Chat API" },
                { id: "vectordb", label: "Vector store" },
                { id: "provider", label: "Model provider" },
                { id: "reranker", label: "Re-ranker" },
            ], answer: ["vectordb"], explanation: "They queued for the vector store's connections: the database could only work on ten at once." },
        ],
        talk: {
            opening: "Before anyone touches the index, convince me the vector store is the problem and not the model or the network.",
            probe: ["what the trace showed, span by span", "why p95 and p50 moved by different amounts", "what changed on the night it started"],
        },
        sources: [PGV("IVFFlat"), PGV("HNSW"), G("Optimizing DB queries")],
        links: [{ label: "pgvector on GitHub", href: "https://github.com/pgvector/pgvector" }],
    },

    // ── 5 ─────────────────────────────────────────────────────────────────────
    {
        id: "index",
        act: "How it was fixed",
        title: "Fix one: an index sized for today",
        lead: "The cheapest fix was a few numbers in a CREATE INDEX statement.",
        terms: ["hnsw", "recall"],
        blocks: [
            { kind: "say", focus: "options", text: "Guess first. A faster index is better. Is there any reason not to take the fastest one?" },
            { kind: "say", focus: "options:Rebuilt IVFFlat", text: "Option one: rebuild IVFFlat for today's table. About three thousand three hundred lists, the square root of the rows, and around fifty-eight probes, the square root of the lists, as a starting point." },
            { kind: "say", focus: "options:HNSW", text: "Option two: HNSW, with pgvector's defaults: sixteen connections per layer and a build list of sixty-four. At query time, a setting called ef search, forty by default, decides how hard each search looks." },
            { kind: "say", focus: "options:Old index", text: "And before any of it, they did the step most teams skip. Two hundred real questions from the ticket queue, with the chunks an exact search returns for each. Recall is the share of those an index also finds." },
            { kind: "compare", id: "options", columns: ["Search time", "Recall", "Build"], rows: [
                { label: "Old index", cells: ["6.0 s", "0.91", "Built a year ago on 50,000 documents"] },
                { label: "Rebuilt IVFFlat", cells: ["180 ms", "0.95", "About 40 minutes"] },
                { label: "HNSW", cells: ["60 ms", "0.97", "About 5 hours, and more memory"] },
            ] },
            { kind: "say", focus: "options:HNSW", text: "Numbers from the story, but the shape is pgvector's own description. HNSW gives better speed for the same recall, and costs build time and memory. They built it on a replica overnight and switched in the morning." },
            { kind: "say", focus: "map:vectordb", text: "Two smaller changes went with it. The pool got a timeout, so a request that cannot get a connection fails fast instead of waiting forever. And the search for chunks and the lookup of the seller's orders now run at the same time instead of one after the other." },
            { kind: "say", focus: "result", text: "So, your guess. The fastest index is not free. You pay in recall, in build time and in memory, and you only know the recall if you measured it. Search fell from six seconds to sixty milliseconds; with the searches short, the pool never filled again; first words came in about one point one seconds." },
            { kind: "note", id: "result", text: "Measure recall on real questions before and after. A faster index that finds worse chunks gives worse answers faster." },
        ],
        check: [
            { id: "free", kind: "truefalse", prompt: "A faster index is a free improvement.", answer: false, explanation: "pgvector's HNSW trades slower builds and more memory for speed, and every approximate index trades some recall. Measure recall on real questions before switching." },
            { id: "efsearch", kind: "single", prompt: "Raising hnsw.ef_search does what?", options: [
                { id: "recall", label: "Each search looks harder: better recall, slower search" },
                { id: "build", label: "The index builds faster" },
                { id: "size", label: "The index gets smaller" },
            ], answer: "recall", explanation: "ef_search is the size of the candidate list a search keeps (40 by default). Bigger means more thorough and slower; it is set per query, without rebuilding." },
            { id: "pool-after", kind: "single", prompt: "After fix one, why did the connection pool stop filling?", options: [
                { id: "short", label: "Each search held a connection for 60 ms instead of 6 s" },
                { id: "bigger", label: "The pool was made much bigger" },
                { id: "fewer", label: "Fewer sellers used the bot" },
            ], answer: "short", explanation: "Two questions a second for 60 ms each needs a fraction of one connection. The queue was a symptom of the slow search." },
        ],
        sources: [PGV("HNSW"), PGV("HNSW > Index Options"), PGV("HNSW > Query Options"), PGV("IVFFlat"), PGV("IVFFlat > Query Options")],
    },

    // ── 6 ─────────────────────────────────────────────────────────────────────
    {
        id: "cache",
        act: "How it was fixed",
        title: "Fix two: remember what repeats",
        lead: "A third of the questions were the same twenty questions, asked differently.",
        terms: ["semcache"],
        blocks: [
            { kind: "say", focus: "paths", text: "Guess first. Parcelly added a cache in front of the bot, keyed by the exact question. How often do you think it hit?" },
            { kind: "say", focus: "paths", text: "About two percent of the time. Nobody types the same sentence twice. How do I send a parcel to Ireland, and what do I need to ship to Dublin, are the same question to a person and different keys to a cache." },
            { kind: "say", focus: "paths:check", text: "So they tried a semantic cache. It stores each question's embedding with its answer. A new question is embedded and compared with the stored ones." },
            { kind: "say", focus: "paths:hit", text: "If one is close enough, within a distance threshold, the stored answer comes straight back: no search, no re-rank, no model. In Redis's library for this, the threshold defaults to zero point one." },
            { kind: "say", focus: "paths:miss", text: "If nothing is close enough, the question goes the normal way, and its answer is stored for next time." },
            {
                kind: "flow", id: "paths", flow: {
                    width: 780, height: 220,
                    caption: "A hit skips the search and the model. A miss costs one extra lookup.",
                    nodes: [
                        { id: "q", label: "A question", x: 10, y: 80, w: 130 },
                        { id: "check", label: "Close to a stored one?", sub: "distance under the threshold", x: 170, y: 80, w: 190, decision: true },
                        { id: "hit", label: "Stored answer", sub: "about 50 ms", x: 420, y: 10, w: 170, tone: "good" },
                        { id: "miss", label: "Search, re-rank, model", sub: "about 1.1 s", x: 420, y: 150, w: 170 },
                        { id: "save", label: "Store the answer", x: 620, y: 150, w: 150, tone: "muted" },
                    ],
                    edges: [
                        { from: "q", to: "check", flowing: true },
                        { from: "check", to: "hit", label: "yes" },
                        { from: "check", to: "miss", label: "no" },
                        { from: "miss", to: "save", dashed: true },
                    ],
                },
            },
            { kind: "say", focus: "risks:Too loose", text: "Then the danger: a wrong answer, served fast. Set the threshold too loose and where is my refund matches where is my parcel." },
            { kind: "say", focus: "risks:Personal", text: "Worse, some answers belong to one seller. Where is my parcel must never be answered from another seller's cache entry. Parcelly cached only general questions, and kept the seller as a filter on anything personal." },
            { kind: "say", focus: "risks:Stale", text: "And documents change. When a carrier publishes new rates, every cached answer that quoted the old sheet is wrong. Entries got a time to live, and an update to a document cleared the answers built on it." },
            { kind: "compare", id: "risks", columns: ["What goes wrong", "What they did"], rows: [
                { label: "Too loose", cells: ["Different questions share an answer", "Tuned the threshold on real question pairs"] },
                { label: "Personal", cells: ["One seller sees another's answer", "Cached general questions only; filtered by seller"] },
                { label: "Stale", cells: ["A changed rate sheet keeps its old answer", "A time to live, and clearing on document updates"] },
            ] },
            { kind: "say", focus: "repeat", text: "So, your guess: an exact-match cache barely hits a chat bot. A cache keyed by meaning does, and it needs rules about what may be shared and for how long. A whole case on exact-match caching is on its way." },
            { kind: "note", id: "repeat", text: "Cache what repeats, decide what may be shared, and decide when it goes stale, before the first entry is written." },
        ],
        check: [
            { id: "exact", kind: "single", prompt: "Why did the exact-match cache hit only about 2% of the time?", options: [
                { id: "words", label: "People ask the same thing in different words" },
                { id: "small", label: "The cache was too small" },
                { id: "ttl", label: "Entries expired too fast" },
            ], answer: "words", explanation: "An exact key needs the exact sentence. A semantic cache compares meaning, through embeddings, instead." },
            { id: "threshold", kind: "single", prompt: "The threshold is loosened so more questions hit. What is the risk?", options: [
                { id: "wrong", label: "Questions that only look alike get each other's answers" },
                { id: "slow", label: "Hits get slower" },
                { id: "none", label: "None: more hits is always better" },
            ], answer: "wrong", explanation: "A looser threshold matches more distant questions. \"Where is my refund\" can land on \"where is my parcel\"'s answer." },
            { id: "personal", kind: "truefalse", prompt: "\"Where is my parcel?\" can safely be answered from the cache for any seller.", answer: false, explanation: "The answer depends on the seller's own orders. Cache only general answers, or filter entries by seller." },
        ],
        sources: [RVL("SemanticCache"), RVL("check"), RVL("store")],
    },

    // ── 7 ─────────────────────────────────────────────────────────────────────
    {
        id: "shards",
        act: "How it was fixed",
        title: "Fix three: search only the shelf you need",
        lead: "A question about UK customs never needed to look at US rate sheets.",
        terms: ["shard"],
        blocks: [
            { kind: "say", focus: "change", text: "Guess first. Fix one made every search fast. Why would anyone split the store as well?" },
            { kind: "say", focus: "change:vectordb", text: "Because the library would keep growing. Parcelly was signing a carrier a month, and every one added rate sheets and rules. They split the store by region: the UK, the EU and North America, each a shard of about three and a half million vectors." },
            { kind: "say", focus: "change:router", text: "A router sends each question to the shard it needs. Most of the time the seller's own country decides it, at no cost. A small classifier handles the rest." },
            { kind: "say", focus: "change:cache", text: "And the semantic cache from fix two sits in front of all of it." },
            { kind: "map-change", id: "change", caption: "Fixes two and three as a change to the system." },
            { kind: "say", focus: "routing:Misrouted", text: "The risk is a question sent to the wrong shelf. A seller in the UK asking about shipping to New York needs the North American rates." },
            { kind: "say", focus: "routing:Low confidence", text: "So when the router is unsure, it searches every shard at once and merges the results. Slower, and still right." },
            { kind: "compare", id: "routing", columns: ["Searched", "Cost"], rows: [
                { label: "Routed", cells: ["One shard", "The fastest search; most questions"] },
                { label: "Low confidence", cells: ["All shards, at once, then merged", "Slower, never wrong for want of a shelf"] },
                { label: "Misrouted", cells: ["The wrong shard only", "Finds nothing useful: the reason for the fallback"] },
            ] },
            { kind: "say", focus: "order", text: "So, your guess. Splitting is not about this week's slowdown, which fix one already solved. It is about the next three carriers. Each shard searches less, and each can grow on its own machines." },
            { kind: "note", id: "order", text: "Fix in order of cost: tune the index first, cache what repeats second, split the store when growth demands it." },
        ],
        check: [
            { id: "why-shard", kind: "single", prompt: "Fix one already made search fast. Why shard?", options: [
                { id: "growth", label: "The library keeps growing; each shard searches less and scales on its own" },
                { id: "now", label: "Search was still slow after fix one" },
                { id: "cache", label: "The cache needs shards to work" },
            ], answer: "growth", explanation: "Sharding was for the carriers still to come. It keeps each search small as the library grows." },
            { id: "misroute", kind: "single", prompt: "A UK seller asks about shipping to New York, and gets nothing useful. Where did it go wrong?", options: [
                { id: "router", label: "The router sent it to the UK shard because of the seller's country" },
                { id: "cache", label: "The semantic cache returned a UK answer" },
                { id: "model", label: "The model didn't know about New York" },
            ], answer: "router", explanation: "Routing by the seller's country misses a question about another region. When unsure, the router should search every shard and merge." },
        ],
        talk: {
            opening: "Sharding adds a router, three stores and a fallback. Make the case for or against doing it this month.",
            probe: ["what fix one already solved", "how fast the library is growing", "what a misrouted question costs and how you would notice"],
        },
        sources: [G("Optimizing DB queries")],
    },

    // ── 8 ─────────────────────────────────────────────────────────────────────
    {
        id: "upload",
        act: "The twist",
        title: "The upload that took an afternoon",
        lead: "Then they switched uploads back on.",
        terms: ["semchunker"],
        blocks: [
            { kind: "say", focus: "ingest", text: "Hold one question while you listen. Answers were fast again. Then sellers were allowed to upload their own contracts, so the bot could answer about them. What do you think was slow now?" },
            { kind: "say", focus: "ingest:up", text: "A seller uploaded a forty-page carrier contract. It took twenty-five minutes before the bot could answer anything about it, and the ingest queue backed up behind it." },
            { kind: "say", focus: "ingest:parse", text: "This is the other half of the bot, the one that was off in chapter three. Parsing came first: twelve minutes, because the contract was a scanned PDF and needed text recognition." },
            { kind: "say", focus: "ingest:loop", text: "Then chunking, nine minutes. The team used a semantic chunker. It splits the text into sentences, embeds each one with its neighbours, and cuts wherever two neighbours mean different things." },
            { kind: "say", focus: "ingest:loop", text: "That means one embedding for every sentence, about twelve hundred for this contract, before a single chunk is embedded for real. At the provider's rate limits, that is minutes." },
            { kind: "say", focus: "ingest:emb", text: "Then the real chunks are embedded and stored. Four more minutes." },
            {
                kind: "sequence", id: "ingest", sequence: {
                    caption: "One uploaded contract (example). Most of the time goes before the chunks exist.",
                    actors: [
                        { id: "seller", label: "Seller", sub: "uploads a contract" },
                        { id: "ingest", label: "Ingest", sub: "chunk + store" },
                        { id: "parser", label: "Parser", sub: "text recognition" },
                        { id: "provider", label: "Model provider", sub: "embeddings" },
                        { id: "store", label: "Vector store" },
                    ],
                    messages: [
                        { id: "up", from: "seller", to: "ingest", label: "a 40-page scanned PDF", at: 0 },
                        { id: "parse", from: "ingest", to: "parser", label: "read the scanned pages", at: 0 },
                        { id: "text", from: "parser", to: "ingest", label: "the text, 12 min later", at: 720_000, kind: "response" },
                        { id: "loop", from: "ingest", to: "provider", label: "embed every sentence (~1,200)", at: 720_000 },
                        { id: "dist", from: "provider", to: "ingest", label: "sentence vectors: find the cuts", at: 1_260_000, kind: "response" },
                        { id: "emb", from: "ingest", to: "provider", label: "embed the real chunks", at: 1_260_000 },
                        { id: "save", from: "ingest", to: "store", label: "store the vectors", at: 1_500_000 },
                        { id: "ready", from: "ingest", to: "seller", label: "searchable, 25 min later", at: 1_500_000, kind: "response" },
                    ],
                },
            },
            { kind: "say", focus: "chunkers:Semantic chunker", text: "The semantic chunker is a reasonable idea: cut where the meaning changes. Its cost grows with every sentence, and for Parcelly's contracts the better chunks didn't improve answers enough to pay for it." },
            { kind: "say", focus: "chunkers:Structure first", text: "They switched to splitting on the document's structure: headings, then paragraphs, then sentences, until each piece fits, with a little overlap. And they measured recall again before and after." },
            { kind: "compare", id: "chunkers", columns: ["How it cuts", "Cost per contract"], rows: [
                { label: "Semantic chunker", cells: ["Where neighbouring sentences differ in meaning", "~1,200 extra embeddings"] },
                { label: "Structure first", cells: ["Headings, paragraphs, then sentences, with overlap", "None beyond the chunks themselves"] },
            ] },
            { kind: "say", focus: "async", text: "So, your question. The slow part moved to the half that had been switched off. They batched the embedding calls, moved ingest onto a queue with a progress bar for the seller, and parsed each file once. Uploads took under four minutes." },
            { kind: "note", id: "async", text: "A RAG bot has two halves. Fixing one leaves the other waiting for its turn to be slow." },
        ],
        check: [
            { id: "chunker-slow", kind: "single", prompt: "What makes the semantic chunker slow?", options: [
                { id: "embed", label: "It embeds every sentence to decide where to cut, before the chunks are embedded" },
                { id: "store", label: "It stores every sentence in the vector store" },
                { id: "model", label: "It asks the LLM to read the document" },
            ], answer: "embed", explanation: "It splits into sentences, embeds each with its neighbours, and cuts where neighbouring vectors differ. That is one embedding per sentence, on top of the chunks' own." },
            { id: "order-ingest", kind: "order", prompt: "Put ingest in order.", items: [
                { id: "p", label: "Parse the file into text" },
                { id: "c", label: "Cut the text into chunks" },
                { id: "e", label: "Embed each chunk" },
                { id: "s", label: "Store the vectors" },
            ], explanation: "Parse, chunk, embed, store. In this contract most of the time went in the first two." },
        ],
        sources: [LCS("SemanticChunker"), G("Follow-up question")],
    },
]

export const BOT_LEARN: { title: string; summary: string }[] = [
    { title: "Measuring latency", summary: "p50 and p95, time to first words, and tracing one request through every part." },
    { title: "How RAG works", summary: "The two halves: ingest (parse, chunk, embed, store) and answering (embed, search, re-rank, generate)." },
    { title: "Vector indexes", summary: "Exact search, IVFFlat and HNSW in pgvector, how to size them, and recall." },
    { title: "Caching LLM answers", summary: "Exact and semantic caches, thresholds, what may be shared, and staleness." },
    { title: "Scaling a vector store", summary: "Sharding by a key, routing questions, and the fallback when routing is unsure." },
    { title: "Chunking at scale", summary: "Semantic and structural chunking, what each costs, and measuring the difference." },
]
