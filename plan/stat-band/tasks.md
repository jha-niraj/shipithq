# StatBand - tasks

See `overview.md`. Every migration task follows STAT-BAND.md section 5 exactly: keep each
value's formatting, old `sub` becomes `hint`, drop icon-chip colours, `tone` only where the
old card coloured the VALUE for a state (green = `emerald`, red = `rose`, amber/orange =
`neutral`), links get `href`, filters get `onClick` + `active`, and the paired skeleton or
`loading.tsx` renders `StatBandSkeleton` with the same `count`, `cols` and `size`.

**Done when** for every migration task: no local stat component remains in its files, each
listed candidate is either migrated or recorded below with a reason, and `tsc --noEmit` is
clean for that app.

## SB-1 Port the component
- [x] Status: done (2026-09-22). `stat-band.tsx` and `STAT-BAND.md` in `packages/ui/src/components/ui`; `Skeleton` gained `delay`, `ScrollArea` gained `orientation="horizontal"`. `packages/ui` typechecks.

## SB-2 apps/main - home, knowme, projects, practice, credits
- [x] Status: done (2026-09-22). 12 displays in 11 files, paired skeletons updated (home, knowme analytics, projects, my projects, tasks, practice, credits); `apps/main` tsc clean.

**Files:** `app/(main)/home/_components/{home-dashboard,greeting-header,skeletons}.tsx`; `knowme/analytics/_components/knowme-analytics.tsx`; `knowme/settings/_components/knowme-settings.tsx`; `projects/_components/{ProjectsHubClient,recent-submissions-grid}.tsx`; `projects/myprojects/_components/MyProjectsClient.tsx`; `projects/[slug]/tasks/_components/tasks-page-client.tsx`; `projects/[slug]/quiz/_components/quiz-client.tsx`; `projects/[slug]/_components/{daily-standup-tab,sprint-mock-interview}.tsx`; `projects/[slug]/aimock/_components/aimock-client.tsx`; `practice/_components/practice-dashboard.tsx`; `credits/_components/credits-client.tsx`; `components/projects/{project-analytics,errors-tab}.tsx`; their `loading.tsx` files.

## SB-3 apps/main - mock, pathfinder, jobs, AI hub, shared components
- [x] Status: done (2026-09-22). 11 files plus 3 found by the re-scan (company mock hub, creator earnings sheet, integrations); unused `StatTile` removed from overview-kit; skeletons updated (mock, pathfinder x3, applications, AI hub, profile); `apps/main` tsc clean.

**Files:** `app/(main)/mock/_components/{my-practice,purchase-mock-sheet}.tsx`; `mock/voice/_components/voice-main-content.tsx`; `pathfinder/_components/pathfinder-dashboard.tsx`; `pathfinder/explore/_components/goal-preview-content.tsx`; `pathfinder/[slug]/verify/_components/mock-verification.tsx`; `pathfinder/[slug]/_components/daily-practice-view.tsx`; `app/(jobs)/jobs/components/skill-gap-modal.tsx`; `jobs/applications/applications-content.tsx`; `jobs/[slug]/job-detail-content.tsx`; `companies/[slug]/company-detail-content.tsx`; `ai/_components/AIHubClient.tsx`; `components/{activity-calendar,profile/profile-view,main/quiz-results,common/overview-kit}.tsx`; their `loading.tsx` files; plus a re-scan of `apps/main` for anything SB-2 and SB-3 missed.

## SB-4 apps/admin and apps/hiring
- [x] Status: done (2026-09-22). admin 6 files + 4 found (dashboard QuickStat, universities, companies, verification dialog); hiring 12 files + 5 found (applications, invoices, transactions, billing usage with `progress`, profile panel); skeletons added or fixed where missing or wrong; tsc clean for both.

**Files:** admin `uni/_components/uni-overview-client.tsx`, `hiring/_components/hiring-overview-client.tsx`, `analytics/_components/analytics-client.tsx`, `credits/_components/credits-client.tsx`, both `verification-client.tsx`; hiring `home/home-content.tsx`, `assignments/assignments-content.tsx`, `candidates/candidates-content.tsx`, `candidates/universities/page.tsx`, `mock/mock-content.tsx`, `interview-config/interview-config-content.tsx`, `interview-config/components/interview-process-detail.tsx`, `team/team-content.tsx`, `team/roles/page.tsx`, `jobs/jobs-content.tsx`, `analytics/analytics-content.tsx`, `company/company-content.tsx`; their `loading.tsx` files; a re-scan of both apps.

## SB-5 apps/uni
- [x] Status: done (2026-09-22). Six role dashboards, placements, students, billing, analytics, faculty/roles, profile, plus faculty (found by re-scan); skeletons fixed; `apps/uni` tsc clean.

**Files:** `components/dashboard/*-dashboard.tsx` (six `StatCard`s); `app/(main)/{placements,students,billing,analytics,profile}/page.tsx`; `faculty/roles/page.tsx`; their `loading.tsx` files; a re-scan of the app.

## SB-6 Make it the rule
- [x] Status: done (2026-09-22). CLAUDE.md Conventions has the StatBand rule and points to STAT-BAND.md.

**Files:** `CLAUDE.md` (Conventions).

**Done when:** CLAUDE.md says headline numbers use `StatBand` from `@repo/ui/components/ui/stat-band`, points to STAT-BAND.md, and bans new local stat cards.

## Skipped, with reasons

**apps/main**
- recent-submissions-grid, the home header pills, the home chart/feed grid: a list of cards, quick links, layout.
- quiz-client, sprint-mock-interview, aimock pre-generate card: fixed descriptions of an offer ("20 questions"), not user data.
- knowme-settings tab list, the standup 7-day grid, errors-tab two-column blocks: controls and form fields.
- quiz-results top score, studio flashcard result, verification "Overall Score", profile strength ring: hero result displays.
- purchase-mock-sheet price, purchase success receipt, AI hub pricing: pickers and receipts.
- job-detail facts, company-detail header and benefits, voice page title: text facts, no stats.

**apps/admin**
- module/platform link cards on the overviews and dashboard, Quick Links, PendingAction rows: link and action tiles.
- engagement MetricRow and module usage: a list and a bar chart inside a panel.
- payments and transactions filter rows: filters, not figures.

**apps/hiring**
- pipeline legend (home) and pipeline chart (analytics): real-data chart and its legend.
- per-row stats on job, university and recruiter cards, candidate match score: list rows.
- billing plan banner and PricingCard price: hero on a constant dark surface, plan picker.
- help, landing, auth and onboarding grids, legal pages: marketing or forms.

**apps/uni**
- billing credit-balance hero and plan grid; profile credit box (text facts with an expiry).
- analytics engagement and credit panels: label/value rows in a panel.
- help categories, university form, team member cards, empty-state headings, landing and legal pages.

## Found along the way (not fixed, outside this task)
- Spinners that break the no-spinner rule: uni home, faculty, faculty/roles; hiring billing, invoices, transactions.
- Loading files that still differ from their pages outside the stat row: uni analytics, billing, students; hiring billing, company; main AI hub (no placeholder for the cover-letters chart).
- `components/projects/project-analytics.tsx` has hardcoded trend percentages and no importers; `components/activity-calendar.tsx` and `home/_components/greeting-header.tsx` have no importers.
- Proposed deletion: `mock/_components/mock-card-skeleton.tsx` `StatsSkeleton` (unused).
