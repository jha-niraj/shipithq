# Hiring rounds - send proof, not a CV

## What the module is

A company defines how it hires as a pipeline of rounds for each role: aptitude,
DSA, system design, and voice conversations for behaviour or culture. Each round
has its own questions, its own pass mark, and a rule for whether falling short
stops the candidate or is only recorded. Students take those rounds inside
ShipItHQ, as practice first: each attempt draws fresh questions, and they can retake after
a cool-down. When a student has cleared every gate and is happy with the result,
they send that attempt to the company instead of a CV. The company sees, per role, a
list of people who have already passed its own bar, round by round, and invites
the ones it wants to talk to. The first live conversation is the company's own check
that the person matches the scores.

Companies that have not signed up still have a page, built from their public site,
clearly marked as unclaimed and not affiliated with ShipItHQ. Students can practise
ShipItHQ's generic role pipelines there, but nothing can be sent until the company
claims the page and is verified.

It spans three apps: students in `apps/main`, companies in `apps/hiring`, and
verification and scraping review in `apps/admin`. Long-running work (scraping,
AI scoring) runs in `apps/worker`.

## Definition of done

1. A company's page says exactly one of:
   - **Verified**
   - **Unverified** (it signed up itself and is waiting for admin
     verification)
   - **Unclaimed - not affiliated with ShipItHQ** (ShipItHQ built the page
     from scraping). It keeps this label until an admin approves the
     company's claim.

   Unverified and unclaimed companies are practice only: students can take
   their pipelines, and sending unlocks at verification.
2. An admin can create an unclaimed company from its website URL. Firecrawl
   crawls the site into a draft profile, which the admin reviews and publishes.
   Nothing scraped is published without review. Nothing is scraped from LinkedIn.
3. A signed-in student can request a company that isn't listed, by name or
   website. With only a name, Exa finds the official domain and the student
   confirms it's the right company.
   - A request for a domain already listed or already requested adds the
     student's vote instead of a new request.
   - Each student can make 3 new requests a day.
   - The site is scraped straight away into a draft in the admin queue, sorted
     by votes, and published only after review (same as line 2).
   - When the company goes live, everyone who asked or voted is notified and
     follows it automatically.
4. A company member can claim a page only from an email on the company's domain.
   The claim shows as pending until an admin approves it in the verification
   console, and approval is what makes the page Verified.
5. A verified company can build pipelines as templates. Each round has:
   - a type: APTITUDE, DSA, SYSTEM_DESIGN, VOICE_BEHAVIOURAL or VOICE_CULTURE
   - a pass mark from 0 to 100
   - a gate mode: HARD (below the mark, the next round stays locked) or
     ADVISORY (scored and shown, never blocks)
   - a time limit, a draw size, and a retake cool-down
   - its pool: the problems, questions, prompts or rubric the attempt draws from

   A round can be written by hand, or drafted by AI from a description the
   company types and then edited.
6. Every job links to one pipeline, taken from the company's templates and
   editable for that job without changing the template.
7. ShipItHQ ships its own generic role pipelines (at least Backend SDE-1,
   Frontend intern, Full-stack SDE-1). They are labelled "By ShipItHQ" wherever
   they appear, and are never presented as a named company's process. After
   claiming, a company can adopt them as its own templates, edit them, or remove
   them.
8. A student can start a pipeline for a role from the company page or Browse,
   and take its rounds in order. Each attempt draws its questions at random from
   the round's pool, runs under the round's time limit, and records a 0-100
   score with a per-question or per-criterion breakdown.
   - Rounds scored by AI (system design and voice) are labelled "AI-assessed".
     The student and the company see the rubric and the transcript or diagram
     the score came from.
9. A retake is refused until the cool-down has passed, and it draws a new set
   of questions. The student keeps every attempt's history and feedback.
10. A student can send only a completed run: every HARD gate passed, and the
   company verified. The send screen shows exactly what the company will see.
   Nothing leaves without the student's explicit consent for that send.
   - What is sent: the run's scores, breakdowns, AI rubrics and transcripts,
     the integrity signals, and the attempt number ("passed on attempt 3").
     It also carries the student's name, headline and education, and the links
     they choose (resume, GitHub, KnowMe, up to 3 projects). Their email is
     revealed only when the company invites them.
   - The company sees that attempt and the attempt count, not the other attempts.
   - A student can withdraw a send, which hides it from the company.
11. The company's applicants view for a role lists every send, with a score per
    round, the attempt count and integrity signals. It can be filtered and
    sorted by round score, and up to three candidates can be compared side by
    side. The company can invite or decline, and the student is told either way.
12. Each attempt records integrity signals and shows them to the company:
    - how many times something was pasted into an answer
    - how many times the student left the tab
    - how long each question took
    - on voice rounds, long silences

    There is no camera and no proctoring.
13. Credits: attempts are charged per the prices in Decisions, held when the
    attempt starts and settled or refunded when scoring ends. Sending is free.
14. Personal data leaves the student only through a send. Every send stores a
    consent record (what was shared, when, to whom). Voice rounds ask for
    recording consent before the first question. Data kept for a withdrawn or
    declined send follows the retention rule in Decisions.
