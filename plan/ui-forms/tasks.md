# Main app forms and layout - tasks

Found by an audit on 2026-09-28 (read-only); line numbers are from that day. Start after
plan/hiring-ui HU-2 and HU-3 are done.

| ID | Task | Status |
|---|---|---|
| UF-1 | Number inputs to validated text | done 2026-09-28: `grep type="number"` in apps/main finds nothing; question counts are a select |
| UF-2 | Profile sheets: selects with "Other" | done 2026-09-28: edit profile, experience, education (degree and field split, saved as one line), skills; values remembered on save |
| UF-3 | Resume builder and cover letter: selects and tag inputs | done 2026-09-28: resume sections and tailor panel on selects and TagInput (comma text gone); cover letter company and title; values remembered on save |
| UF-4 | Pathfinder and mock: selects, and the goal sheet's broken step headings | done 2026-09-28: role and position as selects with Other; the goal sheet shows "What to focus on" and step 3 its own title |
| UF-5 | Onboarding: university as a select with "Other" | done 2026-09-28: the flow's text step takes `suggestions` (arrows, Enter picks, typing stays valid); colleges from the dataset; remembered on finish |
| UF-6 | Tag and combobox inputs: Enter adds custom values, keyboard throughout | done 2026-09-28: target companies and both tech pickers are the shared TagInput; `TechSelect` removed (custom tech no longer upper-cased) |
| UF-7 | Long forms into steps | done 2026-09-28: project sheet in three tabs (errors open their tab), interview prep in two steps; edit profile (four tabs) and the cover letter (three steps) already were |
| UF-8 | Sticky actions in sheets and forms | done 2026-09-28: goal and mock sheets pin Back / Next to the sheet bottom; cover letter step 2 (UF-3); shared button style on the mock |
| UF-9 | Narrow columns and non-sticky side columns | done 2026-09-28: sticky side columns on settings, project details, company page, company requests and cover letter; job import gets a How it works column; the centred reading columns (ideas, idea, spark, standup setup, sprint pages, goal preview, verification, notes, KnowMe wizard) stay, as the plan allows |

## UF-1 - Number inputs
`app/(main)/pathfinder/_components/create-goal-sheet.tsx:528` (custom days, 1-365),
`create-interview-prep-sheet.tsx:203` (question counts 0-20: make them a select or
stepper), `components/interview-reports/report-sheet.tsx:202` (round minutes 1-600),
`app/(main)/purchase/_components/PurchaseClient.tsx:462` (custom credit amount).
**Done when** `grep 'type="number"'` in apps/main finds nothing.

## UF-2 - Profile sheets (`components/profile/sheets/`)
`edit-profile-sheet.tsx:220` location, `:231` current title, `:234` company, `:238`
university; `experience-sheet.tsx:170` title, `:174` company; `education-sheet.tsx:144`
school, `:147` degree (split degree and field of study); `skills-sheet.tsx:145` skill
(TagInput with suggestions).

## UF-3 - Resume and cover letter
`app/(main)/ai/resume/_components/resume-editor.tsx:302` company, `:303` job title,
`:409` institution, `:410` degree, `:411` field of study, `:446` skill category, `:373`
technologies and `:451` skills (comma text -> TagInput), `:713`/`:717` tailor panel;
`cover-letter-client.tsx:320` company, `:331` job title.

## UF-4 - Pathfinder and mock
`create-interview-prep-sheet.tsx:133` role; `app/(main)/mock/_components/create-mock-sheet.tsx:435`
position title. Bug: `create-goal-sheet.tsx` step 2 renders `steps[2]?.title` (`:543`)
and step 3 `steps[3]?.title` (`:579`, doesn't exist): the headings are wrong.

## UF-5 - Onboarding
`app/(auth)/onboarding/_components/OnboardingClient.tsx:113-118` "Where do you study?"
as a select with "Other".

## UF-6 - Tag and combobox inputs
`TechSelect` (`app/(main)/ai/resume/_components/projects-tab-form.tsx:49-127`): the
custom "Add" is only inside `CommandEmpty`; target companies (`edit-profile-sheet.tsx:353-390`):
Enter doesn't add a custom name. Move both to the shared TagInput.

## UF-7 - Steps
`create-interview-prep-sheet.tsx` (role; posting; questions), `cover-letter-client.tsx:274-460`,
`components/profile/sheets/project-sheet.tsx:260-404` (6 groups), `edit-profile-sheet.tsx:206-307`
(identity; work and education; career preferences; visibility).

## UF-8 - Sticky actions
`create-goal-sheet.tsx:757` (inside the ScrollArea), `create-mock-sheet.tsx:685`,
`cover-letter-client.tsx:410`. Pattern to copy: `components/profile/sheets/profile-sheet.tsx:113`.

## UF-9 - Layout
Narrow columns: `create-mock-sheet.tsx:267`, `app/(jobs)/jobs/import/page.tsx:17`,
`ideas/_components/ideas-client.tsx:68`, `ideas/[id]/idea-detail-client.tsx:38`,
`jobs/spark/spark-content.tsx:192`, `projects/[slug]/_components/daily-standup-tab.tsx:426`,
`workspace/_components/sprint-pages.tsx:16`, pathfinder `goal-preview-content.tsx:69`,
`verify/project-verification.tsx:66`, `notes-reader.tsx:59`, `knowme/onboarding/.../onboarding-wizard.tsx:34`
(check each: a reading column can stay narrow if centred). Side columns to make sticky:
`settings/_components/settings-layout-client.tsx:27`, `cover-letter-client.tsx:462`,
`projects/[slug]/_components/project-details-client.tsx:371`,
`companies/[slug]/_components/company-page.tsx:188`, `companies/request/_components/request-company-content.tsx:178`.
