# Job import - practise any job, round by round

## What the module is

A student pastes a job from anywhere (LinkedIn, a careers page, an ATS link, or the
text itself). ShipItHQ reads it, finds or creates the company, designs that job's
interview as a pipeline of our rounds, and puts the student straight into practising
it round by round, with each round's pass mark and gate. This is the wedge from
`plan/competition/skillmeet` (decision 1): SkillMeet's Locus *lists* a company's rounds;
here a student *rehearses* them.

Every import also grows the company dataset: an unknown company becomes an unclaimed
draft (admin-reviewed, `plan/hiring-rounds` HR-5, HR-6), and when the company claims
and verifies its page it can adopt, edit or replace the pipelines students imported.

A job already on ShipItHQ needs none of this: its pipeline is already live for
practice, so the paste goes straight to it.

## Decisions (Niraj, 2026-09-26)

| Question | Decision |
|---|---|
| LinkedIn and other links | **Try to scrape any link, LinkedIn included.** If the scrape fails, ask the student to paste the job text **and the company name**. Company details always come from the company's **official site** via Firecrawl, never from LinkedIn. This amends hiring-rounds' "nothing is scraped from LinkedIn" for **job posts only**; company profiles keep the rule. |
| Visibility and cost | **Public** import: **free**, **3 new imports a day** per student. **Private** import: **15 credits** (the price of an interview-prep goal), no daily cap. **Practising an existing public import: free, no cap.** Credits are held on dispatch and settled or refunded on the terminal status; a failed import costs nothing. A private import can be made public later, without a refund. Company data is always shared, whatever the job's visibility. |
| How rounds are made | **Several model calls, one alarm each:** (1) extract the job to a strict schema; (2) plan the rounds from the job and system instructions; (3..N) one alarm per round to generate that round. Rounds use our five types (APTITUDE, DSA, SYSTEM_DESIGN, VOICE_BEHAVIOURAL, VOICE_CULTURE). Questions come **from our banks** (judged DSA problems, the aptitude bank, design prompts); the model generates only where a bank is thin, saved as **DRAFT** and flagged. Every response is schema-validated and retried once. |
| Where it lives | A "Paste a job" entry on **/jobs**, on each **company page**, a card on **/home**, and in **Pathfinder**. |

### Decisions, round 2 (Niraj, 2026-09-26, before JI-1)