15. The Spark swipe deck is gone (Spark itself stays, as a stepped job panel:
   plan/jobs JB-18). `/jobs` opens on Browse, and taking a role's
    rounds and sending the result replaces the old apply flow. Existing
    applications keep their history.
16. **My rounds.** The student's Applied tab becomes "My rounds", listing:
    - runs in progress (the next round, any cool-down)
    - sends (viewed or not)
    - invites, declines and outcomes

    Old applications are listed below it as history.
17. **Outcome.** After an invite, both sides can record what happened:
    - the company marks Interviewing, Offer, Hired or Not selected
    - the student can record their own outcome too, for when a company goes
      quiet

    Each side sees the other's.
18. **A closed job** stays open for practice: its pipeline can still be taken,
    but sending is blocked. Sends already waiting stay with the company to
    decide.
19. **The company hears about each send** by an in-app notice and an email to
    every member with "view candidates".
20. **Reporting and blocking.**
    - Students can report a company or a job.
    - Either side can report a message.
    - Companies can report a student.
    - A student can block a company from messaging them.
    - Reports reach the admin console, where an admin can hide a job, suspend
      a company, or review a student's attempts.
21. **Before a send, the company sees only anonymous numbers:** how many are
    practising each round, and pass rates. It never sees who.
22. **The public company page** shows:
    - the header: name, logo if verified, the label, domain, size, locations,
      and follow
    - open roles, each with its pipeline and a time estimate, and Start or
      Continue
    - about, stack, culture and benefits, with sources on unclaimed pages
    - stats: practising, pass rate per round, and how fast the company answers
      sends. These show only past a minimum count, so small numbers don't
      identify anyone.
23. **Layouts** (the project workspace is the model):
    - **Company candidate review:** the list on the left, the candidate's
      rounds as tabs in the middle, and the AI docked on the right. Arrow keys
      move between candidates.
    - **Student round runner:** focused and full page. The sidebar is hidden,
      a slim top bar shows the round, the timer and progress, and leaving asks
      for confirmation.
    - **Company pipeline builder:** an ordered, draggable list of rounds on
      the left, the selected round's settings and pool on the right, and the
      AI docked.

### Final pass (Niraj, 2026-09-25)

24. **Every job has a pipeline** to go live. A new job starts from the closest
    ShipItHQ template, which the company edits. There is no apply without
    rounds.
25. **A result can be reused** within one company. When two of its roles use
    an identical pipeline, one completed run can be sent to both without
    retaking. Different companies always need their own run.
26. **Answering a voice round:** each behavioural or culture round's settings
    say voice, typed, or either. The company sees which the student used.
27. **No ShipItHQ AI during an attempt.** The runner hides it, and the server
    also refuses every ShipItHQ AI request (the AI panel, practice mentors,
    Project AI) from a student with a live attempt. A refused request is
    recorded as an integrity signal.
28. **Feedback is drafted by AI and sent by people.** For each candidate being
    declined or invited, the company can have AI draft a personal note:
    - it draws on everything about that candidate (their round scores,
      breakdowns, rubric results, strengths and gaps) plus a short note from
      the team on why
    - the team reviews and edits it, then sends it; nothing is sent unedited
      without that click
    - it can be drafted for a whole selection at once, one draft per candidate
    - the student sees the feedback with the decision
29. **Before sending,** a student's profile needs a name, headline and
    education. The send screen links to whatever is missing.
30. **Deleting an account** withdraws every send, deletes the snapshots at
    once (not after 90 days), and shows "account deleted" in message threads.

## Decisions added 2026-09-25 (second pass)

- Send profile, My rounds, outcomes on both sides, closed jobs open for
  practice, a notice on each send, every form of reporting and blocking,
  anonymous numbers before a send, the company page sections, and the three
  layouts: DoD 16 to 23 (Niraj).

## Out of scope (v1)

- Webcam, screen or ID proctoring.
- Company-written coding problems with their own judge tests. DSA pools draw
  from ShipItHQ's judged catalogue only.
- Scheduling and running the live interview after an invite. The invite opens
  a conversation; calendars come later.
- Company pricing for receiving sends. The hiring app's existing plans stand
  until this is decided.
- Sending results to unclaimed companies, or contacting them on a student's
  behalf.
- Take-home assignments as a round type. The existing assignment flow stays as
  it is, outside the pipeline.

## Decisions

All by Niraj, 2026-09-25, unless noted.

- **Unclaimed companies are practice only.** Sending unlocks at verification.
  No data goes to a company that never agreed.
- **Retakes:** the company sees the attempt that was sent, plus the attempt
  count. There is a cool-down between attempts.
- **Job board:** rounds come first. Browse stays for finding roles, sending
  replaces applying, and the swipe deck is retired.
