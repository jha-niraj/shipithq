# The public site, told as stories (launch: Incidents)

**Status: DECIDED (2026-10-06, Niraj). Tasks: `tasks.md` (ST-*).**
Method: the Story Playbook (gurukulhq `STORY_PLAYBOOK.md`): keep ShipItHQ's own look, adopt the
method. Every section that explains something is a scroll story (steps that really scroll beside one
sticky drawing that changes as each step reaches the middle of the screen), every claim is true in
the code today, anything not built is marked coming soon, and one example carries a whole story.

## What the module is

ShipItHQ's public side (apps/web, which also serves /hire and /uni; apps/hiring has no marketing
pages) rebuilt in story form, starting with the Incidents launch. A visitor who reads no text still
sees what the product does, because each step is a drawing of the product doing it: for Incidents,
the real diagrams the case player shows (the system map, the incident's clock, the dashboard, the
before and after), lit step by step as the visitor scrolls.

"Agentic", as Niraj framed it (2026-10-06): show the AI working, honestly. The incident lead narrates,
asks, pushes back and writes a review; drawn as a conversation and a visible log of what happened
(prompt, check, verdict). Nothing claims autonomous agents.

## Audit (2026-10-06), the gaps this fixes

| Page | Section | Today | What is wrong | The story version |
|---|---|---|---|---|
| (none) | Incidents | a dark band on `/`, a nav and footer link | the launch has no page; its art copies the app's | `/incidents`: one case told end to end with the real diagrams (ST-6) |
| `/` | HomeHero + HeroWindow | auto-advancing tabs every 4.8 s, a different example per view | 3 of 4 views hidden; no single example | a drawing of the product doing its job; the views become steps (ST-7) |
| `/` | StageTabs, ProductTour | sticky tab lists beside cards | tabs hide content; nothing is drawn per step | ScrollStory with a drawing per step (ST-7) |
| `/` | IncidentsBand | copy + a CSS timeline | duplicates CaseArt; no story | a short story leading to `/incidents` (ST-7) |
| `/` | EverythingElse, HowItWorks | icon tiles, recycled art | not drawings of the step | cards with their own drawing; HowItWorks as a story (ST-7) |
| `/features/*`, `/hire/*`, `/uni/*` | FeatureDetail "How it works" | numbered cards, art reused by position | no drawing per step, no example | ScrollStory per job, one example per module (ST-8) |
| `/hire` | CandidateView | a phone cycling 3 screens every 12 s | hidden by a timer | scroll story (ST-9) |
| `/pricing`, `/hire`, `/uni` | currency and billing toggles | click to see the other price | hidden content | both shown, plus a worked Sum (ST-9, ST-10) |
| many | claims | "5" vs "6" languages; "four/five/six things"; "AI agent in minutes"; "AES-256"; "engineering intelligence suite"; "portfolio builder"; "30 guides"; "Since 2024" | untrue, contradictory or another product's copy | corrected from the code (ST-1) |
| `/hire`, `/uni` | unbuilt features | "candidates who already passed"; uni screens hard-coded | stated as fact | coming-soon marker (ST-2) |
| hiring `/contactus`, `/help` | form, contacts, links | a form that only waits a second; a placeholder phone and address; dead `#` links; "Live Chat" | fake on a live page | a form that sends, or email only; real links (ST-1) |
| `/changelog`, `/compare/*`, `/blogs/*` | lists, tables, text | no stories | told as text | stories per the playbook, after launch (ST-10) |

What already exists to build on: `ProductTour`'s sticky column (the base for ScrollStory); GateFlow and
OldVsNew on `/hire` (real explanatory drawings, the only "before" on the site); and the incident
diagram kit in apps/main (`lit` and `upTo` props light one part at a time), which web cannot import
until it moves to packages/ui (ST-4).

## Definition of done

1. `shipithq.com/incidents` exists on web, indexed, and tells the Incidents product as scroll stories
   over ONE case ("The demo that died at 30 seconds"), each step drawn with the same diagram
   components the case player uses, from that case's own data.
2. No explaining section on `/` or `/incidents` hides content behind tabs, timers or toggles.
3. Every step of every story has its own drawing that passes the playbook's five-rule rubric
   (it shows the point, matches its step, uses the page's own figures, has one lit element and a
   takeaway, reads at 1440px and 390px).
4. Every claim on the public pages matches the code; the contradictions in the audit are gone; every
   unbuilt claim carries the coming-soon marker, and `tasks.md` lists each marker.
5. Hiring's contact page sends a real message (or offers email only), and has no placeholder phone,
   address or map box; `/help` has no dead links.
6. Inactive steps dim by colour, never opacity; every text colour passes contrast on its real
   background; reduced motion keeps the layout with transitions off.
7. At 390px: no sideways scroll; the drawing sits above the steps or inline.
8. Every public URL returns 200, every internal link and asset loads, and each page's share image
   loads; titles, descriptions and JSON-LD of existing pages are unchanged unless a task says so.
9. The incident diagrams render the same in the app after moving to packages/ui (both incident check
   scripts pass; the case player checked in Chrome).

## Out of scope (this round)

- /uni (Niraj, 2026-10-06: "uni for later"), beyond the coming-soon markers on its unbuilt claims.
- The blog's per-post stories, the changelog and compare rebuilds: ST-10 lists them for after launch.
- Illustrated people. Drawings are the product's own screens and diagrams (playbook option "product
  screens only").

## Decisions (Niraj, 2026-10-06, AskUserQuestion)

| Decision | Choice |
|---|---|
| Order | Incidents page and the landing first; then feature pages; then /hire; then changelog, compare, pricing, blog |
| Incidents URL | shipithq.com/incidents on web, linking into the app's /incidents to play |
| Drawings | Share the real incident diagrams via packages/ui, plus a small new kit for the rest |
| "Agentic" | Show the AI working, honestly: the lead narrating, a chat that pushes back, a log of prompt, check and verdict; no autonomous-agent claims |
| The example | "The demo that died at 30 seconds" carries the Incidents story |
| Unbuilt claims | Mark coming soon, with a tooltip of what is not built and what happens today |
| Truth fixes | All of them now, from the code (ST-1 comes first) |
| Rollout | In place, page by page, each checked in Chrome before the next |
