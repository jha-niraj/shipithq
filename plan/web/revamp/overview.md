# Web revamp - overview

`apps/web` (shipithq.com) becomes the one public home for all three products:
students at `/`, companies at `/hire`, universities at `/uni`. It is rebuilt in one
visual system modelled on fanout.sh (references in the 2026-09-25 conversation):
a quiet light page, a classy navbar with an audience switcher, a hero with floating
product fragments, tall module cards, a testimonial wall, and a public Ideas board.

It sits on top of `plan/web/polish` and `plan/web/seo`, which are mostly done. Their
rules still hold, above all **content truth** (`polish/01-content-truth.md`): no
section names a feature, number or quote that the product and a real person cannot
back.

## Decisions (Niraj, 2026-09-25)

| Question | Decision |
|---|---|
| Theme | **Light only.** `ThemeProvider` forced to light, no theme toggle anywhere on web. `dark:` classes stay in the code, untouched. |
| Colour | **Monochrome tones.** Fanout's layouts and dithered stacked-card art, on ink, white, warm stone and cool neutral surfaces. No hue. |
| Type | **Sans + mono accents.** Bricolage (display) and Geist (body) as now; Geist Mono for eyebrows, meta lines and one accent word in the hero. No new font. |
| Navbar | **One shared navbar with an audience switcher** (Students, Companies, Universities). Links, CTA and sign-in target follow the audience. `/hire` loses its own navbar. |
| Hero art | **Real product fragments** drawn in HTML/SVG: an accepted DSA run, a sprint card, a mock score, an ATS match. No screenshots. |
| Testimonials | **Built now, filled by Niraj.** One data file per audience; a wall renders only with 6 or more real entries. Placeholder quotes are deleted, never shipped. |
| Ideas | **Read on web, act in app.** `shipithq.com/ideas` is a read-only board from the DB; posting and voting happen at `app.shipithq.com/ideas`, signed in, one vote per user. |
| Uni | **Moves to web `/uni`.** `apps/uni/` root redirects to `/signin`, like hiring. |
| Extras | **Announcement bar** and a **What's new** page with a navbar pill. |

## Decisions, second round (Niraj, 2026-09-25)

Taken after the hiring and uni research (tasks.md, "Research, groups C and D"):

- **/hire keeps the rounds promise** ("candidates who already passed your rounds") as its
  hero, although candidates cannot take rounds yet: Niraj, "we are building the rest of
  the things on the hiring on the another sessions". The pipeline builder is real; the
  runners are plan/hiring-rounds HR-12 to HR-18.
- **Hiring plan features stay as listed** in `@repo/pricing` (hiring-plans.ts), for the
  same reason. This is a deliberate exception to content truth for /hire, owned by the
  hiring work; recheck the list when HR-18 ships.
- **Universities stays "Soon".** No `/uni` page, no change to apps/uni (REV-30 to REV-32
  deferred). Its three conflicting price sets are recorded for whoever picks it up.
- **Deletions approved:** every landing and chrome file the new pages replaced.

## Definition of done

Each line is checkable by loading a page or grepping the repo.

1. **Light only.** No `ThemeToggle` import under `apps/web`; the site renders light
   with the OS in dark mode; `dark:` classes still present.
2. **One navbar, three audiences.** Every page on web uses `SiteNavbar`. Its switcher
   lists Students, Companies, Universities; on `/hire*` and `/uni*` it shows that
   audience's links, CTA and sign-in origin. Works by keyboard and on mobile.
3. **The student landing reads top to bottom as:** announcement bar, navbar, hero
   with floating fragments, Pick your module (5 cards: Projects, Practice, AI tools,
   Jobs, Mock), Everything else (numbered tiles), pricing strip, testimonial wall,
   FAQ, footer.
4. **Each module has a detail page** at `/features/<module>` with what it does, how it
   works and its real limits, linked from its card and the navbar.
5. **`/hire` uses the same system** (`/uni` deferred, see above) (hero, module cards, testimonial wall,
   pricing, FAQ) with their own copy, and every price on them comes from one source
   shared with the product that charges it.
6. **`/ideas` on web** lists public ideas with Top/New sort and All/Open/Planned/Shipped
   counts; Post and Vote go to the app. In the app, a user can post, and vote once per
   idea (a second vote is rejected by a unique index, not by the client).
7. **`/changelog`** lists monthly entries; the navbar pill links to the newest.
8. **Nothing invented.** No randomuser.me image, no made-up name, no unsourced number
   anywhere under `apps/web`. `grep -rn randomuser apps/web apps/uni` is empty.
9. **Fast and legible.** Lighthouse mobile performance >= 90 on `/`, `/hire`, `/uni`;
   every text-on-surface pair meets AA (4.5:1 body, 3:1 large).

## Status names on the Ideas board

The table keeps its enum; the board shows friendlier names.

| `feedback_status` | Board |
|---|---|
| `UNDER_REVIEW` | Open |
| `PLANNED` | Planned |
| `COMPLETED` | Shipped |

Categories gain `CONTENT` and `IMPROVEMENT` (Niraj: "ask for more things on platform as
well as the content"). `BUG` is never public.

## Surfaces (tones)

| Token | Use |
|---|---|
| `paper` (neutral-50) | page background |
| `white` | cards, navbar |
| `ink` (neutral-950) | the one dark card per row, primary buttons |
| `stone` (stone-100) | warm tile |
| `mist` (neutral-100) | cool tile |

Ink on each surface is fixed (no `dark:` needed on a forced-light site, but the classes
already in the code stay).

## Hiring plans (Niraj, 2026-09-26)

Decided with AskUserQuestion; the numbers live in `packages/pricing/src/hiring-plans.ts`
and nowhere else.

|  | Free | Pro | Enterprise |
|---|---|---|---|
| Price | 0 | Rs 3,999 / $49 a month; yearly Rs 39,990 / $490 (two months free) | Custom |
| Active jobs | 1 | 10 | Unlimited |
| Interview pipelines | 1 | 10 | Unlimited |
| Applicants a month | 50 | 500 | Unlimited |
| Team members | 2 | 10 | Unlimited |
| Custom roles | 1 | 5 | Unlimited |
| Credits | 100 once | 1,000 a month | Custom |

- **What company credits pay for:** AI work beyond the free daily allowances (extra
  pipeline drafts and aptitude generations). **Candidates pay for their own round
  attempts**, as `plan/hiring-rounds/overview.md` already records (confirmed 2026-09-26).
- **Enforcement** is the hiring work's: the limits are stored but not checked today.
  Task added to `plan/hiring-app/tasks.md`.

## University plans (Niraj, 2026-09-26)

The table apps/uni's billing already charged, now the single source in
`packages/pricing/src/uni-plans.ts` (`UNI_PLANS`), read by apps/uni's checkout and by
shipithq.com/uni/pricing. The two other price sets apps/uni showed are retired.

| Plan | Monthly | Yearly | Students | Faculty | Departments | Classes per faculty | Credits a month |
|---|---|---|---|---|---|---|---|
| Free | Rs 0 | - | 50 | 5 | 2 | 3 | 5,000 |
| Starter | Rs 4,999 / $59 | Rs 49,990 / $590 | 500 | 20 | 5 | 10 | 50,000 |
| Growth | Rs 14,999 / $179 | Rs 1,49,990 / $1,790 | 5,000 | 100 | 20 | 50 | 5,00,000 |
| Enterprise | custom | custom | unlimited | unlimited | unlimited | unlimited | unlimited |

Analytics from Starter; advanced reports, the placement module, company portal access,
custom branding and priority support from Growth; API access and white-label on
Enterprise.
