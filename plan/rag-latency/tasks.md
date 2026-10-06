# Case 4: the slow RAG bot - tasks

Derived from `overview.md`. In order; RL-1 blocks the rest.

### - [x] RL-1 Approve the case outline
- **Status:** approved 2026-10-06 as written, with the title "The bot that searched the whole library".
- **Why:** the story is the case; it is cheaper to change an outline than eight chapters.
- **Files:** `case-outline.md`.
- **Done when:** Niraj approves it (with any changes written into it).

### - [x] RL-2 A credit on a case
- **Status:** done 2026-10-06. `CaseCredit` on the case meta (index.ts), seeded into `incident_case.meta` only when present (the other three cases' versions did not change), read by `listLiveCases`. `components/incidents/credit.tsx`: `CreditLine` on the index card and the featured card (text: the card is itself a link), `CreditCard` with both links on the start step and the closing step; a source with a `url` is a link in the sources list. Checked in Chrome: the featured card shows the line; the start step shows the card, and both links point at the post and linkedin.com/in/gkcs with target _blank and rel noopener noreferrer. The closing step uses the same `CreditCard` but sits behind the checks, so it was not opened in the browser.
- **Why:** DoD 3 and 4: the case is based on Gaurav Sen's walkthrough and must say so, with
  links, wherever a reader meets the case.
- **Files:** `apps/main/content/incidents/types.ts` (`credit?: { name; role?; profileUrl;
  postUrl; postTitle; what }` on the case), `content/incidents/index.ts` (the meta, so the
  index card has it without loading the case), `packages/db/src/scripts/incidents-seed.ts`
  (into `incident_case.meta`), `lib/incidents/catalog.ts`, a `CreditBadge` in
  `components/incidents/`, the index card, `player/start-screen.tsx`, the closing step.
- **Steps:** one component, two sizes (a line on the card, a block on the start and
  closing steps); both links open in a new tab; the case's sources list gains the post.
- **Edge cases:** a case with no credit shows nothing; a long role truncates on the card;
  links are `rel="noopener noreferrer"`.
- **Done when:** a case with `credit` shows it in all four places and a case without shows
  nothing, with no code naming Gaurav.

### - [x] RL-3 Pin the sources
- **Status:** done 2026-10-06. G: Gaurav Sen, LinkedIn post (linkedin.com/feed/update/urn:li:activity:7512856137524965377), profile linkedin.com/in/gkcs; chapters 00:00 to 05:49. PGV: github.com/pgvector/pgvector README, "HNSW" (better speed-recall than IVFFlat, slower builds, more memory), "HNSW > Index Options" (m 16, ef_construction 64), "HNSW > Query Options" (ef_search 40), "IVFFlat" (build after data; lists rows/1000 up to 1M rows, sqrt(rows) over 1M; probes start at sqrt(lists)), "IVFFlat > Query Options" (probes 1 by default; higher is better recall, slower). RVL: redis.io/docs/latest/develop/ai/redisvl/api/cache, "SemanticCache" (distance_threshold 0.1 default, ttl), "check", "store". LCS: langchain-experimental `text_splitter.py`, `SemanticChunker` (splits into sentences, embeds each with its neighbours via embed_documents, cosine distance between adjacent ones, breaks above the 95th percentile by default).
- **Why:** DoD 2: every library claim cites a section.
- **Steps:** read the pgvector README (IVFFlat lists and probes, HNSW parameters, building
  after load), RedisVL's semantic cache, LangChain's semantic chunker; record each claim the
  case makes with its section; get Gaurav's profile URL from the post.
- **Done when:** the case's `sources` map has each with title, author, date and section
  names, and every number in the outline that is not "(example)" has one.

### - [x] RL-4 Write the case
- **Status:** done 2026-10-06. `the-bot-that-searched-the-whole-library.ts` and `the-bot-chapters.ts`: 8 chapters, 8 checks, 3 talks (chapters 4 and 7, and the interview as the closing talk), a five-control simulator, 8 predictions, the fix tree, three patterns, the twist with code, the postmortem and its points, the map with its fix, 9 checklist items and 7 round items. `check-incident-diagrams` passes; `check-incident-sims` passes all 8 predictions and all 72 combinations (expectations added); tsc clean. Our own words throughout.
- **Files:** `content/incidents/the-bot-that-searched-the-whole-library.ts`,
  `the-bot-chapters.ts`, `index.ts` (meta: topic `ai`, alsoIn `databases`), `cases.ts`.
- **Steps:** the case in the shape of the export case: sources, credit, system map, story,
  chapters with blocks (say, timeline, dashboard, sequence, causes, compare, map-change),
  checks, glossary, learn, mock (the interview), predict, round, postmortem, checklist,
  closing.
- **Edge cases:** no transcript wording (DoD 5); every number either sourced or "(example)".
- **Done when:** `tsc` in apps/main is clean and both check scripts pass on the case.

### - [x] RL-5 Seed and check
- **Status:** done 2026-10-06. `pnpm script incidents-seed` previewed one new case (25 steps) and nothing else, then `--apply`; the re-plan showed nothing left. LIVE. Checked in Chrome (dark, desktop): the AI topic and the featured card, the start step and credit, chapter 2's trace, chapter 7's before and after map, chapter 8's upload sequence; chapter 7 in light. Map labels around the Chat API shortened after the first look. Not walked: every check and the final steps (they unlock in order).
- **Steps:** `pnpm script incidents-seed` preview, then `--apply`; walk the case in Chrome.
- **Done when:** overview DoD 1, 3, 6 and 7 hold; the case is LIVE.
