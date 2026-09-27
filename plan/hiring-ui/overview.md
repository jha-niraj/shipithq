# Hiring app UI - every page reworked

## What the module is when it is done

Every page of apps/hiring uses its width, keeps its actions in reach, and asks for as
little typing as possible: predictable values are dropdowns with an "Other" that feeds a
shared dataset, numbers are validated text, long forms are steps, and the company AI can
draft a job for review. The company has its own page (cover, logo, tabs), each member a
profile that shows the company, and onboarding reads the company's site so nobody fills
in what the web already says. Skeletons match every page.

## Decisions (Niraj, 2026-09-27 and 2026-09-28)

| Question | Decision |
|---|---|
| AI panel (both apps) | **Open by default**; closing it is remembered in localStorage, so a refresh doesn't reopen it; default width **460px** (drag still works). |
| Inputs | **Avoid typing.** Predictable fields are a **select with "Other"**; numbers are **text with validation**, never `type="number"`; tag inputs work from the keyboard (arrows, Enter, Escape). |
| "Other" values | Saved to a shared dataset. A company sees its own values at once; a value appears **for everyone once 3 different organisations** have used it. Admins can hide one. |
| Creating a job | **A stepper, pipeline first**: 1 Pipeline (yours, a ShipItHQ template, or draft with AI), 2 The job, 3 Location and pay, 4 Skills and details, 5 Review. A **sticky bar** (Back, Save draft, Next / Publish) on every step. |
| Words | "Job" is a job opening everywhere; permission roles are **"Access"**. |
| Routes | `/interview-config` -> **`/pipelines`** (the website's is shipithq.com/hire/pipelines, another origin), `/applications` -> **`/results`**, `/settings` -> **`/account`**, `/team/roles` -> **`/team/access`**. **No redirects**: not in production. |
| Layout | List and detail pages keep the list **sticky** and scroll the detail; editors keep Save / Delete in a **sticky bar**. No narrow left-aligned column with empty space beside it. |
| Width (Niraj, 2026-09-28) | Hiring pages are **full width**: `page-frame`'s 80rem cap is a variable the hiring app sets to none (apps/main keeps its cap, UI-10). Results' detail and Decide panes fill their pane. |
| Password (2026-09-28) | Changed on **Account only**; Profile has no Security tab. |
| Danger colour (2026-09-28) | **rose** everywhere for destructive actions and errors; no `red-*` in the hiring app. |
| Home | Never mostly empty: sections, charts and a setup checklist even before the first job; a **"New job" button at the top**. |
| Fakes | **Account**: made real (change password; only settings that work). **Company page**: real uploads for cover, logo and media (R2, public prefix). **Universities**: hidden from the nav until real. **Profile Company tab**: a read-only summary of the company (not a second edit form). |
| Company page | **In the hiring app** at `/c/<slug>`, designed like LinkedIn: cover image, logo, name, tagline and tabs below the header (About, Jobs, People, Life). |
| Profile header | The **company's cover and logo**; a neutral band with the company name when none is set. |
| Onboarding | **Website first, then confirm**: the owner gives the company site (optional, "we read it so you don't have to fill this in"), the scrape prefills the profile, they confirm or skip each part, then the company's preferences (optional). An invited member gives job title, LinkedIn, portfolio, photo, and whether to appear on People. All skippable. |
| Password fields | A placeholder in both apps. |
| AI drafts a job | The company AI asks what it needs (title, level, location, pay), drafts a **DRAFT** job from the company's data and links to it for review before publishing. |
| Main app | A task list for another session: `plan/ui-forms`. The shared pieces are built here, in `@repo/ui` and `@repo/db`. |
| Company brain | Its own module: `plan/company-brain`. |
