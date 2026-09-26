# SkillMeet response - tasks

Derived from `overview.md`. Depends on `plan/hiring-rounds` (HR-1 to HR-9 and the round
runners) and `plan/interview-prep` (the job-description extractor, IP-4). Build in order.

| ID | Task | Status |
|---|---|---|
| CMP-1 | Interview reports: students record the rounds and questions of a real interview | done 2026-09-26 (browser check is Niraj's) |
| CMP-2 | A company's loop from reports: round order and frequency-ranked questions | code done 2026-09-26; the prep-goal run waits on OpenAI credits |
| CMP-3 | Paste a job, practise that company's rounds | planned in full as `plan/job-import` (JI-1 to JI-10); build there |
| CMP-4 | Verified referrals | done 2026-09-26 (browser check is Niraj's) |
| CMP-5 | Say the wedge on the website | done 2026-09-26 (ships with the next web deploy; browser check is Niraj's) |

## CMP-1 - Interview reports
**Why** Frequency needs data we own. Scraping other sites' question banks is a licensing
and trust problem; students who just interviewed are the honest source.
**Files** `packages/db/src/schema/` (new `interview_report`, `interview_report_round`,
`interview_report_question`), a migration, `apps/main/actions/(main)/companies/reports.action.ts`,
a report sheet on the company page (`app/(jobs)/companies/[slug]`), an admin review
queue in `apps/admin`.
**Steps** A report: company, role, date, outcome, then rounds in order (type from the
HR round types, duration) and the questions asked in each (free text, optionally linked
to a DSA problem or aptitude item). Anonymous to the public, attributed to admins.
Published after light review. Credits or XP for an approved report.
**Edge cases** duplicate reports of one interview; a company not listed (goes through
HR-7's request flow); leaked confidential assessments (the reviewer can reject; the
student is told why); questions with personal data.
**Done when** a student files a report on a listed company, an admin approves it, and
it appears on the company page anonymised.

### CMP-1 in four parts (planned 2026-09-26, after decisions round 3)

**CMP-1a - Schema.** `packages/db/src/schema/interview-reports.ts`: `interview_report`
(user set null on account deletion, since aggregates outlive the account; company OR
pending company request, one required; the imported job it came from, optional; role
as typed plus a normalised `role_key` for grouping; the interview month; outcome
OFFER | REJECTED | NO_RESPONSE | WITHDREW | IN_PROCESS; status PENDING | APPROVED |
REJECTED; reject reason, reviewer, reviewed at, credits rewarded), `interview_report_round`
(position, a report round type ONLINE_ASSESSMENT | APTITUDE | DSA | LLD | SYSTEM_DESIGN |
TAKE_HOME | TECHNICAL | BEHAVIOURAL | HIRING_MANAGER | HR | OTHER, optional title and
minutes), `interview_report_question` (text, normalised `question_key`, optional
practice problem or aptitude question, both set null on delete). One report per student,
company, role and month (unique). A migration, reported before applying.
**Done when** the migration applies on dev and the unique rule rejects a second report of
the same interview.

**CMP-1b - Student actions.** `apps/main/actions/(main)/companies/reports.action.ts`:
`submitReport` (validates; 1 to 8 rounds, up to 10 questions each; refuses text with an
email address or phone number, telling the student what to remove; at most 10 filed in a
rolling 30 days), `getMyReports`, `searchReportCompanies` (companies and pending requests
by name, for My rounds), `searchReportLinks` (judge-ready DSA problems and LIVE aptitude
questions by title). A company not listed goes through HR-7's request flow first.
**Edge cases** the same interview twice (the unique rule, said plainly); a suspended
company (refused); a deleted problem link (set null, the text stands).
**Done when** each rule is exercised on dev through the real action.

**CMP-1c - The report sheet and its three doors.** `components/interview-reports/*`: the
sheet (company, role, month, outcome, rounds in order with their questions and optional
links), opened from the company page and the pending holding page ("Report your
interview"), an imported job's page ("I interviewed for this", prefilled), and My rounds
("Report a real interview", with the company search); My rounds lists the student's own
reports with their status and any reject reason. The company page shows "N interview
reports from students" (approved, all time); the loop itself is CMP-2.
**Done when** the three doors open the same sheet, prefilled where they can be.

**CMP-1d - Admin review.** `apps/admin`: a queue at /hiring/interview-reports (pending
first), each report with who filed it, its rounds and questions; the reviewer can edit or
remove a question (to strip personal data or a leaked confidential item), then approve or
reject with a reason. Approving pays 10 credits unless 5 were already paid to that student
in the rolling 30 days (a BONUS transaction, in one batch with the status change); the
student is told either way (`REPORT_REVIEWED`). Publishing a pending company moves its
reports to the company.
**Done when** a student files a report on a listed company, an admin approves it (paid,
and the sixth in 30 days unpaid), a rejection reaches the student with its reason, and the
company page's count includes it.

**CMP-1 done 2026-09-26.** 1a: migration 0063 (three enums, three tables; the request
link cascades so the "company or request" check can never block a delete), applied on
dev; a second report of one interview is refused (23505) and one with no company too
(23514). 1b: `reports.action.ts`, 17/17 through the real action (filed; cleaned text and
keys; a fake link dropped, a real one kept; duplicate; phone and email refused with what
to remove; future month; no rounds; no company; suspended company; a pending company
takes it on its request, a published one on the company; the 11th in 30 days refused;
my reports; company and link search). Round types and outcomes live in
`lib/interview-reports/types.ts` ("use server" files export only functions). 1c: the
sheet (`components/interview-reports/report-sheet.tsx`) from the company page header,
the pending holding page, an imported job's page ("I interviewed for this", prefilled
with the company or its request, the role and the import) and My rounds (header button
with company search, plus "Your interview reports" with status, credits and any reason);
the company page's rail gained "Interview reports" (approved only; skeletons updated).
1d: /hiring/interview-reports in admin (nav entry), 12/12 through the real actions
(queue with author and questions, remove and reword a question, approve pays 10 with a
BONUS line in one transaction, second approve refused, approved can't be edited, the
student told in Updates via a new `INTERVIEW_REPORT_REVIEWED` kind, five paid then the
sixth unpaid, reject needs a reason and the student reads it, publishing a pending
company moves its reports); company page count 2 of 4 (approved only). Test rows removed.
Set while building (a limit, recorded here): at most **10 reports filed per student in a
rolling 30 days**, a spam guard separate from the 5 paid.
**Browser check (Niraj):** file one from each door; review it in admin; see the count.

## CMP-2 - A company's loop, ranked by frequency
**Why** Decision 2: questions ranked by how often they are asked.
**Files** `packages/db/src/company-loop.ts` (a query), the company page, Pathfinder's
interview-prep generation (`actions/(main)/pathfinder/interview-prep.action.ts`).
**Steps** Per company and role: the most reported round sequence, and each round's
questions ordered by report count, with the count shown. Interview-prep goals for that
company put reported questions first, then generated ones, labelled by source.
**Edge cases** fewer than N reports (show "not enough reports yet", fall back to the
generic role pipeline, never invent frequency); similar questions worded differently
(normalise, then merge by an admin); stale reports (weight the last 12 months).
**Done when** with seeded reports on dev, the company page shows the loop and counts,
and a goal generated for that company lists reported questions first with counts.

### CMP-2 in five parts (planned 2026-09-26, after decisions round 4)

**CMP-2a - Schema.** `interview_report` gains `role_family` (SOFTWARE | FRONTEND |
BACKEND | FULL_STACK | MOBILE | DATA_ML | DEVOPS_SRE | QA | PRODUCT | DESIGN | OTHER) and
`level` (INTERN | ENTRY | MID | SENIOR), both required; `interview_report_question` gains
`same_as_id` (the question it was merged into, set null on delete). A migration, reported
before applying.
**Done when** it applies on dev.

**CMP-2b - Picks and merging.** The sheet and `submitReport` take the family and level;
the admin card lets the reviewer correct them and mark a question "same as" one of the
company's approved questions, with the three closest suggested (word overlap on the
normalised text, same round type first).
**Done when** a report files with its picks, the admin corrects one and merges a question.

**CMP-2c - The loop query.** `packages/db/src/company-loop.ts` (takes a db, so the
worker can call it): per company, the role groups (family + level) with at least 3
approved reports from the last 12 months; for each, the most reported round order ("in
5 of 7 reports") and, per round type, questions ranked by a weighted count (a report older
than 12 months counts half), shown as the raw count "reported N times". A question's
group is its linked problem or aptitude item, else the question it was merged into, else
its own normalised text. Groups below the threshold are listed as "not enough reports".
**Edge cases** never invent frequency (no group, no numbers); a report with no questions
still counts toward the round order.
**Done when** with seeded reports on dev: a group at 3 recent reports shows its loop and
counts, one at 2 does not, a merged pair counts as one, and an old report counts half in
the ranking but once in "reported N times".

**CMP-2d - The company page.** "What students report": a card per ready group (family,
level, the round order with its share, each round's top 5 questions with counts, and
"Practise a job like this" when a READY public import of that company matches the level),
then the groups still gathering reports. Skeleton updated.
**Done when** the seeded company shows its card and a gathering group.

**CMP-2e - Prep goals.** `createInterviewPrepGoal` matches the company (the posting's
company link by domain, else the scraped title's company by name) and the group (family
and level read from the role; same family at any level if the exact group has no loop,
labelled with the group used) and passes it to `interview_prep_generation`, which puts up
to 10 reported questions first (source `interview_report`, "Reported N times by students
(Backend, Mid)") before the generated ones. No match: unchanged. The goal page labels each
question by source.
**Done when** a goal created for the seeded company lists the reported questions first
with their counts, and one for an unknown company is unchanged.

**CMP-2 code done 2026-09-26.** 2a: migration 0064 (role family and level enums and
columns, `same_as_id`), applied on dev. 2b: the sheet and `submitReport` require the
family and level (an imported job prefills its level); admin corrects the group and
merges a question "same as" an approved one of the company (three closest suggested by
word overlap, the same round type first; always the root, so counts never chain; undo).
Tests: CMP-1b 18/18 again with the picks; admin 6/6. 2c: `@repo/db/company-loop`
(`companyLoops`, `roleGroupOf`, `pickLoop`), 8/8 on seeded reports: the threshold (3
recent vs 2), the usual order "in 2 of 3", "reported N times" counting an old report once,
a merge and a shared problem link each counting as one question, ranking weighted. 2d:
"What students report" on the company page (a card per ready group with its order,
top questions per round and "Practise a job like this" when a public import of the same
level exists; the gathering groups listed with "3 needed"). 2e: `createInterviewPrepGoal`
matches (`lib/interview-reports/match.ts`) and passes `reported` to
`interview_prep_generation`, which puts up to 10 reported questions first (source
`interview_report`, "Reported N times by students (Backend, Mid) in the coding round at
X"); the goal page shows a "Reported by students" badge. 7/7 for the page, the practice
link and the matching (domain, title, a Senior role falling back to the Mid loop, no
match for another family or an unknown company).
**Not yet verified:** a prep goal actually generated with reported questions first: the
generation needs the model, and the dev OpenAI key is out of credits. Run with JI-10.
**Found on the way (not fixed, not this task):** the goal page shows a "Generating..."
badge on every interview-prep question (AI-made, content loaded, no studio), which looks
permanent; worth a look in `plan/interview-prep`.

## CMP-3 - Paste a job, practise that company's rounds
**Why** Decision 1, the wedge: rehearse the exact loop, not a list.
**Files** `actions/(main)/pathfinder/interview-prep.action.ts` (entry), the IP-4
extractor, hiring runs (`hiring_run`, `hiring_attempt`, HR-2), the round runners.
**Steps** Paste a job URL or text: extract the company and role; find or request the
company (HR-7); open its pipeline to practise: the company's own if claimed, otherwise
the generic role pipeline shaped by CMP-2's reported loop. Each round keeps its pass
mark and gate; results feed readiness. Sending stays gated by HR verification.
**Edge cases** unknown company (request flow, practise the generic pipeline meanwhile);
a role with no matching pipeline (nearest generic one, said so); rounds we cannot run
(LLD, take-home) shown as "not practisable yet" instead of hidden.
**Done when** pasting a real posting on dev lands on that company's loop and a round can
be attempted and scored.

## CMP-4 - Verified referrals
**Why** Decision 2. It turns employees into a reason to be on ShipItHQ.
**Files** schema (`referral_offer`, `referral_request`; the existing `referral` table in
`schema/credits.ts` is the invite-credit referral and is left alone), a company-email
check reusing `packages/auth/src/work-email.ts` and HR-8's domain match, actions, a
"Refer" panel on job pages and a "Referrals" view for the employee.
**Steps** An employee verifies with a one-time code to their company email and opts in
to refer. On that company's jobs, a student can request a referral once per job, with a
short note and their ShipItHQ proof attached (rounds passed, projects). The employee
accepts or declines; accepted requests tell the student what happens next.
**Edge cases** personal or free email domains refused; employees who leave (re-verify
every 6 months); request spam (per-student daily cap, per-employee inbox limit);
no promise of an interview (said plainly, as SkillMeet also does).
**Done when** on dev, a verified test employee receives, accepts and declines requests
end to end, and a free-mail address cannot verify.

### CMP-4 in five parts (planned 2026-09-26, after decisions round 5)

Names: `referral_offer` (an employee's verified opt-in), `referral_offer_code`,
`referral_request`. The existing `referral` table and `lib/referrals.ts` are the
invite-credit programme and are left alone; new code says "referrer" and "referral
request" and lives in `lib/referrer/` and `actions/(main)/referrer/`.

**CMP-4a - Schema.** `referral_offer` (user, company, the verified work email, verified
at, expires at = verified + 6 months, ACTIVE | PAUSED, last assigned at; one per user),
`referral_offer_code` (user, company, email, sha-256 of the 6-digit code, expires in 10
minutes, attempts, at most 5), `referral_request` (student, company, the ShipItHQ job or
the imported job, the assigned offer, note, a snapshot of what was attached: rounds cleared,
verified projects, whether the resume was shared; OPEN | ACCEPTED | DECLINED | EXPIRED |
WITHDRAWN; decided at). One request per student per job (unique). A migration, reported
before applying.
**Done when** it applies on dev and a second request for the same job is refused.

**CMP-4b - Verifying an employee.** `startReferrerVerification(email)`: a work email only
(`checkWorkEmail`; free and disposable refused), its domain or a parent domain matching a
company's `website_domain`; a 6-digit code emailed (hashed at rest, 10 minutes, 5
attempts, a new code at most once a minute). `confirmReferrerCode(code)` makes the offer
ACTIVE for 6 months. `pauseReferrer`, `resumeReferrer`. An expired offer takes no requests
and asks to verify again.
**Done when** a work address verifies end to end, a free-mail address can't, a wrong code
five times locks it, and an expired offer stops receiving.

**CMP-4c - Asking.** `requestReferral({ jobSlug | importedJobId }, note, attach)`: the
student's caps (1 in a rolling 24 hours, 5 open), one per job, not to themselves;
assigned to the company's ACTIVE, unexpired referrer with the fewest open (at most 10),
ties to the longest since last assigned; everyone full: "try later". The attachment
snapshot: rounds cleared on that job's or import's pipeline (best score, pass mark), the
student's approved project submissions, and whether the primary resume is shared. The
referrer is told in the Inbox and by email. `withdrawReferral`. Open requests older than
14 days close as EXPIRED on any read that counts or lists them.
**Done when** each cap and rule is exercised, the fewest-open referrer gets it, and an
expired request frees both slots.

**CMP-4d - Answering.** The referrer's inbox (open first): note, rounds, projects, and the
resume as a 1-hour signed link generated when they open it. Accept: the referrer sees the
student's email; the student learns the referrer's first name, that they were referred,
and that a referral isn't a promise of an interview. Decline: the student is told kindly,
with no name. Both by Inbox.
**Done when** a referrer accepts and declines end to end and each side sees exactly what
the decision allows.

**CMP-4e - Pages and doors.** `/jobs/referrals` (in the jobs sidebar): "Referring" (verify,
the inbox, pause) and "Your requests" (status, withdraw). An "Ask for a referral" card on
a ShipItHQ job's page and on an imported job's page, shown only when the company has a
referrer with room. Every route with its skeleton.
**Done when** both doors open the same form and the page shows both sides.

**CMP-4 done 2026-09-26.** 4a: migration 0065 (`referral_offer`, `referral_offer_code`,
`referral_request`, two enums), applied on dev; a second request for one job refused
(23505), a request with no job refused (23514). 4b to 4d: `lib/referrer/core.ts` (the
numbers, lazy 14-day expiry, domain matching with subdomains, fewest-open assignment,
the attachment snapshot), `actions/(main)/referrer`, `lib/emails/referrer.ts` (the code
and the new-request note), new Inbox kinds `REFERRAL_REQUEST` and `REFERRAL_ANSWERED`.
Tested through the real actions with the email provider stubbed, 27/27 plus 3/3 caps:
free mail and an unknown domain refused; a subdomain address gets a code, stored as
sha-256; a second code inside a minute refused; five wrong codes lock it; the right code
gives six months; the card shows only with room; a short note refused; the fewest-open
referrer gets it and hears by Inbox and email; 1 a day; one per job; the card then shows
the status; a referrer never gets their own request; expired offers take nothing; 14 days
closes a request; the inbox hides the email until accepted; no shared resume, nothing to
open; a stranger can't answer; accept reveals the email and tells the student the first
name and "isn't a promise"; no double answer; a decline is kind and nameless; a decided
request can't be withdrawn; a sixth open request refused, withdrawing frees one; a
referrer at 10 open is full. 4e: `/jobs/referrals` ("Your requests", "Referring": verify,
pause, the inbox with accept, decline and the resume link) in the jobs sidebar, with its
skeleton; "Ask for a referral" (`components/referrals/ask-referral.tsx`) on a ShipItHQ
job's right column and on an imported job's page when its company is on ShipItHQ.
"Verified projects" are the student's approved project submissions (there is no other
verified flag); the resume is the primary uploaded file, as a 1-hour signed link.
**Browser check (Niraj):** verify with a work address (the code email), pause and resume,
ask from a job with another account, accept and decline.

## CMP-5 - Say the wedge on the website
**Why** Decision 1, in words.
**Files** `apps/web/components/home/hero.tsx`, `content/home.ts`, `apps/web/components/hire/*`.
**Steps** Landing: "Practise the exact rounds the company will give you." Hire: the
same loop from the company's side. Claims only for what CMP-3 ships.
**Done when** the copy matches what is live, every claim sourced.

**Done 2026-09-26** (decisions round 6). Landing: `components/home/paste-job-band.tsx`
right under the hero, on mint with dark ink: the line, the subline, "a public import is
free", "Paste a job" to the app's /jobs/import (`APP_LINKS.importJob`), and a CSS-only
window where a pasted link becomes four rounds with pass marks and a take-home shown as not
practisable (reduced motion: the end state). /hire: `AlreadyPractising` after "What your
candidate sees", on sand: the jobs students imported, adopt, edit or replace, reported
totals, and "Claim your company page". Copy in `content/home.ts` (`HOME_WEDGE`) and
`content/hire.ts` (`HIRE_WEDGE`) with the task each line comes from. The subline's "what
students reported" is JI-11 (code done). Goes live with the next web deploy, as Niraj
asked, alongside the worker release and the OpenAI top-up.

## Decisions, round 2 (Niraj, 2026-09-26)
- Frequency data comes from **student interview reports** (CMP-1).
- **Build order:** paste a job first (`plan/job-import`), then reports and ranking, then referrals.
- Referrals are **free both ways**; caps stop spam.

## Decisions, round 3 (Niraj, 2026-09-26, before CMP-1)
- **Reward:** 10 credits per approved report, at most 5 rewarded in a rolling 30 days;
  nothing for a rejected one.
- **Threshold (CMP-2):** a company and role's reported loop shows once **3 approved
  reports from the last 12 months** exist; below that, "Not enough reports yet" and the
  ShipItHQ pipeline. Counts read "reported 4 times"; older reports still count toward
  questions, weighted down.
- **Where to file:** the company page (pending holding pages too; the report moves with
  the request on publish), an imported job's page (prefilled), and My rounds (with a
  company search).
- **Visibility: aggregates only.** The public sees the loop and "reported N times";
  individual reports (dates, outcomes, notes) are never shown. Admins see who filed each.
  CMP-1's "appears on the company page anonymised" therefore means the report counts
  toward the company's report total; the loop itself is CMP-2.

## Decisions, round 4 (Niraj, 2026-09-26, before CMP-2)
- **Role groups:** the report sheet asks for a **role family** (Software engineer,
  Frontend, Backend, Full stack, Mobile, Data / ML, DevOps / SRE, QA, Product, Design,
  Other) and a **level** (Intern, Entry, Mid, Senior); reports group by company + family
  + level. The typed role stays as a label; the admin can correct the picks in review.
- **Company page:** a "What students report" section with a card per role group that has
  enough reports: the usual round order ("in 5 of 7 reports"), each round's top questions
  with "reported N times", and a way to practise when an imported job matches. Groups
  below the threshold say "Not enough reports yet".
- **Prep goals:** matched at creation (company from the posting's company link or title,
  plus the role group); reported questions first, labelled "Reported N times by
  students", then the generated ones labelled as generated. No match: unchanged.
- **Merging:** the admin marks a question "same as" one of the company's existing ones
  while reviewing (the closest are suggested); questions linked to the same DSA problem or
  aptitude item merge automatically.

## Decisions, round 5 (Niraj, 2026-09-26, before CMP-4)
- **Routing:** a request goes to the company's verified referrer with the fewest open
  requests (ties: longest since last assigned). Referrers stay anonymous to students until
  they accept; the student sees "sent to a verified employee".
- **Caps (the stricter set):** a student sends at most **1 request in a rolling 24 hours**
  and has at most **5 open**; one request per job. A referrer holds at most **10 open**;
  when every referrer at a company is full, the student is told to try later. Set while
  planning (a default, change here): an unanswered request closes as "no answer" after
  **14 days**, freeing both slots.
- **A request carries:** a short note (required, 500 characters), the student's rounds
  cleared for that company's or job's rounds, their resume, and their verified projects.
- **On accept:** contact both ways. The referrer gets the student's email and resume; the
  student learns the referrer's first name and that they were referred, with a plain note
  that a referral isn't a promise of an interview. A decline tells the student kindly,
  with no name.

## Decisions, round 6 (Niraj, 2026-09-26, before CMP-5)
- **Placement:** keep the hero; a full-width band right under it carries the wedge (a
  mock paste field turning into rounds with pass marks, and "Paste a job").
- **The line:** "Paste any job. Practise its interview, round by round." Subline: "From
  LinkedIn, a careers page or the text itself: we design that job's rounds from the
  posting and what students reported, with pass marks, and you take them in order."
- **Timing:** write it now and ship with the next web deploy; Niraj is topping up OpenAI
  and releasing the worker. The subline's "what students reported" needs the import to
  read reports: added as `plan/job-import` JI-11.

## Code review sweep (2026-09-26)

An independent read-only review of the job-import, interview-report and referral code
found ten defects; each was checked against the code and fixed, then tested:
1. Referrer code: failed tries were read-then-written, so parallel guesses each saw 0,
   and a new code reset the count. Now every try spends an attempt atomically first
   (`attempts < 5`, returning), and a new code keeps the count while the old one lives.
   Test: 10 guesses at once count 5, none succeed; a new code while locked is refused.
2. A referrer could open a student's resume after the request closed: now only while
   it is OPEN or ACCEPTED.
3. A company pipeline shared by several imports (Replace) could show another student's
   private import in the runner and My rounds: both lookups now see only public imports
   and the viewer's own, the viewer's first.
4. A double click on a private import could hold 15 credits twice: migration 0066 adds a
   unique index on (owner, link) for live private imports; the action returns the one
   already there. Test: two at once give one import and one hold.
5. A referrer who re-verified at another company, or whose six months lapsed, could still
   accept the old company's requests and get the student's email: re-verifying elsewhere
   expires the old open requests, and answering needs a live offer at the request's
   company.
6. A paste that reached the worker a moment before its job recorded "waiting" got a 409
   read as success, leaving the import stuck: the action retries for up to 4 seconds and
   puts the form back if the import never moved.
7. Publishing a company was three separate writes; a failure part way left a PUBLISHED
   draft nothing could repair: now one transaction.
8. Two admins approving a student's reports at once could pay a sixth: a per-student
   advisory lock inside the approval transaction.
9. "Practise a job like this" could link a design import to a backend loop: it now
   matches the role family as well as the level.
10. The referral attachment included failed rounds: now rounds cleared only, as planned.
Suites re-run after the fixes: referrals 31/31 and caps 3/3, JI-7 14/14, JI-8 5/5,
JI-9 11/11 and 5/5, CMP-1b 18/18, CMP-1d 12/12, CMP-2b 6/6, CMP-2e 7/7, the pure checks
27/27 and 11/11.
