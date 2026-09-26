# SkillMeet response - tasks

Derived from `overview.md`. Depends on `plan/hiring-rounds` (HR-1 to HR-9 and the round
runners) and `plan/interview-prep` (the job-description extractor, IP-4). Build in order.

| ID | Task | Status |
|---|---|---|
| CMP-1 | Interview reports: students record the rounds and questions of a real interview | not started |
| CMP-2 | A company's loop from reports: round order and frequency-ranked questions | not started |
| CMP-3 | Paste a job, practise that company's rounds | not started (needs the HR runners) |
| CMP-4 | Verified referrals | not started |
| CMP-5 | Say the wedge on the website | not started |

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

## CMP-5 - Say the wedge on the website
**Why** Decision 1, in words.
**Files** `apps/web/components/home/hero.tsx`, `content/home.ts`, `apps/web/components/hire/*`.
**Steps** Landing: "Practise the exact rounds the company will give you." Hire: the
same loop from the company's side. Claims only for what CMP-3 ships.
**Done when** the copy matches what is live, every claim sourced.
