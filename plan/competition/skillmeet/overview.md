# SkillMeet - competitive research and our answer

Researched 2026-09-26 at Niraj's request. Sources: skillmeet.ai (homepage meta,
robots.txt, sitemap.xml, and its public JS bundle, read for routes and product copy),
explainx.ai's review, StartupHub.ai, two LinkedIn posts, the Google Play listing.

## What SkillMeet is

"Career OS for engineers in India", AISOLO Technologies Pvt Ltd, Bengaluru; a reported
$1M seed. Homepage meta: 34,679 active jobs, 51 thousand users. Web, Android, and a
recruiter portal at hire.skillmeet.ai. Same audience as ours: freshers and early career.

| Module | What it does (from the bundle) |
|---|---|
| Locus (AI agent) | Paste a job: it lays out that company's interview round by round (OA, DSA, LLD, system design) and pulls questions from a claimed 131K bank "ranked by frequency". Also doubts, resume tailoring ("Resume Fit"), referrals. |
| Code | IDE, live judge, DSA "ranked by real interviews", daily and weekly contests, a mock mode that hides the topic; anti-cheat (tab switch ends it, paste blocked, typing rhythm analysed). A free scratch runner for 5 languages. |
| Exposure | Real project rounds in live multi-container environments (e.g. 10 containers: 2 API replicas with planted bugs, Redis, Postgres, Prometheus, nginx, load tester; k3s clusters; a vulnerable MCP server). Deterministic rubric grading (no LLM), verified on the profile with a certificate. Behind Premium. |
| Jobs | Scraped from career pages, 24-hour refresh, skill and city ranking. Verified referrals: an employee proves they work at the company with a company-email code. |
| Squad | Topic communities with posts, voice notes, meets and ranks; a leaderboard of Coding + Exposure x5. |
| Dev Connect | Paid mentor-led cohorts with seats; claims "10,000+ mentored" and 70+ campus talks. |
| Money | Premium subscription (monthly or yearly; Razorpay, Play, App Store) gating Exposure; paid cohorts; credits earned by doing AI-training tasks (rating answers, labeling data). Price not visible (server-side). |

## Where we stand

**They are ahead on:** proof of work in realistic infrastructure (Exposure), a question
bank ranked by frequency, contests and anti-cheat, verified referrals, community, and
distribution (a launch post with about 1,500 reactions, campus talks, cohorts).

**We are ahead on:** the hiring loop (a company defines gated rounds, students take
exactly those rounds, the company sees who passed; their recruiter hub is job posting and
bulk resume download), voice mock interviews (their "mock" is a hidden-topic coding
mode), system design on a canvas, web frontend and backend tracks, the university
product, and Incidents.

## Decisions (Niraj, 2026-09-26)

1. **The gap we own is company-wise round practice.** Locus *lists* a company's rounds;
   nobody lets a student *rehearse that company's actual loop*, round by round, with the
   company's own gates. A DSA editor is not unique and is not the fight
   (Niraj: "dsa editor is not something new or unique").
2. **Adopt:** frequency-ranked questions, and verified referrals.
3. **Not now:** Exposure-style multi-container projects, contests and leaderboards,
   community squads.
4. Output of this research is this plan; features are picked from `tasks.md`.

## How this connects to existing plans

Company-wise round practice is mostly `plan/hiring-rounds` already: company pages
(verified, unverified, or unclaimed built from the public site), ShipItHQ's generic role
pipelines (HR-4) practised on unclaimed pages, fresh draws and cool-down retakes. This
plan does not duplicate those tasks. It adds the **entry point** (paste a job, practise
that company's loop), the **data** that makes a loop company-specific (interview reports
and frequency), and **referrals**.

## Done when

1. A student can paste a job posting and, within the same flow, start practising that
   company's rounds in order, with each round's pass mark and gate.
2. A company's practice loop and its questions are ordered by how often they are
   reported for that company and role, with the count shown ("reported 14 times").
3. A verified employee of a company can accept or decline referral requests for that
   company's jobs on ShipItHQ.
4. The student landing and /hire say the wedge plainly: practise the exact rounds.
