# Hiring app UI - tasks

Build in order; each task is verified by `tsc` and a checklist Niraj runs in the browser.

| ID | Task | Status |
|---|---|---|
| HU-1 | AI panel open by default, remembered when closed, 460px (both apps) | code done 2026-09-28; browser check is Niraj's |
| HU-2 | Shared inputs: select with "Other" + the dataset, validated number text, keyboard tag input | done 2026-09-28 |
| HU-3 | Shared layout: sticky action bar, sticky side column, password placeholders | done 2026-09-28 |
| HU-4 | Route renames and words (pipelines, results, account, team/access; "job" and "Access") | done 2026-09-28 |
| HU-5 | New and edit job: the pipeline-first stepper | built 2026-09-28, typechecks; browser check pending |
| HU-6 | Home: filled before the first job, "New job" at the top | built 2026-09-28, loadHome checked on Creatr; browser check pending |
| HU-7 | Pipelines list: buttons, template cards, imported jobs | built 2026-09-28, typechecks; browser check pending |
| HU-8 | Pipeline builder: sticky rounds and actions, text numbers, the round layout | built 2026-09-28, typechecks; browser check pending |
| HU-9 | Team and Access: sticky list and save bar | built 2026-09-28, typechecks; browser check pending |
| HU-10 | Profile: full width, company cover and logo, Company summary tab | built 2026-09-28 (0071 adds company cover_url and tagline), typechecks; browser check pending |
| HU-11 | Company page `/c/<slug>`: cover, logo, tabs, real uploads | built 2026-09-28, loader checked on Creatr; uploads need R2 keys in apps/hiring/.env; browser check pending |
| HU-12 | Account: change password for real, fakes removed | built 2026-09-28, typechecks; browser check pending |
| HU-13 | Results: the workspace's native controls replaced | built 2026-09-28, typechecks; browser check pending |
| HU-14 | Onboarding: website first, member details | built 2026-09-28 (0072 member columns; scrape on gpt-4o needs a worker release); company preferences wait for plan/company-brain; browser check pending |
| HU-15 | Every other page swept (jobs, candidates, analytics, billing, invoices, transactions, documents, universities hidden) | built 2026-09-28 (jobs, billing, invoices, transactions: words and buttons; Universities out since HU-4), typechecks |
| HU-16 | The company AI drafts a job | built 2026-09-28 (`get_company`, `propose_job`, the job card; Add saves a DRAFT); tool checked on Creatr, chat flow needs OpenAI credits |
| HU-17 | Skeletons and the final sweep | built 2026-09-28: every route has a matching loading.tsx, tsc clean (hiring, main, worker), nav check passes; browser checklist with Niraj |
| HU-19 | Full-width pages and Results panes | built 2026-09-28: `--page-frame-max: none` on the hiring body; Results panes full width; apps/main unchanged |
| HU-20 | Profile: no Security tab, shared buttons, sentence case | built 2026-09-28: three tabs; shared buttons; the badge and Permissions tab now read the access level (they showed the legacy per-member list) |
| HU-21 | Onboarding: selects with Other, sticky actions, the right page URL | built 2026-09-28: country and state selects (India first), job title with Other (mapped by `lib/member-titles`), claim title as a select, sticky Back / Continue, `hire.shipithq.com/c/<slug>` |
| HU-22 | Sidebar highlights the company page | built 2026-09-28: the nav points "Company" at `c/<slug>` for the member; nav check passes |
| HU-23 | Rose for danger, sentence case, the Help button | built 2026-09-28: no `red-*` left in apps/hiring; labels in sentence case; Help button shared |
| HU-18 | Deleting a job leaves its pipeline copy behind | done 2026-09-28: a job deleted on dev left no copy; `pnpm script orphan-job-pipelines` reports none |

## HU-1 - AI panel
**Files** `packages/ui/src/components/ai-chat/store.tsx`.
**Steps** `isOpen` defaults to true and a `closedByUser` flag is persisted (open/close
write it); a stored width equal to the old default (380) moves to 460; persist version 3.
**Edge cases** below lg the panel is a Sheet: it must not open by itself there; streaming
state stays unpersisted.
**Done when** a first visit opens the panel, closing it survives a refresh, reopening it
too, in both apps, and a phone-width visit doesn't pop a sheet.

