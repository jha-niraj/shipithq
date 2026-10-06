import type { IncidentCase, SimLane, SimRun, SimValues, SourceRef } from "./types"
import { getIncidentMeta } from "./index"
import { BOT_CHAPTERS, BOT_GLOSSARY, BOT_LEARN } from "./the-bot-chapters"

/**
 * Case four (plan/rag-latency, outline approved 2026-10-06): a RAG support bot gone slow. A
 * composite: Parcelly, its people and its numbers are the story's own. The method and the
 * scenario follow Gaurav Sen's walkthrough of the interview question, credited on the case
 * (`credit` in index.ts); the words are ours. pgvector, RedisVL and LangChain behaviour is
 * cited, checked 2026-10-06.
 *
 * The cause: an IVFFlat index sized for 50,000 documents, searching 11 million chunks, with
 * a pool of ten connections that filled at peak. Three fixes in order of cost (index, a
 * semantic cache, shards), then the twist: uploads, and the semantic chunker.
 */

const G = (section: string): SourceRef => ({ source: "G", section })
const PGV = (section: string): SourceRef => ({ source: "PGV", section })
const RVL = (section: string): SourceRef => ({ source: "RVL", section })
const LCS = (section: string): SourceRef => ({ source: "LCS", section })

// ── The simulator ──────────────────────────────────────────────────────────
//
// One question's path, in seconds, with the story's own (example) timings. The shape is the
// sources': an index sized for a much smaller table searches far more than it should
// (pgvector, IVFFlat), HNSW searches faster for the same recall (pgvector, HNSW), a slow
// query holds a connection, and a semantic cache answers a reworded repeat without the
// search or the model (RedisVL, SemanticCache).

const SPAN = 14
const EMBED = 0.04
const LOOKUP = 0.01
const RERANK = 0.3
const FIRST = 0.7
const STREAM = 2.5
const CACHED = 0.3
const TARGET = 3

/** Seconds per search, by index and by store. */
const SEARCH: Record<string, Record<string, number>> = {
    old: { one: 6.0, sharded: 2.0 },
    rebuilt: { one: 0.18, sharded: 0.07 },
    hnsw: { one: 0.06, sharded: 0.03 },
}

const r2 = (n: number) => Math.round(n * 100) / 100