| Question | Decision |
|---|---|
| Reading a link | **Firecrawl, then Exa, then ask.** If Firecrawl is blocked, walled or empty, the worker tries Exa (IP-4's extractor uses it and often reads LinkedIn); only if both fail does the student get the paste-text-and-company form. |
| Taking the rounds | **Usual per-round prices** (aptitude 5, DSA 5, system design 15, voice 30 credits per scored attempt, as every practice run). The import's price pays only for building the pipeline. |
| AI-written items | **Drawn and practised**, marked "AI-written, not yet reviewed" in the round, and listed for an admin to approve, edit or remove. |
| Unknown company | **A ShipItHQ holding page per pending company** (`/companies/pending/<request>`): "Acme (under review by ShipItHQ)", every job students imported for it, each practisable. On publish, every job moves to the real company page and old links redirect. Each job also has its own practice page, linked from My rounds. |
| What a verified company sees (JI-9) | **Public and private imports** of its jobs; private ones anonymised (never who imported them). |
| Schema | **One enum.** `pipeline_owner_kind` gains `IMPORTED` (COMPANY, PLATFORM for the generic pipelines, IMPORTED) with `importedJobId`; no separate `source` column. |
| Daily cap | **Rolling 24 hours**, like every other daily AI limit. |
| An unknown company's website (JI-4) | **Look it up, then check it**: an Exa search for the official site, skipping job boards, LinkedIn and social sites, accepting a domain only if its page names the company. Found: request and scrape as usual. Not found: the job is still practisable on the ShipItHQ holding page under the company's name, flagged for an admin to add the site. |
| Where the flow lives (JI-7) | **Own pages** (Niraj, 2026-09-26): `/jobs/import` is the paste form; submitting goes to `/jobs/import/<id>`, which shows live progress and then becomes that job's practice page (rounds, pass marks, Start). Linkable; the entry points are plain links (a company page adds `?company=`). |
| Entry points (JI-8) | **/jobs:** a "Practise any job" tab, last in the strip, active on the import pages. **/home:** a "Practise a job" header button beside Practice and New project. **Company page:** "Paste a <company> job" (prefilled) above the jobs students imported for it. **Pathfinder:** an interview-prep goal made from a posting gets "Practise this job's rounds", importing the same posting in one click. (Niraj, 2026-09-26) |
| Adopt and replace (JI-9) | **Copy, then redirect** (Niraj, 2026-09-26): Adopt copies the imported pipeline into the company's own pipelines (editable in the builder, AI-written items still labelled) and points the import at the copy, so students practise the company's version from then on. Replace points the import at one of the company's existing pipelines. Private imports appear anonymised. Both need manage-pipelines and count toward the plan's pipeline limit. |

### Round limits (set while building JI-5, 2026-09-26; change here first)

The plan step's numbers are clamped in `apps/worker/src/jobs/job-import-core.ts`
(`ROUND_RULES`, `validatePlan`):

| | Time limit (min) | Draw | Gate |
|---|---|---|---|
| APTITUDE | 10-60 (default 25) | 10-30 questions | the model's (HARD or ADVISORY) |
| DSA | 20-90 (45) | 1-2 problems | the model's |
| SYSTEM_DESIGN | 30-75 (45) | 1 prompt | always ADVISORY |
| VOICE_BEHAVIOURAL, VOICE_CULTURE | 10-45 (20) | none | always ADVISORY |

- Pass mark **40-90** (default 60): every round shows a mark worth aiming at; the
  model gave 0 on advisory rounds, which says nothing.
- AI-assessed rounds are **always ADVISORY**, as on ShipItHQ's own pipelines: a
  scorer's noise must not lock the rest of the interview.
- **At most 6 rounds**; a SENIOR or LEAD plan loses any APTITUDE round.
- A round type we can't run is kept on `imported_job.plan.notPractisable`, not in the
  pipeline: an unrunnable round would lock every round after it.
- Pools aim for 4 x the draw (`POOL_TO_DRAW_RATIO`) so a retake draws fresh items;
  system design keeps only the prompts that fit (often 1 or 2) rather than pad with
  unrelated ones.

Cost basis (for the record): a credit is about Rs 0.48 (25 credits for Rs 12); a new
import is about 2 to 6 model calls on gpt-4o-mini plus one or two Firecrawl scrapes,
roughly Rs 1 to 3.

## The pipeline

```
server action (app)                     worker: job_import (stepped Durable Object)
-------------------                     ------------------------------------------
dedup by URL hash / company+title  ->   step fetch     scrape the link (Firecrawl);
hold credits if private                                 on failure -> NEEDS_TEXT
insert imported_job (QUEUED)            step extract   model call 1, strict schema:
startBackgroundJob("job_import")                        title, company{name, website},
                                                        level, location, skills,
                                                        requirements, responsibilities
                                        step company   match by domain/name; unknown ->
                                                        company request + dispatch the
                                                        existing company_scrape DO
                                                        (runs in parallel, never waited on)
                                        step plan      model call 2: rounds in order with
                                                        pass mark, gate, time, draw size,
                                                        one-line reason
                                        step round:i   one alarm per round (call 3..N),
                                                        grounded in our banks, saved
                                        step ready     interview_process linked to the
                                                        imported job; status READY
page polls imported_job / background_job; on READY the student starts a practice run
```

Lessons from Incidents case one, built in: every step writes its status so a stall is
visible; the job DO's stale-run recovery fails a stuck run (and the hold is released);
env is hydrated before the first import in the alarm; every model and scrape call has
a timeout shorter than the CPU ceiling; nothing streams inside the alarm.

## Done when

1. Pasting a careers-page link, a LinkedIn link and plain text each end in a pipeline
   the student can practise, round by round, with pass marks and gates.
2. A failed scrape asks for the text and company name, and continues from there.
3. An unknown company becomes an admin-review draft and the job links to it once
   published; a known one links immediately.
4. The same public job pasted twice creates one import.
5. Public imports are free up to 3 new a day; private imports hold and settle 15 credits;
   failures refund.
6. A verified company sees the imported jobs and pipelines under its page and can adopt,
   edit or replace them.