## HU-2 - Shared inputs and the dataset
**Files** `packages/db/src/schema/option-values.ts` (+ migration), `packages/ui/src/components/ui/option-select.tsx`,
`number-text-input.tsx`, `tag-input.tsx`, `apps/hiring/actions/options.ts`.
**Steps** `option_value` (kind, value, normalised key, the organisations that used it, hidden);
`listOptions(kind)` returns the built-in list, the company's own values and shared ones
used by 3+ organisations; `recordOption(kind, value)` on save. `OptionSelect`: a
searchable select with "Other..." that turns into a text field. `NumberTextInput`:
`inputMode="numeric"`, digits and one separator only, min/max, formatted (1,50,000 for
money). `TagInput`: suggestions with ArrowUp/Down, Enter picks the active one (or adds the
typed text), Backspace removes the last chip, Escape closes.
**Edge cases** case and spacing ("node js", "Node.JS"): one normalised key; junk ("asdf",
URLs, over 60 characters) refused; a hidden value never shows.
**Done when** each component works from the keyboard alone and a value typed by 3 test
organisations appears for a fourth.

## HU-3 - Shared layout pieces
**Files** `packages/ui/src/components/ui/sticky-action-bar.tsx`, the shell's scroll
container, the sign-in and register forms in both apps.
**Steps** A bar that sticks to the bottom of the page's scroll area; a `StickyAside`
wrapper (top offset, own scroll). Password inputs get a placeholder.
**Done when** both appear in HU-5 and HU-8 and every password field has a placeholder.

## HU-4 - Routes and words
**Files** the four route folders, every link to them (`grep`), nav, headers.
**Steps** move the folders, update links, no redirects; "Access" for permission roles;
"job" for openings (Home, empty states).
**Done when** a `grep` for the old paths finds nothing and every label matches its route.

## HU-5 - The job stepper
**Files** `app/(main)/jobs/new/*`, `jobs/[slug]/edit`.
**Steps** five steps, pipeline first (yours / template / draft with AI inline); step 2
title (suggestions), department (OptionSelect, now saved), level; step 3 location
(OptionSelect), work type, employment type, pay (currency select + NumberTextInput with
min <= max); experience as a select of ranges; step 4 skills (TagInput from the dataset),
requirements, responsibilities, benefits (TagInput); step 5 review; a sticky bar on every
step; the step in the URL (`?step=`) so a refresh stays put; edit uses the same steps.
**Edge cases** leaving with unsaved changes; a step with errors blocks Next and says why;
publish needs a ready pipeline.
**Done when** a job can be created and edited without typing a number into a spinner.

## HU-6 - Home
**Steps** with no job: a setup checklist (company profile, pipeline, first job, invite
team, verification), the pipelines and templates, team, and zeroed charts with their
axes; with jobs: the current sections plus the funnel chart. "New job" at the top.
**Done when** a new company's Home has no large empty area.

## HU-7 - Pipelines list
**Steps** "Draft with AI" and "New pipeline" as a proper button pair; template cards
with round chips, time and a clear "Use this template"; imported jobs as a tab.

## HU-8 - Pipeline builder
**Steps** name and description compact at the top; the rounds list and Save / Delete /
unsaved state in a sticky left column; the round editor on the right; pass mark, time,
cool-down, draw and rubric weights as NumberTextInput or selects.

## HU-9 - Team and Access
**Steps** Access: the role list sticky, Save and Discard in a sticky bar with an icon;
Team: consistent buttons.

## HU-10 - Profile
**Steps** content uses the width (no left `max-w-4xl`); the header band shows the company
cover and logo; the Company tab becomes a read-only summary linking to the company page.

## HU-11 - Company page
**Files** `app/(main)/c/[slug]`, `app/(main)/company` (editing), R2 uploads.
**Steps** cover, logo, name, tagline, industry, size, location, website; tabs below the
header (About, Jobs, People, Life); edit in place for `edit_company`; uploads under the
public prefix; founded year and headquarters as selects / NumberTextInput.

## HU-12 - Account
**Steps** change password (current + new, via auth), only settings that work; remove the
fake timer save.

## HU-13 - Results
**Steps** sort and minimum score as the shared Select and NumberTextInput.

## HU-14 - Onboarding
**Steps** owner: website first (optional), `company_scrape` prefill with confirm/skip per
field, then preferences (optional); invited member: job title (OptionSelect), LinkedIn,
portfolio, photo, show on People.

## HU-15 - The rest
**Steps** jobs list, candidates, analytics, billing, invoices, transactions, documents:
width, buttons, words, native controls; Universities out of the nav.

## HU-16 - The AI drafts a job
**Files** `lib/hiring-ai/tools.ts`, proposals.
**Steps** a `propose_job` tool: asks for what's missing, drafts from company data (brain
when it exists), creates a DRAFT on confirm, links to its edit page.

## HU-17 - Skeletons and sweep
**Done when** every changed page's loading.tsx matches, tsc is clean, and the checklist
for Niraj covers every page.