function simulate(v: SimValues): SimRun {
    const search = SEARCH[v.index ?? "old"]?.[v.store ?? "one"] ?? 6
    const cached = v.cache !== "none"
    const hit = v.cache === "semantic" && v.question === "repeat"
    // At peak, two questions a second share ten connections: a slow search makes the rest queue.
    const wait = v.load === "peak" && search > 1 ? r2(search * 0.73) : 0
    const meter = { label: "Target: first words in 3 s (example)", budget: TARGET, rate: 1 }
    const marks: SimRun["marks"] = [{ at: TARGET, label: "3 s target", tone: "muted" }]

    if (hit) {
        const first = r2(EMBED + LOOKUP)
        const end = r2(first + CACHED)
        const lanes: SimLane[] = [
            { id: "seller", label: "Seller", segments: [{ from: 0, to: first, state: "wait", label: "Three dots" }, { from: first, to: end, state: "done", label: "The answer" }, { from: end, to: SPAN, state: "idle" }] },
            { id: "cache", label: "Semantic cache", segments: [{ from: 0, to: EMBED, state: "wait", label: "Embed" }, { from: EMBED, to: first, state: "run", label: "Hit" }, { from: first, to: SPAN, state: "done", label: "Stored answer sent" }] },
            { id: "pool", label: "Connection pool", segments: [{ from: 0, to: SPAN, state: "never", label: "Not needed" }] },
            { id: "search", label: "Vector search", segments: [{ from: 0, to: SPAN, state: "never", label: "Skipped" }] },
            { id: "model", label: "Re-rank and model", segments: [{ from: 0, to: SPAN, state: "never", label: "Skipped" }] },
        ]
        return {
            verdict: "completes", end, headline: `Answered from the cache in ${first.toFixed(2)} s`,
            reason: "A reworded repeat of a common question landed within the distance threshold of a stored one. The stored answer came straight back: no search, no re-rank, no model.",
            sources: [RVL("SemanticCache"), RVL("check")], lanes, marks, meter,
        }
    }

    const start = r2(EMBED + (cached ? LOOKUP : 0))
    const searchFrom = r2(start + wait)
    const searchTo = r2(searchFrom + search)
    const rerankTo = r2(searchTo + RERANK)
    const first = r2(rerankTo + FIRST)
    const end = r2(first + STREAM)
    const millions = v.store === "sharded" ? "3.7 M" : "11 M"
    const lanes: SimLane[] = [
        { id: "seller", label: "Seller", segments: [{ from: 0, to: first, state: "wait", label: "Three dots" }, { from: first, to: end, state: "done", label: "The answer streams" }, { from: end, to: SPAN, state: "idle" }] },
        { id: "cache", label: "Semantic cache", segments: cached
            ? [{ from: 0, to: start, state: "run", label: v.cache === "exact" ? "Exact key: miss" : "Nothing close: miss" }, { from: start, to: SPAN, state: "idle" }]
            : [{ from: 0, to: SPAN, state: "never", label: "No cache" }] },
        { id: "pool", label: "Connection pool", segments: wait > 0
            ? [{ from: start, to: searchFrom, state: "wait", label: "Waiting for a free connection" }, { from: searchFrom, to: searchTo, state: "run", label: "Holding one" }, { from: searchTo, to: SPAN, state: "idle" }]
            : [{ from: 0, to: searchFrom, state: "idle" }, { from: searchFrom, to: searchTo, state: "run", label: "Holding one" }, { from: searchTo, to: SPAN, state: "idle" }] },
        { id: "search", label: "Vector search", segments: [{ from: 0, to: searchFrom, state: "idle" }, { from: searchFrom, to: searchTo, state: "run", label: `Searching ${millions} vectors` }, { from: searchTo, to: SPAN, state: "done" }] },
        { id: "model", label: "Re-rank and model", segments: [{ from: 0, to: searchTo, state: "idle" }, { from: searchTo, to: rerankTo, state: "run", label: "Re-rank" }, { from: rerankTo, to: first, state: "run", label: "First words" }, { from: first, to: end, state: "background", label: "Streaming" }, { from: end, to: SPAN, state: "done" }] },
    ]
    const slow = first > TARGET
    return {
        verdict: "completes", end,
        headline: `First words at ${first.toFixed(2)} s`,
        reason: slow
            ? wait > 0
                ? `The search took ${search} s, and at peak each slow search held a connection, so this question waited ${wait} s for one first.`
                : `The search took ${search} s: the index was not sized for the table it was searching.`
            : "The search was fast enough that the pool never filled; most of the time went to the re-ranker and the model's first words.",
        sources: slow ? [PGV("IVFFlat"), PGV("IVFFlat > Query Options")] : [PGV("HNSW")],
        lanes, marks: slow ? [...marks, { at: first, label: "first words", tone: "bad" }] : marks, meter,
    }
}

// ── Code ───────────────────────────────────────────────────────────────────

const INDEX_SQL = `-- The old index: created a year ago on 50,000 documents.
-- CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Option one: IVFFlat sized for 11 million rows (pgvector: sqrt(rows) lists over 1M rows).
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 3317);
SET ivfflat.probes = 58;      -- a starting point: sqrt(lists). Higher: better recall, slower.

-- Option two, the one they shipped: HNSW with pgvector's defaults.
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
SET hnsw.ef_search = 40;      -- per query. Higher: better recall, slower.`

const CHUNK_CODE = `// Split on the document's structure, not on meaning: no embedding calls to decide a cut.
const SEPARATORS = ["\\n## ", "\\n\\n", ". "]

export function split(text: string, max = 3200, overlap = 320, level = 0): string[] {
  if (text.length <= max) return [text]
  const sep = SEPARATORS[level]
  if (!sep) return hardSplit(text, max, overlap)
  const pieces: string[] = []
  let current = ""
  for (const part of text.split(sep)) {
    const next = current ? current + sep + part : part
    if (next.length <= max) { current = next; continue }
    if (current) pieces.push(current)
    current = part
  }
  if (current) pieces.push(current)
  // Anything still too long is split again on the next separator down.
  return pieces.flatMap((p) => (p.length > max ? split(p, max, overlap, level + 1) : [p]))
}

function hardSplit(text: string, max: number, overlap: number): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += max - overlap) out.push(text.slice(i, i + max))
  return out
}

// Embed in batches: one call per hundred chunks, not one per sentence.
export async function embedAll(chunks: string[], embed: (batch: string[]) => Promise<number[][]>) {
  const vectors: number[][] = []
  for (let i = 0; i < chunks.length; i += 100) vectors.push(...(await embed(chunks.slice(i, i + 100))))
  return vectors
}`

// ── The case ───────────────────────────────────────────────────────────────

const meta = getIncidentMeta("the-bot-that-searched-the-whole-library")!

