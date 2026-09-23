# Projects - overview

## What this module is

One person, working through one project, start to finish.

They pick a project (or an idea from the catalogue), get sprints, work the tasks
inside those sprints, get assessed by an AI quiz and a mock interview, and
finish. Everything they touch is theirs.

That last sentence is the whole scope. The module was originally built for a
college, where the idea was that students would share projects, work on them
together in real time, invite each other, and vote on things. None of that is
being built now, and the machinery for it is the main thing standing between a
reader and understanding how a project actually works.

## Definition of done

1. **A project has exactly one owner and no other participants.** No members, no
   roles, no invitations - not in the UI, not in the actions, not in the schema.

2. **Nothing is shared, gifted, or forked.** No visibility setting, no public
   /private toggle, no buying a project for somebody else.

3. **Nobody contributes to anybody else's project.** No visitor feature
   suggestions, no sprint suggestions from third parties.

4. **Users are not ranked against each other.** No per-project leaderboard, no
   global leaderboard.

5. **The full solo loop still works, untouched**: browse or generate a project ->
   sprints -> generate and delete tasks inside a sprint -> AI quiz -> mock
   interview -> submission -> progress.

6. **The schema says the same thing the code does.** Every table supporting a
   deleted capability is dropped by a migration, not left orphaned.

## Decisions

Decided by Niraj on 2026-08-20.

### What "multi-user" means here, precisely

The line is **"does this exist because a second person might touch my project?"**
If yes, it goes.

That covers team membership, invitations, visibility, third-party suggestions,
and cross-user ranking. It does **not** cover everything with a `userId` column -
a standup entry, a guided session, a quiz attempt and a submission all have one,
and all of them are one person's own record of their own work.

### The idea catalogue stays; the voting on it goes

`project_idea` is a **catalogue** - title, description, difficulty, technologies,
core requirements, suggested stacks. It is where a solo user finds something to
build, which is the first step of the loop in point 5. It stays.

What goes is the community machinery layered on top: upvotes, and the
submit -> moderate -> approve/reject workflow. Those exist so users can
contribute ideas to each other, which is exactly the thing being removed.

### The error log stays; the voting on it goes

Same shape. Recording the errors you hit on your own project is solo work.
Voting on other people's errors and moderating a queue is not.

### Safe to drop the tables outright

Every table in the projects module currently holds **zero rows** - verified
against the database on 2026-08-20 via `pg_stat_user_tables`. Nothing is being
destroyed, so the deletions are a normal migration rather than a data decision.

Done with `db:generate` + `db:migrate` rather than `db:push`, even though this is
not production: `push` would leave the database ahead of the migration chain, and
the chain is how a fresh environment gets built.

### Prices, grants and gates

The numbers, in one place, as CLAUDE.md requires. The code reads them from
`apps/main/lib/credits/pricing.ts` and `apps/main/lib/projects/gates.ts`, which
reference this section; no call site restates them.

| Thing | Number | Note |
|---|---|---|
| Generate a public project | 13 credits | Held at dispatch, refunded if the job fails |
| Generate a private project | 25 credits | Same |
| Add the assessment to a generation | +30 credits | Quiz plus mock knowledge base |
| Generate the quiz | 25 credits | Refunded if the project already has one |
| A mock interview session | 30 credits | Per session, refunded if the call never connects |
| Start a curated project | **0** | Decided 2026-09-23. The work is already written; credits are for the model, and no model runs |
| The quiz opens at | **50%** of tasks | Inclusive, `>= 50` |
| The mock interview opens at | **75%** of tasks | Inclusive, `>= 75` |

Both gates were restated in four places and two of them used `<=`, so at exactly
50 and 75 percent the board and the page disagreed about whether you were let
in. That is why they are a helper now and not a literal.

### Public is a snapshot; enrolling is a copy

Decided by Niraj on 2026-09-23 (PJ-18).

- **Publishing records a moment.** `projects_v2.published_at` is set when a
  project becomes public: at generation if it was generated public, or when the
  owner presses "Make public" later. Anyone who is not the owner sees only the
  sprints and tasks created at or before that moment. What the owner adds
  afterwards stays theirs.
- **The owner can publish later.** A private project gets a "Make public" action.
  It is one way: there is no unpublish, because people may already hold copies.
  The private-tier price is not refunded.
- **Enrolling makes the enrolee their own copy.** The published snapshot
  (sprints, tasks, task details, quiz, mock knowledge base) is copied into a new
  private project owned by the enrolee, with `forked_from_id` pointing back.
  From then on it is their project: they generate sprints, add tasks and tick
  them exactly as an owner does, and nobody else sees those changes.
- **A copy cannot be published.** Publishing someone else's project under your
  name is the one thing a copy should not do. (Default taken while building;
  Niraj can reverse it.)
- The enrolment price and the curated-project exemption are unchanged.

## Out of scope

- **`apps/uni`.** The university app has its own assignment and class model, and
  a teacher assigning work to students is not the same thing as a team working
  on one project. Untouched.
- **The `teacherMemberId` column on `projects_v2`.** It is the uni integration
  point, not team membership.
- **Project enrolment.** Spending your own credits to start a project is a
  single-user purchase and stays.
- **Task detail access.** Same - buying deeper detail on a task, for yourself.
- **Bookmarks.** One user saving a project for later.
- **Rewriting how sprints or tasks work.** They stay exactly as they are.

## Definition of done, extended 2026-08-29

7. **Every projects screen is about the user's own work, or honestly says there
   is none.** No screen inside the authenticated app sells the product to
   somebody already using it, and no number on any of them is invented.

Added after Niraj looked at `/projects` and `/projects/ideas`:

> *"the overview page should be about the user and what are the things that the
> user have done across this all module and not marketing"*

This answers open question 3 in `srs/core-modules/projects/00-state-of-play.md`
and settles `PRJ-U2` in `03-ui-layout.md`, which had been waiting on exactly this
decision: **it is a hub, not a landing page.** Discovery moves below the user's
own state rather than above it.

## The database is empty, and that shapes every UI decision here

Verified 2026-08-29: **all 24 projects tables hold 0 rows**, including
`project_category`, `project_technology`, `project_idea` and `project_v2`.

This is not incidental. It is why `/projects` shows "0+ Projects Built" beside an
invented "94% Success Rate", and why `/projects/ideas` renders an empty category
rail over a full-height void. Neither screen has an empty state, because both were
built against an imagined populated future.

So the rule for this module, until it has data: **a screen with nothing to show
must say so in words and offer the one action that fills it.** That is
`PRJ-U4`, and it is now the load-bearing requirement rather than a polish item.