## HU-18 - Deleting a job leaves its pipeline copy
**Why** found in HU-16's test (2026-09-28): `deleteJob` removes the `job` row only; its own
pipeline copy (`interview_process` with `job_id`, `is_template` false) has no FK back, so it
stays, orphaned, forever.
**Files** `actions/jobs/job-crud.ts` (`deleteJob`), `packages/db/src/scripts/orphan-job-pipelines.ts`.
**Steps** delete the copy with the job in one `withTransaction` (only when no `hiring_run`
uses it; otherwise keep it for the runs and clear nothing); a preview-first script lists
existing orphans per company and deletes them with `--apply`.
**Edge cases** a copy with candidates' runs; a copy shared by nothing; a template (never touched).
**Done when** deleting a job on dev leaves no `interview_process` whose `job_id` is gone, and
the script's second run reports nothing left.

## HU-19 - Full width
**Why** second sweep (2026-09-28): pages capped at 1280px left empty space on wide screens.
**Files** `packages/ui/src/styles/globals.css` (`page-frame` reads `--page-frame-max`, default 80rem),
`apps/hiring/app/layout.tsx` (sets it to none), `results/[jobSlug]/_components/*` (no `max-w-3xl`).
**Done when** a hiring page fills the space beside the AI panel on a wide screen and apps/main is unchanged.

## HU-20 - Profile
**Steps** remove the Security tab (Account owns the password); Edit/Save as shared Buttons
(no custom black), sentence-case labels; loading.tsx loses the fourth tab.
**Done when** Profile has three tabs and no custom-styled button.

## HU-21 - Onboarding details
**Steps** State and Country as selects with Other (country list, Indian states); "Your role"
gets Other with its own words; the claim form's job title as OptionSelect; Back / Continue in
a sticky bar; the hint shows `hire.shipithq.com/c/<slug>`; shared buttons, sentence case.
**Done when** the details step has no free-text field for a predictable value.

## HU-22 - Sidebar on the company page
**Steps** the nav's "Company profile" points at `c/<slug>` for the signed-in company, so it
highlights on `/c/<slug>`; the nav checker still passes.

## HU-23 - Rose, words, Help
**Steps** every `red-*` in apps/hiring becomes the matching `rose-*`; "All Status", "Team
Size", "Jobs Posted", "Cancel Subscription" and the like in sentence case; the Help page's
button uses the shared style.
**Done when** `grep red-` in apps/hiring finds nothing.

## Progress notes
- **HU-1 (2026-09-28):** `closedByUser` persisted (store v3); opens on rehydrate only at
  lg+ width, so a phone never pops the sheet; widths at an old default (380, 460) move to
  460. Both apps typecheck.
- **HU-2 (2026-09-28):** migration 0069 (`option_value`, `option_value_use`), applied on
  dev. `@repo/db/option-builtins` (lists, `optionKey`, `checkOptionValue`) and
  `@repo/db/options` (`listOptions`, `recordOptions`, shared after 3 organisations).
  `@repo/ui` `OptionSelect`, `NumberTextInput`, `TagInput`. `apps/hiring/actions/options.ts`.
  Rules tested on dev, 6/6: own at once, not others; case and spacing merge; shared at
  3; built-ins and junk not stored; hidden never shows.
- **HU-3 (2026-09-28):** `StickyActionBar`, `StickyAside` (`@repo/ui/components/ui/sticky-action-bar`),
  a `bleed-page` utility; `PasswordInput` has a default placeholder (both apps) and the
  hiring profile's password fields use words, not dots.
- **HU-4 (2026-09-28):** folders moved (`pipelines`, `results`, `account`, `team/access`,
  and `actions/pipelines`), every link and revalidate path updated (29 files, plus the
  student send notifications' links in main), nav paths fixed, Universities out of the
  nav, "Pipelines" and "Access" (access levels) in the copy, "job" for openings. No
  redirects, as decided.
- **HU-5 to HU-17 (2026-09-28):** migrations 0070 (`job.department`), 0071
  (`company.cover_url`, `tagline`), 0072 (`company_member.linkedin_url`, `portfolio_url`,
  `show_on_people` default true), all applied on dev. The job stepper is five steps with
  the step in `?step=`; Home adds the StatBand, the setup checklist, the weekly chart,
  pipelines and team (`loadHome`, checked on Creatr: a correlated subquery in drizzle's
  select left its columns unqualified and counted 0 rounds, replaced with a grouped count).
  `/c/<slug>` is the company page and `/company` redirects to it; uploads go to R2 under
  `avatars/companies/...` and need the R2 keys in `apps/hiring/.env`. Onboarding reads the
  site first (`companyProfileDraft` moved to gpt-4o, Niraj 2026-09-28; takes effect on the
  next worker release); invited members land on `/welcome`. The AI drafts jobs with
  `propose_job`. Not in scope and left for plan/company-brain: the company's AI
  preferences at onboarding.

