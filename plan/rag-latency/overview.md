# Case 4: the slow RAG bot (credited to Gaurav Sen)

**Status: DECIDED (2026-10-06, Niraj). Outline approved (RL-1); being written.**
Tasks: `tasks.md` (RL-*). The story outline: `case-outline.md`.

## What the module is

The fourth Incidents case and the first in "AI and LLMs". A support bot built on retrieval
(RAG) becomes slow; on-call finds out why the way a good engineer would, by cutting the
problem in halves until one half is left, and fixes it in order of cost. The method and the
scenario come from Gaurav Sen's LinkedIn video, in which he walks through the interview
question "our AI chatbot is too slow, what do you do?" (posted 2026-10-05). We tell our own
story with our own company, words and diagrams, use his reasoning as the spine, and credit
him on the case with links to his profile and the post.

The case uses the whole kit: the pinned system map, sequence diagrams, the incident's
timeline and dashboard, checks on the map, talks with the lead, the final call, the
spot-the-failure round and the postmortem. Its closing talk is the interview question
itself, so a reader leaves able to answer it out loud.

## Definition of done

1. The case is LIVE under "AI and LLMs" with about 25 minutes of reading, eight chapters and
   the usual final steps, and replaces nothing.
2. Every platform or library claim cites a source section (`sources` on the case); the
   company, people, times and numbers are the story's own and marked "(example)".
3. **The credit shows in four places:** the index card, the start page, the closing step,
   and the case's sources list. Each says "Based on Gaurav Sen's explanation". The start and
   closing steps carry working links to his LinkedIn profile and to the post, and the
   sources list links the post; the card shows it as text, because the whole card is a link
   and a link cannot hold another.
4. The credit is data, not hand-written markup: a `credit` field on the case file, seeded
   into `incident_case.meta`, read by the components. A later case can carry a credit with
   no code change.
5. No sentence of the video's transcript appears in the case; the case is our own words.
6. `pnpm script incidents-seed` (preview, then `--apply`) adds the case, and the diagram and
   simulator checks (`check-incident-diagrams`, `check-incident-sims`) pass on it.
7. In Chrome, the case reads start to final in light and dark at desktop width, and the
   credit links open the right pages.

## Out of scope

- A Pathfinder path, an official project and a predefined mock for this case (the Vercel
  case had all three; this one can get them in a later round if Niraj wants).
- Code samples in the code viewer. The case is about where time goes, not about one
  library's code.
- The sequel "The same question, four thousand ways" (exact-match caching), which stays
  "Being written"; chapter 6 sets it up.

## Decisions

| Decision | Choice | Who, when |
|---|---|---|
| Framing | An incident story; the closing talk is the interview question | Niraj, 2026-10-06 |
| Scope | Slow answers is the incident; slow uploads (the semantic chunker) is the last chapter's twist; about 25 minutes | Niraj, 2026-10-06 |
| Where the credit lives | `credit` on the case file, seeded into `incident_case.meta`; no migration | Niraj, 2026-10-06 |
| Release | LIVE with the credit as soon as it is built and checked | Niraj, 2026-10-06 |
| What we take from the video | The method, the scenario and the list of fixes; never its wording. Our own company, numbers and story | Claude, from the answers above |
