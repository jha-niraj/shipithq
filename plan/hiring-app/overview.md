# Hiring app - the company side, built to the main app's standard

## What the module is

`apps/hiring`, served at `hire.shipithq.com`, is where a company works: its
team, its roles and pipelines, the students who sent it their results, and an
AI that knows all of it. It has no marketing site of its own (that lives on
`apps/web`): the address opens sign-in, or Home when signed in.

It looks and behaves like the main app, down to the component: the same shell,
the same sidebar (pin, unpin, hover to reveal), the same docked AI panel on
the right, and the same loading, colour and layout rules. It uses the shared
code, not a copy that drifts.

This plan is the foundation for `plan/hiring-rounds`. The company side of that
plan (HR-10 onwards) is built on this shell, sign-in, team and permission
system.

## Definition of done

1. **No landing page.** `hire.shipithq.com/` sends a signed-out visitor to
   sign-in and a signed-in one to Home (or to onboarding if unfinished). The
   landing page moves, unchanged for now, to the website at
   `shipithq.com/hire`, and its calls to action link to
   `hire.shipithq.com/signin`. It is improved later, not deleted.
2. **Sign-up is email and password only, with a company email.**
   - There is no Google button.
   - Free-mail domains (gmail, yahoo, outlook, hotmail, proton, icloud and
     similar) and known disposable domains are refused on the server, with a
     clear message.
   - The existing email code verification stays.
3. **Joining an existing company is by invite only.** When someone signs up
   with a domain whose company already exists on ShipItHQ:
   - an active company: they are told to ask an admin for an invite, and no
     second company is created
   - an unclaimed page: they are offered the claim flow (hiring-rounds HR-8)
4. **The person who creates a company is its Owner**, whatever their job title.
5. **Roles are the company's own.**
   - Every company has a fixed Owner role, which can't be edited or removed,
     and three editable presets (Admin, Recruiter, Interviewer).
   - The Owner can edit any role or add new ones by ticking permissions from
     one fixed list (Decisions).
6. **Every permission is enforced on the server** by one helper, in every
   action that reads or changes company data. A member without a permission
   never sees its controls, and the action refuses it anyway.
7. **Invites work end to end.** An Owner, or anyone with "manage team":
   - invites an email address with a role
   - the invitee opens `/invite?code=...`, signs up or signs in with that exact
     email, and joins with that role
   - codes expire after 7 days, can be resent or cancelled, and work once
8. **The shell is shared.** The sidebar (with the hover strip, ⌘K and
   customise), the page column and the docked AI rail come from
   `@repo/ui`. `apps/main` and `apps/hiring` both use them, each with its own
   links, and the main app behaves exactly as it does now.
9. **The UI rules hold.** The main app's rules from CLAUDE.md apply on every
   hiring page:
   - no spinners: skeletons for blocks, `InlineLoader` inline, `ShipItHQLoader`
     for whole-page loads
   - neutral palette only
   - `PageHeader` for titles, `StatBand` for headline numbers
   - a `loading.tsx` that matches every route
   - `ScrollArea`, and the shared toast
   - no horizontal scroll at 390, 768 and 1440 pixels wide, in light and dark
   - no sidebar link that leads nowhere
   - every signed-in route protected on the server
10. **Home shows three things:**
    - **Roles table:** each open role, its pipeline, sends waiting for review,
      and the pass rate per round, each linking to that role's applicants.
    - **Funnel per round:** for the selected role, how many started and how
      many passed each round.
    - **Needs attention:** unreviewed sends, invites awaiting an answer, a
      claim or verification still pending, pools too small for retakes, and
      team invites nobody has accepted.
11. **Messages.** A company member with "message candidates" can write to a
    student who sent them results.
    - The student gets it in a Messages inbox in the main app's jobs area,
      threaded per company, plus an email notice. They can reply there.
    - The company sees the thread in that candidate's detail.
12. **Company AI panel.** A member with "use AI" can open the docked AI panel
    and:
    - ask about this company's roles, candidates and scores; it reads only
      this company's data
    - have it draft a message to one student or a filtered group. A preview
      card shows each recipient and the text, with Send and Cancel, and
      nothing is sent without Send.
    - have it draft a pipeline or rounds, shown as a card with Add and Cancel
    - attach documents (a JD, a hiring policy) for it to use. These are stored
      privately in R2 and never shown to students.

    Usage is free within the monthly cap in Decisions, and the panel says how
    much is left.

## Out of scope (v1)

- Google, GitHub or magic-link sign-in for companies.
- One person belonging to several companies. A user has one company.
- Company billing changes. The existing billing pages stay as they are.
- Restricting permissions to particular jobs ("an interviewer sees only
  Backend").
- A mobile app, and a separate marketing site for hiring.

## Decisions

All by Niraj, 2026-09-25.

- **Address and marketing:** hiring lives at `hire.shipithq.com`, with no
  landing page in the app. The company landing page moves to `apps/web` at
  `/hire` (Niraj, 2026-09-25: move it, don't delete it), so all marketing,
  for students and companies, is on one site. A future main domain can
  redirect here.
- **Sign-in:** email and password with the OTP verification. Free-mail and
  disposable domains are blocked. No Google.
- **Joining:** by invite only.
- **Roles:** Owner, plus custom roles. Admin, Recruiter and Interviewer are
  editable presets. The permissions are:
  - view candidates
  - message candidates
  - invite or decline
  - manage jobs
  - manage pipelines
  - manage team
  - manage roles
  - edit company profile
  - view analytics
  - use AI
  - billing
  - delete company (Owner only, and not grantable)
- **Home:** the roles table, the funnel per round, and needs attention. No
  headline StatBand or trend chart.
- **Messages:** an in-app inbox for the student plus an email notice.
  Students can reply.
- **AI panel:**
  - it can answer, draft and send messages (after confirmation), draft
    pipelines, and use attached documents
  - it is free within a cap of 300 messages per company per month, which
    billing plans can raise later
  - it never touches student credits
- **The shell moves to `@repo/ui`** and both apps use it. A copy is not an
  option: two copies drift, as the jobs sidebar did before JB-8.
- **Where the AI runs** (Niraj, 2026-09-25, correcting an earlier draft of
  this plan): the company AI panel replies inline, streamed like the main
  app's `/api/ai/chat`, with a 25-second timeout. Chat is never a worker job;
  see CLAUDE.md "Long-running work". Only attachment text extraction (HA-13)
  and pipeline or question generation that can run long go to the worker.
