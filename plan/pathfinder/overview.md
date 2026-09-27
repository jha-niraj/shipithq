# Pathfinder - overview

Pathfinder is where a student works through a learning goal: "Master Kafka",
"PostgreSQL indexing", or the rounds of a job they pasted. A goal is a plan of
topics grouped by day. Each topic has notes to read and, where it fits, coding
problems to solve. When the plan is finished, the student proves it in Verify:
a quiz, a coding round, a mock interview and a real project. Goals can be shared,
and anyone can copy a shared goal for free.

`srs/core-modules/pathfinder/` holds the older state-of-play, blocker and worker
migration docs. They are still true where they don't conflict with this one.

## Definition of done

1. **The goal page is a workspace.** It uses the same shell as the Projects and
   Incidents workspaces: a `PageHeader`, then tabs across the top: **Today**,
   **Plan**, **Notes** and **Verify**. The active tab is in the URL (`?tab=`).
   - Beside the content sits a topic list you can resize (`react-resizable-panels`).
   - Below `lg`, the list and the content become tabs of their own. Nothing is
     wider than the screen.
   - `loading.tsx` matches the layout.
2. **The dashboard (`/pathfinder`) is tab-based, like Projects.** It uses
   `PageHeader` plus `TabsNav`, with **My goals**, **Overview** and **Explore**.
   The Overview is a `StatBand` plus one trend, not five charts.
3. **Every goal can be managed from its card.** You can pause it, resume it,
   share it, delete it (after a confirmation) and move it to a group. (There is no
   archive status; Paused covers it.) Groups can
   be renamed and deleted. Deleting a group ungroups its goals and never deletes
   them.
4. **Goals are private by default. Sharing is a free switch.** Nothing costs
   credits to keep private, and nothing has a price. The earnings sheet and
   per-goal credit prices are gone from the UI.
5. **Copying a shared goal is free and complete.** The copy keeps every topic's
   kind, its AI flags, its coding problems and its notes. Its days start today.
   Copying the same goal twice works: the second click opens the copy you
   already have.
6. **Explore works.**
   - Public goals are addressed by id, so two users' goals with the same slug
     can't collide.
   - The listing loads counts, not every session and topic.
   - The landing page is a real grid of goals with an empty state, not a
     placeholder.
7. **No topic says "Generating" forever.** Content for AI-planned topics is made
   by the `subgoal_generation` worker job, the same one used when a topic is
   added by hand, and not by inline LLM calls in a server action. A failed job
   shows a retry.
8. **Verify can be completed end to end.**
   - **Quiz and coding:** as they are today, without full-page reloads.
   - **Mock:** starts a real voice mock interview briefed on the goal. The
     section completes when that session is scored, and the link opens that
     session.
   - **Project:** you pick one of your own Projects, or start one from the goal.
     The section passes when that project is `COMPLETED` under the project's own
     review. What you type is never thrown away.
9. **An incident has a path.**
   - Each incident's "What you'll learn" offers **Adopt this path**, which copies
     a hand-written, shared Pathfinder goal whose topics are the incident's
     `learn` list (INC-32).
   - The first one is for *The demo that died at 30 seconds*.
10. **No dead code or dead links.**
    - Remove the components, actions and helpers that nothing imports.
    - Remove the UUID branches (ids are cuid2).
    - Remove the `/studio` links (the route does not exist).
    - Every `revalidatePath` names a real path.
11. **No goal without content.** Goals with zero topics are cleaned up by
    `pnpm script pathfinder-empty-goals` (done 2026-09-27: 2 deleted on dev).

## Out of scope

- Selling goals for credits. It was built and has been removed (decision 2).
- The job-import flow (`plan/job-import/`). "Practise this job's rounds" stays a
  link into it.
- Flashcards and videos. The tabs were dead and are deleted, not revived.
- Dropping the `credit_price` column and the `pathfinder_goal_purchase` table.
  The UI stops using them now. Dropping them is a separate, approved migration
  if it is ever wanted.

## Decisions (Niraj, 2026-09-27)

1. **Goal page layout.** A workspace with the tabs Today, Plan, Notes and Verify,
   like Projects and Incidents.
2. **Sharing.**
   - Copies are free, and pricing is dropped.
   - Goals are private by default, and sharing is a switch.
   - Groups stay, and gain rename and delete.
   - Goals that already exist keep their current `is_public` value. Only the
     default for new goals changes.
3. **Verification.** Fix all four sections, each tied to a real row: a scored
   `mock_voice_session` and a `COMPLETED` project.
4. **Dead code.** Approved for deletion, all of it: the list is in PF-1.
5. **Empty goals.** Delete them: "if that has no content, please delete it".
