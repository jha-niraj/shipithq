# Case 4: "The bot that searched the whole library" (outline for review)

Topic: AI and LLMs (also Databases). About 25 minutes, 8 chapters, then the final steps.
Written for the ear, each chapter opening on a hook. Status: approved 2026-10-06 (RL-1).

A composite. The company, people, times and numbers are the story's own and marked
(example). The method follows Gaurav Sen's walkthrough (credited, source G). Library
behaviour is cited: PGV (pgvector README: IVFFlat lists and probes, HNSW m, ef_construction
and ef_search, building an index after loading data), RVL (RedisVL semantic cache: distance
threshold, TTL), LCS (LangChain's semantic chunker: embeds sentences and splits where
neighbours differ). Exact section names are pinned when the case is written (RL-3).

**The company (example):** Parcelly, a shipping platform for small sellers. Its support bot,
"Ask Parcelly", answers from 1.1 million documents: carrier rate sheets, customs rules,
packaging policies, help articles. About 10 chunks each: 11 million vectors in Postgres with
pgvector. The model is a hosted LLM and streams its answer.

**The system map:** Browser, Chat API, Retriever (embeds the question, searches), Vector store
(Postgres + pgvector), Re-ranker, LLM (external), Docs ingest (parser, chunker, embedder),
which is switched off for customers at the start. The fixes add a Cache (Redis) and split
the Vector store into shards with a Router.

---

## What happened

### 1. Eleven seconds to say hello
- **Hook:** "A seller types 'hi, where is my parcel?' and watches three dots for eleven
  seconds. Then she opens a ticket instead."
- **Story:** Tuesday (example). Support tickets about the bot triple in a week. The bot is
  not wrong, it is slow: p95 response 11.4 s, p50 6 s (example).
- **Dashboard:** p50 and p95 response time over two weeks, tickets per day, documents
  indexed climbing past one million after a carrier import.
- **Check:** what does "it's slow" need first: a number and where it is measured (not a
  guess at the cause).

### 2. Is it the model?
- **Hook:** "Everyone blamed the LLM. It took one trace to clear it."
- **Beats:** first cut, inside our system or outside it. A trace of one request: embed the
  question 40 ms, vector search 9.6 s, re-rank 300 ms, model first token 0.7 s and streaming
  fine (example). The model is not the problem; streaming already hides its length.
- **Sequence (builds):** Browser -> Chat API -> Retriever -> Vector store -> Re-ranker ->
  LLM -> streamed back, with each span's time.
- **Check:** pick on the map which part ate the time.

### 3. Two halves of a RAG bot
- **Hook:** "A RAG bot does two jobs. Only one of them was running."
- **Beats:** ingest (parse, chunk, embed, store) and answer (embed, search, re-rank,
  generate). Customer uploads are off, so ingest is not in the request at all: the time is
  in answering. Name the method out loud: cut the problem in half, check which half, repeat
  (credit G).
- **Diagram:** the two pipelines side by side, ingest greyed out.
- **Check:** order the answer path's steps.

### 4. Ten million vectors per question
- **Hook:** "The index was built for fifty thousand documents. There were one million."
- **Beats:** the size: 1.1 M documents x ~10 chunks = 11 M vectors searched for every
  question. Approximate nearest-neighbour search exists so you don't compare against all of
  them. The IVFFlat index was created months ago on 50,000 rows with lists = 100 (example):
  now each list holds ~110,000 vectors and every probe scans whole lists (PGV). Under load
  the slow queries hold Postgres connections; a pool of 10 fills and new questions queue,
  so p95 grows faster than p50.
- **Causal chain:** catalogue import -> 11 M vectors -> index sized for 50 k -> each search
  scans hundreds of thousands -> connections held 9 s -> pool full -> queueing -> 11 s.
- **Compare:** exact search / IVFFlat / HNSW: what each trades.
- **Check:** single choice, why p95 is far worse than p50 (queueing for connections).

## How it was fixed

### 5. Fix one: an index sized for today
- **Hook:** "The cheapest fix was a number in a CREATE INDEX statement."
- **Beats:** rebuild for the data you have now (PGV): IVFFlat with lists near sqrt(rows)
  over a million rows and probes near sqrt(lists), or HNSW with m and ef_construction at
  build time and ef_search at query time. The trade is recall: measure it on a fixed set of
  real questions before and after. Search in parallel with the keyword lookup, and give the
  pool a ceiling and a timeout. Result (example): search 9.6 s -> 180 ms, recall 0.97.
- **Map change:** Vector store "re-indexed".
- **Check:** true or false, "a faster index is free" (false: recall, build time, memory).

### 6. Fix two: remember what repeats
- **Hook:** "Thirty percent of the questions were the same twenty questions, asked
  differently."
- **Beats:** an exact-match cache barely hits, because nobody types the same sentence twice
  (sets up the sequel case). A semantic cache in Redis stores question embeddings and
  answers and returns a stored answer when a new question is close enough (RVL: distance
  threshold, TTL). The danger is the wrong answer served fast: a threshold too loose, or a
  rate sheet that changed. Invalidate on document updates.
- **Diagram:** the answer path with the cache in front, hit and miss paths.
- **Check:** pick the right threshold behaviour from three examples.

### 7. Fix three: search only the shelf you need
- **Hook:** "A question about UK customs never needed to look at US rate sheets."
- **Beats:** split the store by region and document type, and route each question to the
  shard it needs from metadata (the seller's country, a quick classifier). Each search is
  smaller; shards scale out separately. The risk: a misrouted question finds nothing, so
  fall back to all shards when confidence is low.
- **Map change:** Router and three shards.
- **Check:** pick on the map where a misrouted question goes wrong.

## The twist

### 8. The upload that took an afternoon
- **Hook:** "Then they switched uploads back on."
- **Story:** a week later (example) sellers can upload their own contracts. A 40-page
  contract takes 25 minutes to become searchable, and the ingest queue backs up.
- **Beats:** the ingest half: parse, chunk, embed, store. Parsing unknown formats is slow
  and lossy; the semantic chunker is the culprit: it embeds every sentence and compares
  neighbours to find split points (LCS), so one document costs thousands of embedding calls
  before any real embedding happens. Fix: a simple recursive splitter with overlap, batched
  embedding calls, ingest off the request path on a queue with progress shown to the
  seller.
- **Sequence:** upload -> parse -> chunk (with the per-sentence embedding loop drawn) ->
  embed -> store.
- **Check:** single choice, what makes the semantic chunker slow.

---

## Final

- **Make the call:** eight situations across the case (is it the model, which half, size,
  index, cache threshold, shard routing, uploads).
- **Spot the failure:** three traces; find the span that is wrong in each.
- **Write the postmortem:** impact, timeline, causes, what went well, actions; then the
  team's own.
- **Talk with the lead, the interview:** "Our AI chatbot is slow and customers are
  complaining. Walk me through what you do." Probes: what do you measure first; inside or
  outside our system; which half of RAG; how big is the index; what would you cache and
  what could go wrong; what if uploads were the slow part.
- **Closing:** what to take away, and the credit card: "Based on Gaurav Sen's explanation"
  with links to his profile and the post.