export const botThatSearchedTheWholeLibrary: IncidentCase = {
    ...meta,
    sources: {
        G: { title: "If our AI chatbot is taking too long to respond, what can we do to reduce latency? (video)", author: "Gaurav Sen, on LinkedIn", date: "2026-10-05", url: "https://www.linkedin.com/feed/update/urn:li:activity:7512856137524965377/" },
        PGV: { title: "pgvector README", author: "pgvector", date: "2026-10-06", url: "https://github.com/pgvector/pgvector" },
        RVL: { title: "RedisVL: LLM Cache (SemanticCache)", author: "Redis", date: "2026-10-06", url: "https://redis.io/docs/latest/develop/ai/redisvl/api/cache/" },
        LCS: { title: "langchain-experimental: SemanticChunker (text_splitter.py)", author: "LangChain", date: "2026-10-06", url: "https://github.com/langchain-ai/langchain-experimental/blob/main/libs/experimental/langchain_experimental/text_splitter.py" },
    },

    story: [
        { kind: "scene", id: "company", at: "A year ago", text: "Parcelly helps small sellers ship parcels. Its support bot, Ask Parcelly, answers from the company's documents: rate sheets, customs rules, packaging policies, help articles. At launch there were fifty thousand of them. (A composite: the company and its numbers are the story's own.)" },
        { kind: "scene", id: "import", at: "Monday, 6 pm", text: "A large carrier joined. Its catalogue was imported overnight, and the library passed 1.1 million documents: about eleven million chunks to search." },
        {
            kind: "thread", id: "tickets", at: "Tuesday, a week later", channel: "#support",
            messages: [
                { from: "Support", t: "10:30", text: "41 tickets this week that just say the bot is slow. One seller waited 11 seconds for 'where is my parcel'." },
                { from: "On-call", t: "10:41", text: "It's the model, surely. Long answers. We could switch to a smaller one." },
                { from: "A teammate", t: "10:42", text: "Can we trace one request before we swap anything?" },
            ],
        },
        {
            kind: "evidence", id: "trace", at: "Tuesday, 11:20 am",
            title: "One slow request, traced",
            rows: [
                { label: "embed the question", value: "40 ms" },
                { label: "wait for a database connection", value: "4.4 s" },
                { label: "vector search", value: "6.0 s" },
                { label: "re-rank", value: "300 ms" },
                { label: "model, to first words", value: "700 ms" },
            ],
            note: "10.4 of the 11.4 seconds were spent on the vector store before the model was asked anything.",
            sources: [G("Root Cause Analysis")],
        },
        {
            kind: "fork", id: "fork", at: "Tuesday, noon",
            prompt: "You own the bot. The trace is on your screen. What do you change first?",
            options: [
                { id: "model", label: "Switch to a faster model", consequence: "The model is 6% of the wait. You'd save about a third of a second." },
                { id: "index", label: "Rebuild the vector index for today's table", consequence: "That's what they did first. Search went from 6 s to 60 ms. Chapter 5." },
                { id: "pool", label: "Make the connection pool bigger", consequence: "The line gets shorter, and every search is still 6 s. The middle answer stays at 7 s." },
                { id: "cache", label: "Put a cache in front of the bot", consequence: "Helpful later, for repeats. Every new question would still pay the full search." },
            ],
            after: "They rebuilt the index.",
        },
        { kind: "scene", id: "diagnosis", at: "What actually happened", text: "Nobody wrote a slow search. The index was right for the table it was built on, and the table grew thirty times in one night. Slow searches held connections, the pool filled, and questions queued behind each other." },
    ],

    model: {
        diagram: "rag-answer-path",
        intro: "A RAG bot answers in two halves of work, and only one of them runs while a person waits. Find the half, then the part, then the reason.",
        steps: [
            { id: "measure", title: "A number, measured somewhere", focus: "measure", body: "Slow for whom, how slow, since when. p95 to first words went from 1.7 s to 11.4 s the night the library grew.", sources: [G("Optimize the AI Chatbot")] },
            { id: "cut", title: "Cut the problem in two", focus: "cut", body: "Inside our system or outside it; ingest or answering; search or the model. Each cut rules out half. The trace put 10.4 of 11.4 seconds on the vector store.", sources: [G("Root Cause Analysis")] },
            { id: "index", title: "An index is sized for a table", focus: "index", body: "An IVFFlat index should be built after the table has data, with about rows / 1000 lists up to a million rows and sqrt(rows) beyond. Built on 50,000 documents with 100 lists, it was searching lists of 110,000 vectors.", sources: [PGV("IVFFlat")] },
            { id: "queue", title: "Slow work fills a pool", focus: "queue", body: "Each slow search held a database connection. Ten connections, two questions a second, six seconds each: requests queued, and the slow tail grew fastest.", sources: [G("Optimizing DB queries")] },
            { id: "trade", title: "Every faster index trades something", focus: "trade", body: "HNSW searches faster for the same recall than IVFFlat, and builds slower with more memory. Every approximate index gives up some recall: measure it on real questions.", sources: [PGV("HNSW"), PGV("IVFFlat")] },
            { id: "repeat", title: "Cache meaning, not wording", focus: "repeat", body: "A semantic cache returns a stored answer when a new question's embedding is within a distance threshold of a stored one. It needs rules on what may be shared and when it goes stale.", sources: [RVL("SemanticCache"), RVL("check")] },
        ],
    },

    simulator: {
        duration: SPAN,
        job: "One question, from the seller pressing Enter to the last word of the answer.",
        controls: [
            { id: "index", label: "Vector index", options: [
                { value: "old", label: "Old IVFFlat", hint: "100 lists, built on 50,000 documents" },
                { value: "rebuilt", label: "Rebuilt IVFFlat", hint: "3,317 lists, 58 probes" },
                { value: "hnsw", label: "HNSW", hint: "m 16, ef_search 40: fix one" },
            ] },
            { id: "load", label: "When", options: [
                { value: "quiet", label: "A quiet evening" },
                { value: "peak", label: "Tuesday, 10 am", hint: "two questions a second, ten connections" },
            ] },
            { id: "cache", label: "Cache", options: [
                { value: "none", label: "None" },
                { value: "exact", label: "Exact match", hint: "keyed by the exact words" },
                { value: "semantic", label: "Semantic", hint: "keyed by meaning: fix two" },
            ] },
            { id: "store", label: "Store", options: [
                { value: "one", label: "One store, 11 M vectors" },
                { value: "sharded", label: "Three shards, routed", hint: "fix three" },
            ] },
            { id: "question", label: "The question", options: [
                { value: "new", label: "A new question" },
                { value: "repeat", label: "A common one, reworded", hint: "\"what do I need to ship to Dublin?\"" },
            ] },
        ],
        defaults: { index: "old", load: "peak", cache: "none", store: "one", question: "new" },
        simulate,
        ticks: [0, 1, 3, 7, 11, 14],
        line: TARGET,
        fidelity: "Timings are the story's own (an example), shaped by the sources: an index sized for a much smaller table, a pool that fills when queries are slow, a cache that skips the search on a hit. Not a benchmark of pgvector or Redis.",
    },

    predict: [
        {
            id: "quiet", setup: "The old index, a quiet evening, no cache. A new question.",
            prompt: "Where does most of the wait go?",
            scenario: { index: "old", load: "quiet", cache: "none", store: "one", question: "new" },
            options: [
                { id: "search", label: "The vector search: about 6 of 7 seconds" },
                { id: "model", label: "The model writing its answer" },
                { id: "queue", label: "Waiting for a database connection" },
            ],
            answer: "search", explanation: "At a quiet time nothing queues, so the search itself is the wait: an index built for 50,000 documents searching 11 million vectors.",
            sources: [PGV("IVFFlat")],
        },
        {
            id: "peak", setup: "The same index, Tuesday at 10 am.",
            prompt: "Why are first words four seconds later than in the evening?",
            scenario: { index: "old", load: "peak", cache: "none", store: "one", question: "new" },
            options: [
                { id: "queue", label: "The question waits for a free connection before searching" },
                { id: "model", label: "The model is busier at peak" },
                { id: "index", label: "The index gets slower during the day" },
            ],
            answer: "queue", explanation: "Each slow search holds a connection for 6 s; two a second need twelve; there are ten. The line in front adds about 4.4 s.",
            sources: [G("Optimizing DB queries")],
        },
        {
            id: "rebuilt", setup: "IVFFlat rebuilt for today's table: 3,317 lists, 58 probes. Peak.",
            prompt: "When do the first words arrive?",
            scenario: { index: "rebuilt", load: "peak", cache: "none", store: "one", question: "new" },
            options: [
                { id: "fast", label: "About 1.2 s: the search is short and nothing queues" },
                { id: "same", label: "About the same: peak is peak" },
                { id: "half", label: "About half: 5 to 6 s" },
            ],
            answer: "fast", explanation: "Lists sized to the table make each search short, so connections are held for milliseconds and the pool never fills.",
            sources: [PGV("IVFFlat"), PGV("IVFFlat > Query Options")],
        },
        {
            id: "exact", setup: "The rebuilt index and an exact-match cache. A seller asks a common question in new words.",
            prompt: "Does the cache help?",
            scenario: { index: "rebuilt", load: "peak", cache: "exact", store: "one", question: "repeat" },
            options: [
                { id: "miss", label: "No: the words differ, so the key misses" },
                { id: "hit", label: "Yes: it is a common question" },
                { id: "half", label: "Partly: it returns half an answer" },
            ],
            answer: "miss", explanation: "An exact key needs the exact sentence. Reworded, it misses, and the question pays the full path plus the lookup.",
            sources: [RVL("SemanticCache")],
        },
        {
            id: "semantic", setup: "The same reworded question, with a semantic cache.",
            prompt: "What happens?",
            scenario: { index: "rebuilt", load: "peak", cache: "semantic", store: "one", question: "repeat" },
            options: [
                { id: "hit", label: "A hit: the stored answer comes back in about 50 ms" },
                { id: "miss", label: "A miss: the words are different" },
                { id: "slow", label: "Slower: the cache embeds the question" },
            ],
            answer: "hit", explanation: "Its embedding falls within the distance threshold of a stored question, so the stored answer comes straight back: no search and no model.",
            sources: [RVL("SemanticCache"), RVL("check")],
        },
        {
            id: "semantic-new", setup: "HNSW and the semantic cache, a quiet evening. A question nobody has asked before.",
            prompt: "What does the cache cost this question?",
            scenario: { index: "hnsw", load: "quiet", cache: "semantic", store: "one", question: "new" },
            options: [
                { id: "lookup", label: "One quick lookup, then the normal path: about 1.1 s" },
                { id: "nothing", label: "Nothing: it answers from the cache" },
                { id: "seconds", label: "Several seconds of searching the cache" },
            ],
            answer: "lookup", explanation: "Nothing is close enough, so it misses, and the question takes the normal path. The miss costs one small lookup; its answer is stored for next time.",
            sources: [RVL("check"), RVL("store")],
        },
        {
            id: "shard-old", setup: "Someone shards the store into three before fixing the index. Old index on each shard, peak.",
            prompt: "Is it fixed?",
            scenario: { index: "old", load: "peak", cache: "none", store: "sharded", question: "new" },
            options: [
                { id: "no", label: "Better but still slow: about 4.5 s, because each shard still has the wrong index" },
                { id: "yes", label: "Yes: each search covers a third" },
                { id: "worse", label: "Worse: the router adds seconds" },
            ],
            answer: "no", explanation: "Each shard searches 3.7 M vectors with an index still sized for 50,000 documents. Fix the index first; shard for growth.",
            sources: [PGV("IVFFlat")],
        },
        {
            id: "all", setup: "All three fixes: HNSW, the semantic cache, three routed shards. Peak, a new question.",
            prompt: "When do the first words arrive?",
            scenario: { index: "hnsw", load: "peak", cache: "semantic", store: "sharded", question: "new" },
            options: [
                { id: "fast", label: "About 1.1 s: now the model and the re-ranker are most of it" },
                { id: "instant", label: "At once: everything is cached" },
                { id: "same", label: "About 11 s: peak is still peak" },
            ],
            answer: "fast", explanation: "A new question misses the cache and searches one small shard in milliseconds. What is left is the re-ranker and the model's first words, which is where the time should be.",
            sources: [PGV("HNSW"), RVL("check")],
        },
    ],

    fix: {
        intro: "Every slow AI product asks the same questions in the same order. Parcelly's answers led to the vector store, then to its index.",
        tree: {
            start: "inside",
            nodes: [
                { id: "inside", question: "Is the time spent inside our system, before the model is asked?", yes: "half", no: "model" },
                { id: "half", question: "Is a person waiting on ingest (an upload) or on answering?", yes: "ingest", no: "search" },
                { id: "search", question: "Is the search slow on its own, at quiet times too?", yes: "index", no: "pool" },
            ],
            leaves: [
                { id: "model", title: "Look at the model and the provider", body: "Stream the answer, check first-token time, and the provider's rate limits. Only here does a smaller model help." },
                { id: "ingest", title: "Take ingest off the request path", body: "Queue uploads, show progress, batch embeddings, and check the chunker's cost." },
                { id: "index", title: "Size the index for today's table", body: "Rebuild for the rows you have, measure recall on real questions, then cache what repeats and shard for growth." },
                { id: "pool", title: "Look for something requests wait in", body: "A pool, a lock or a rate limit. Find what holds it, and for how long." },
            ],
        },
        patterns: [
            {
                id: "index", title: "Rebuild the index for the table you have", when: "Search time grew with the library, at quiet times too.",
                body: "IVFFlat lists near sqrt(rows) past a million rows and probes near sqrt(lists), or HNSW with ef_search tuned per query. Build it after the data is in, on a replica, and switch.",
                doesNotFix: "Repeats, which still pay for a search, and growth, which brings the next rebuild.",
                code: [{ label: "The index, before and after", lang: "sql", code: INDEX_SQL }],
                sources: [PGV("IVFFlat"), PGV("IVFFlat > Query Options"), PGV("HNSW > Index Options"), PGV("HNSW > Query Options")],
            },
            {
                id: "cache", title: "A semantic cache for general questions", when: "Many questions are the same few, asked in different words.",
                body: "Store each answered question's embedding with its answer. Return the stored answer when a new question is within the distance threshold. Give entries a time to live, and clear them when their documents change.",
                doesNotFix: "New questions, and anything personal to one user unless it is filtered by user.",
                sources: [RVL("SemanticCache"), RVL("check"), RVL("store")],
            },
            {
                id: "shard", title: "Shard by a key the question carries", when: "The library keeps growing and questions belong to one part of it.",
                body: "Split the store by region or document type; route each question by the user's own data first and a classifier second; search every shard when unsure.",
                doesNotFix: "A badly sized index: each shard needs a good one too.",
                sources: [G("Optimizing DB queries")],
            },
        ],
        twist: {
            title: "The upload that took an afternoon",
            body: [
                "With answers fast, uploads were switched on, and a 40-page contract took 25 minutes to become searchable.",
                "The semantic chunker embeds every sentence with its neighbours and cuts where neighbouring vectors differ: about 1,200 embedding calls before any chunk existed, on top of slow text recognition.",
                "The fix: split on the document's structure, embed in batches, and run ingest on a queue with progress shown to the seller.",
            ],
            signature: "Answers are fast, but new documents take many minutes to become searchable, and the embedding bill rises with every upload.",
            code: [{ label: "Structural splitting and batched embeddings", lang: "ts", code: CHUNK_CODE }],
            sources: [LCS("SemanticChunker"), G("Follow-up question")],
        },
        afterShip: [
            { title: "Watch recall, not only speed", body: "Keep the 200 real questions and their exact-search answers, and rerun them after any index change. A faster index can quietly find worse chunks.", sources: [PGV("HNSW")] },
            { title: "An alert on search time", body: "Errors never fired, because a slow search is not an error. Alert on p95 search time and on the pool's queue.", sources: [G("Root Cause Analysis")] },
            { title: "Rebuild as the library grows", body: "IVFFlat's lists suit one size of table. Recheck them when a carrier import changes the row count by a lot.", sources: [PGV("IVFFlat")] },
            { title: "Stale cache entries", body: "A new rate sheet must clear every cached answer built on the old one, or the cache serves old prices quickly.", sources: [RVL("store")] },
        ],
    },

    postmortem: {
        summary: "For nine days, Ask Parcelly took up to 11.4 seconds to start answering, after a catalogue import took its library past a million documents. The vector index had been sized for 50,000 documents; each search compared a question with over a million vectors, and slow searches filled the database's connection pool at peak.",
        sections: [
            { title: "Root cause", items: [
                "An IVFFlat index created on 50,000 documents with 100 lists was never resized; after the import each list held about 110,000 vectors.",
                "Each search held a connection for about 6 s; ten connections could not serve two questions a second, so requests queued.",
            ] },
            { title: "Why nobody saw it coming", items: [
                "Alerts watched errors, and a slow search is not an error.",
                "The first complaints were put down to a busy week.",
                "The model was assumed to be the slow part, until a trace showed it was 6% of the wait.",
            ] },
            { title: "What we changed", items: [
                "Rebuilt the index as HNSW, after measuring recall on 200 real questions.",
                "Added a pool timeout and ran the chunk search and the order lookup in parallel.",
                "Added a semantic cache for general questions, with a time to live and clearing on document updates.",
                "Split the store into three regional shards with a router and an all-shards fallback.",
                "Alerted on p95 search time and the pool's queue.",
            ] },
        ],
        sources: [PGV("IVFFlat"), PGV("HNSW"), RVL("SemanticCache"), G("Root Cause Analysis")],
    },

    postmortemPoints: {
        impact: [
            { id: "i-slow", label: "First words took up to 11.4 s at peak, 7 s at quiet times" },
            { id: "i-tickets", label: "Sellers gave up on the bot and opened tickets: 41 in a week" },
        ],
        timeline: [
            { id: "t-import", label: "The catalogue import on Monday evening" },
            { id: "t-busy", label: "Early complaints put down to a busy week" },
            { id: "t-page", label: "On-call paged eight days later" },
            { id: "t-trace", label: "One trace found the vector store within an hour" },
        ],
        causes: [
            { id: "c-index", label: "An index sized for 50,000 documents, never resized" },
            { id: "c-pool", label: "Slow searches holding connections, so the pool filled at peak" },
            { id: "c-alerts", label: "No alert on search time" },
        ],
        well: [
            { id: "w-trace", label: "Tracing one request before changing anything" },
            { id: "w-recall", label: "Measuring recall before switching indexes" },
        ],
        actions: [
            { id: "a-index", label: "Rebuild the index for the table's size" },
            { id: "a-cache", label: "A semantic cache with sharing and expiry rules" },
            { id: "a-shard", label: "Shard by region with a fallback" },
            { id: "a-alert", label: "Alert on p95 search time and the pool's queue" },
        ],
    },

    system: {
        caption: "Ask Parcelly: every question went through one vector store.",
        groups: [
            { id: "parcelly", label: "Parcelly" },
            { id: "outside", label: "Outside" },
        ],
        nodes: [
            { id: "browser", label: "Seller", sub: "the chat window", kind: "client", col: 0, row: 1 },
            { id: "api", label: "Chat API", sub: "retrieval + prompt", kind: "compute", group: "parcelly", col: 1, row: 1 },
            { id: "vectordb", label: "Vector store", sub: "Postgres + pgvector", kind: "store", group: "parcelly", col: 2, row: 1 },
            { id: "reranker", label: "Re-ranker", sub: "a small model", kind: "ai", group: "parcelly", col: 2, row: 2 },
            { id: "ingest", label: "Docs ingest", sub: "parse, chunk, embed", kind: "queue", group: "parcelly", col: 3, row: 1 },
            { id: "provider", label: "Model provider", sub: "embeddings + LLM", kind: "external", group: "outside", col: 2, row: 0 },
        ],
        links: [
            { from: "browser", to: "api", label: "a question" },
            { from: "api", to: "provider", label: "embed + answer" },
            { from: "api", to: "vectordb", label: "nearest 20" },
            { from: "api", to: "reranker", label: "best 5" },
            { from: "ingest", to: "vectordb", label: "chunks + vectors", async: true },
        ],
        incident: {
            broken: ["vectordb"],
            blast: ["api", "browser"],
            note: "The vector store's index was sized for 50,000 documents and searched 11 million chunks; slow searches filled its connections and every question waited.",
        },
        after: {
            note: "A cache in front for questions that repeat, and the store split by region behind a router.",
            added: [
                { id: "cache", label: "Semantic cache", sub: "Redis", kind: "cache", group: "parcelly", col: 1, row: 0 },
                { id: "router", label: "Router", sub: "by the seller's region", kind: "compute", group: "parcelly", col: 2, row: 1 },
            ],
            addedLinks: [
                { from: "api", to: "cache", label: "seen it?" },
                { from: "api", to: "router", label: "search" },
                { from: "router", to: "vectordb", label: "one shard, or all" },
            ],
            removedLinks: [{ from: "api", to: "vectordb" }],
            changed: ["vectordb"],
            move: { vectordb: { col: 3, row: 1 }, ingest: { col: 4, row: 1 } },
            notes: {
                cache: "Stores general questions' embeddings and answers. A reworded repeat within the threshold gets the stored answer in about 50 ms.",
                router: "Sends each question to its region's shard from the seller's country; searches every shard when unsure.",
                vectordb: "Three regional shards of about 3.7 M vectors, each with an HNSW index built for its size.",
            },
        },
        chapters: {
            slow: ["browser"],
            model: ["api", "provider", "vectordb", "reranker"],
            halves: ["ingest", "vectordb"],
            size: ["vectordb"],
            index: ["vectordb"],
            cache: ["api"],
            shards: ["vectordb"],
            upload: ["ingest", "provider"],
        },
    },
    chapters: BOT_CHAPTERS,
    learn: BOT_LEARN,
    glossary: BOT_GLOSSARY,

    mock: {
        role: "an interviewer at a company whose AI chatbot is slow",
        opening: "Our AI chatbot is too slow and customers are complaining. Walk me through what you would do.",
        probe: [
            "what you would measure first, and where",
            "how you would tell whether the time is inside your system or in the model",
            "which half of a RAG system a waiting user depends on",
            "what the size of the vector store does to search, and what you would change",
            "what you would cache, and what could go wrong with it",
            "what if uploads were the slow part instead",
        ],
        minutes: 8,
    },

    checklist: [
        { id: "number", text: "I measure time to first words, p50 and p95, where the user sees it.", why: "\"Slow\" without a number can't tell you if a fix worked." },
        { id: "trace", text: "I can trace one request through embed, search, re-rank and the model.", why: "The part everyone blamed was 6% of the wait." },
        { id: "size", text: "I know how many vectors each search covers, and what index serves it.", why: "An index sized for 50,000 documents searched 11 million chunks." },
        { id: "rebuild", text: "I recheck the index settings when the table grows a lot.", why: "IVFFlat's lists suit one table size." },
        { id: "recall", text: "I measure recall on real questions before and after an index change.", why: "A faster index can find worse chunks." },
        { id: "pool", text: "I know what requests queue for: pools, locks, rate limits.", why: "A gap between p50 and p95 is often a line." },
        { id: "cache", text: "My cache has rules for sharing and for staleness.", why: "A wrong answer served fast is still wrong." },
        { id: "ingest", text: "Ingest runs off the request path, in batches, with progress.", why: "A semantic chunker embeds every sentence first." },
        { id: "alert", text: "I alert on latency, not only on errors.", why: "A slow search never raises one." },
    ],

    round: [
        {
            id: "model-blame", symptom: "A trace: embed 40 ms, search 6 s, re-rank 300 ms, model to first words 700 ms.",
            options: [{ id: "search", label: "The vector search" }, { id: "model", label: "The model" }, { id: "embed", label: "The embedding call" }],
            answer: "search", explanation: "Six of seven seconds are the search. The model is the last 0.7 s.",
            sources: [G("Root Cause Analysis")],
        },
        {
            id: "gap", symptom: "p50 is 1.2 s all day; p95 is 1.3 s at night and 9 s at noon.",
            options: [{ id: "queue", label: "Something requests queue for at busy times" }, { id: "index", label: "The index is too small" }, { id: "model", label: "The model is slower at noon" }],
            answer: "queue", explanation: "The middle stays fast and only the tail grows with traffic: requests are waiting in a line, a pool or a rate limit.",
            sources: [G("Optimizing DB queries")],
        },
        {
            id: "grew", symptom: "Search time jumped from 80 ms to 5 s the night a big import ran, and stays there at quiet times.",
            options: [{ id: "index", label: "The index no longer suits the table's size" }, { id: "pool", label: "The pool is too small" }, { id: "cache", label: "The cache was cleared" }],
            answer: "index", explanation: "Slow at quiet times too means the search itself is slow. An IVFFlat index built for a much smaller table searches far more than it should.",
            sources: [PGV("IVFFlat")],
        },
        {
            id: "wrong-fast", symptom: "After a cache ships, a seller asking about refunds gets an answer about tracking parcels, instantly.",
            options: [{ id: "threshold", label: "The cache's distance threshold is too loose" }, { id: "index", label: "The index returns wrong chunks" }, { id: "model", label: "The model is confused" }],
            answer: "threshold", explanation: "Instant means it came from the cache; wrong means a different question was close enough to match.",
            sources: [RVL("SemanticCache")],
        },
        {
            id: "old-price", symptom: "A carrier changed its rates on Monday; on Wednesday the bot still quotes the old ones for one common question, and the right ones for a reworded version.",
            options: [{ id: "stale", label: "A cached answer outlived the document it quoted" }, { id: "index", label: "The index wasn't rebuilt" }, { id: "model", label: "The model memorised old rates" }],
            answer: "stale", explanation: "The common wording hits a cache entry from before the change; the reworded one misses and searches the new sheet.",
            sources: [RVL("store")],
        },
        {
            id: "nothing-found", symptom: "UK sellers asking about shipping to the US get \"I couldn't find that\".",
            options: [{ id: "route", label: "The router sends them to the UK shard only" }, { id: "index", label: "The US shard's index is broken" }, { id: "cache", label: "The cache is empty" }],
            answer: "route", explanation: "Routing by the seller's country misses questions about another region. Search all shards when the router is unsure.",
            sources: [G("Optimizing DB queries")],
        },
        {
            id: "slow-upload", symptom: "Answers are fast, but a 40-page upload takes 25 minutes and the embedding bill doubled.",
            options: [{ id: "chunker", label: "A semantic chunker embedding every sentence" }, { id: "index", label: "The index rebuilding on every insert" }, { id: "model", label: "The model reading each document" }],
            answer: "chunker", explanation: "It embeds every sentence with its neighbours to find where to cut, before the chunks themselves are embedded.",
            sources: [LCS("SemanticChunker")],
        },
    ],

    closing: [
        "Measure first, then cut the problem in half until one part is left.",
        "An index is sized for a table. When the table grows, check the index.",
        "Cache what repeats, and decide what may be shared and when it goes stale.",
    ],
}