- **Scraper: Firecrawl**, as a worker job. Niraj adds `FIRECRAWL_API_KEY`.
  - Company sites are read with `scrapeSite` from `@repo/firecrawl` (map plus
    ranked scrape, no crawl).
  - Finding a company's domain from its name uses `exaSearch` and
    `toCompanyDomain` from `@repo/exa` (Niraj's packages, 2026-09-25).
  - Exa for discovery, Firecrawl for reading: as each package's header says.
- **Student company requests** (Niraj, 2026-09-25):
  - Students give a name or a website, resolved and confirmed as above.
  - The scrape runs automatically, and an admin publishes the result.
  - Duplicates become votes, and each student can make 3 new requests a day.
  - When the company goes live, requesters are notified and follow it
    automatically.
- **v1 round types:** aptitude (MCQ), DSA, system design, and voice (behavioural
  and culture).
- **Pass marks:** the company picks HARD or ADVISORY for each round.
- **Pipelines are per job**, taken from company templates.
- **Unclaimed pages** show ShipItHQ's generic role pipelines, labelled as
  ShipItHQ's.
- **Who pays:** students pay credits per AI-scored attempt, and sending is free.
  Company pricing comes later.
- **Integrity:** signals only, no proctoring. The company's first live
  conversation is the final check.
- **Verification:** a claim needs a work-email domain match and admin approval.
- **Legal posture** (from the 2026-09-25 discussion; get a lawyer to review
  before launch):
  - Scrape a company's own site, never LinkedIn.
  - Never present a pipeline as a company's own process unless that company
    made or adopted it.
  - Logos only on pages the company has verified. Unclaimed pages show the
    name only.
  - Ask for consent on every send, and keep a record of it.
  - A human (the company) decides every invite. AI scores inform the decision
    and never decide it alone.

### ShipItHQ's platform pipelines (Niraj, 2026-09-25, HR-4)

- **Pass mark 60** on every round, labelled as ShipItHQ's choice.
- **Gates:** aptitude and DSA are HARD, because code scores them. System
  design and voice are ADVISORY: they are AI-assessed, so they are scored and
  shown but never lock the next round.
- **Round sizes:**
  - aptitude: 20 questions in 25 minutes
  - DSA: 1 problem in 45 minutes. "2 DSA" means two rounds, easy then medium.
  - system design: 1 prompt in 45 minutes
  - voice: 20 minutes
- **Pools:** each pool holds at least 4x its draw, so a retake draws fresh
  questions.
  - Aptitude draws from the whole LIVE bank; the intern pipeline uses its
    EASY and MEDIUM questions only.
  - DSA draws from judge-ready problems of the round's difficulty.
  - Voice rounds have no pool: they carry a rubric and interviewer knowledge.
- **Design prompts** live in their own `design_prompt` table: a brief, a
  rubric and a difficulty. `companyId` null means ShipItHQ's own prompts
  (about 12, reviewed); set means a company's (HR-11).

### Student company requests, details (Niraj, 2026-09-25, HR-7)

- **Notifications:** when a request goes live or is rejected, everyone who
  asked or voted gets it in-app and by one short email. They auto-follow a
  company that goes live.
- **Lookups:** Exa turns a name into a website; Firecrawl only reads the site
  afterwards (HR-5). Each student gets 10 name lookups a day; pasting a website
  runs no search and is not counted. New requests stay capped at 3 a day.
  Admins have no cap.

### Public company stats (Niraj, 2026-09-25, HR-23)

- A company page shows its "practising" count only from 10 students, and its
  "sends" count only from 5. Below that, it shows '-' with "Too few to show",
  so a small number never points to a person.
- "Answers in" (the median time from a send to the company's decision) shows
  only from 5 decided sends. A round's pass rate is per role, against that
  round's own pass mark, and shows only from 10 students with a scored attempt
  on it (Niraj, 2026-09-26, HR-23).

### Prices, limits and content (Niraj, 2026-09-25)

- **Credits per attempt:** aptitude 5, DSA 5, system design 15, a voice round
  30. Sending is free. The constants go in `apps/main/lib/credits/pricing.ts`
  and reference this file. Aptitude and DSA carry a small price even though
  they cost nothing to score, to discourage burning through a pool.
- **Cool-down:** 24 hours per round by default, and a new set of questions
  each time. A company can change it per round.
- **Retention:** a withdrawn or declined send disappears from the company's
  view straight away, and its snapshot is deleted after 90 days.
- **Company aptitude questions** (Niraj, 2026-09-25): a company can pick from
  the bank or generate questions on its own topics with AI. Generated
  questions stay private to that company and need its approval one by one
  before they can be drawn.
- **Aptitude content:** a ShipItHQ-written bank of about 300 questions
  (quant, logical, verbal), drafted with AI. Each is checked by hand for
  exactly one right answer before it is seeded.

### Integrity flag (2026-09-26, HR-18)

- A candidate gets a flag in the results list when any one round has **3 or
  more pastes** or **5 or more tab leaves**. The detail always shows the exact
  counts; the flag only draws the eye. The constants are `FLAG_PASTES` and
  `FLAG_TAB_LEAVES` in `apps/hiring/lib/sends.ts`.

### Feedback drafts (Niraj, 2026-09-26, HR-19)

- A company may draft **100** AI feedback notes per rolling day (one
  gpt-4o-mini call per candidate, free). The constant is
  `HIRING_AI_LIMITS.feedbackDraftsPerDay` in `packages/pricing/src/hiring.ts`.

