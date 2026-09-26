# Inbox - tasks

| ID | Task | Serves | Status |
|---|---|---|---|
| IN-1 | Schema: notification fields, threads, messages, reads | 4, 5, 6, 7 | done 2026-09-26 |
| IN-2 | `notify()` and the kinds table; move the four writers | 2, 6, 7, 9 | done 2026-09-26 |
| IN-3 | The shared Inbox layout in `@repo/ui` | 1, 2, 3 | code done; browser pass is Niraj's |
| IN-4 | Sidebar count badges | 3 | code done; browser pass is Niraj's |
| IN-5 | Student Inbox (apps/main) | 2, 3, 4, 9 | done server side; browser pass is Niraj's |
| IN-6 | Company Inbox (apps/hiring) | 2, 3, 4, 5, 9 | done server side; browser pass is Niraj's |
| IN-7 | Starting a thread; replies; batched email | 4, 8, 10 | done server side; the live email is Niraj's check |
| IN-8 | Hiring events write to the Inbox | 7 | done 2026-09-26 |
| IN-9 | Retire the bell sheets (needs Niraj's OK) | 1 | done 2026-09-26 (Niraj: remove the bell entirely) |

---

## IN-1 Schema: notification fields, threads, messages, reads
- [x] Status: done 2026-09-26.
  - Migration `0049_inbox` is applied, and "Nothing pending" after:
    - three tables: `message_thread`, `message`, `message_read`
    - six `notification` columns
    - `updated_at` default now()
    - read rows backfilled with `read_at` (the dev DB had none)
  - `notification.company_id` is a plain indexed column, since `schema.ts`
    can't import `hiring.ts`.

**Files.**
- `packages/db/src/schema/schema.ts` (`notification`)
- new `packages/db/src/schema/messages.ts`
- one migration (`pnpm db:generate --name inbox`), applied with
  `pnpm script migrations --apply` after its preview is reported

**Steps.**
- `notification` gains:
  - `kind` (text, default `GENERAL`)
  - `actor` jsonb `{ name, initials }`
  - `context` jsonb `{ label, href? }`
  - `thread_id`
  - `company_id` (set on company fan-out rows)
  - `read_at`
  - `updated_at` default now()
- `message_thread`:
  - `company_id`, `user_id`, `send_id` (nullable), `job_id` (nullable)
  - `subject`
  - `last_message_at`
  - `closed_at` (set when the send is withdrawn)
  - unique (company_id, user_id)
- `message`:
  - `thread_id`
  - `author_kind` (COMPANY | STUDENT)
  - `author_user_id`
  - `body`
  - `created_at`
- `message_read`: (thread_id, user_id) primary key, with `last_read_at`, so a
  thread's unread state is per person.

**Edge cases.** Existing rows get `kind = 'GENERAL'` and `read_at = updated_at`
where read. Nothing else changes.

**Done when.** The migration previews, applies, and "Nothing to change" follows.

## IN-2 `notify()` and the kinds table
- [x] Status: done 2026-09-26, verified.
  - `@repo/db/notify`:
    - `notifyUser`, `notifyUsers`
    - `notifyEach` (bulk, different notices)
    - `notificationRows` (for `db.batch`)
    - `notifyCompany` (fans out to active members whose role has the
      permission; the Owner always)
    - `membersWith`
  - `@repo/db/inbox-kinds`: the kinds, each side's tabs, `kindsForTab`,
    `initialsOf`.
  - The four writers moved to it: request rejected and published (admin), claim
    approved (admin, inside its transaction), and DSA reminders (main cron).
    `grep -rn "insert(notifications)"` now matches only `notify.ts`.
  - System notices carry no actor, so the list doesn't read "ShipItHQ We
    didn't add X".

**Files.**
- `packages/db/src/notify.ts`, exported as `@repo/db/notify`
- `packages/db/src/inbox-kinds.ts`: kind to tab, per side, client-safe
- the four writers:
  - `apps/admin/actions/hiring/company-drafts.action.ts` (2 inserts)
  - `apps/admin/actions/hiring/claims.action.ts`
  - `apps/main/app/api/cron/dsa-reminders/route.ts`

**Steps.**
- `notifyUser({ userId, platform, kind, title, body, actor?, context?, href?, threadId? })`.
- `notifyCompany({ companyId, permission, ...same })` writes one row per active
  member whose role has the permission (the Owner always).
- Both take an optional transaction.

**Done when.** `grep -rn "insert(notifications)" apps` finds nothing outside
`notify.ts`, and each moved writer still produces its row (checked with a
script).

## IN-3 The shared Inbox layout in `@repo/ui`
- [ ] Status: code done 2026-09-26; the browser pass is Niraj's.
  - `packages/ui/src/components/inbox/`:
    - `inbox.tsx`: `InboxLayout`, `InboxList`, `InboxItem`, `InboxDetail`,
      `ReplyBox`, `InboxChip`, and the skeletons
    - `inbox-app.tsx`: the whole screen's state, given an app's actions
    - `types.tsx`, `inbox-icons.tsx`, `time.ts`
  - It matches the reference: header with the Unread switch and "mark all
    read", underline tabs with counts, items (initials, bold actor, preview,
    meta row), and a detail pane with back, breadcrumb, Open, title, chips,
    Conversation and the reply box (Cmd/Ctrl+Enter).
  - Keys: j/k or the arrows, e, Esc. Phones take turns between list and
    detail.
  - Monochrome: the reference's coloured context dots are neutral here
    (CLAUDE.md palette).

**Files.** `packages/ui/src/components/inbox/{inbox-layout,inbox-list,inbox-item,inbox-detail,reply-box}.tsx`

**Steps.** Match the reference:
- **List:**
  - a header ("Inbox", the Unread switch, "mark all read")
  - tabs
  - items with initials, bold actor and object, a preview, and the meta row
    (kind icon, dot, context, time)
  - an unread dot, and mark read or unread on hover
- **Detail:**
  - back, a breadcrumb (context), and an Open button (href)
  - the title and chips
  - the CONVERSATION label, messages, and a reply box (Cmd/Ctrl+Enter)
  - a notification with no thread shows its body and the Open button
- **Keys:** j/k or the arrows move, Enter opens, e marks read, Esc goes back.
- **Mobile:** list and detail take turns.
- The skeletons match both panes.

**Done when.** Both apps render it from data alone, and it passes the UI rules
(monochrome, legible, the right loaders).

## IN-4 Sidebar count badges
- [ ] Status: code done 2026-09-26; the browser pass is Niraj's.
  - `ShellSidebar` takes `badges` (keyed by path), drawn as a light pill that
    is legible on the black active row too.
  - `/inbox` is added to `SIDEBAR_LOCKED_PATHS`, so saved pins can't hide it.
  - Both sidebars refresh the count on load, on focus, every 60 s, and on
    `INBOX_CHANGED_EVENT`.

**Files.**
- `packages/ui/src/lib/shell-navigation.ts`
- `shell/shell-sidebar.tsx`, `docked-rail.tsx`
- each app's sidebar

**Steps.**
- A `badges?: Record<path, number>` prop on the shell, drawn on the matching row
  (99+ cap).
- Each app fetches its Inbox count on focus and every 60 s, and after it marks
  something read.

**Done when.** The count on the Inbox row matches the unread total in both
apps, and drops when an item is opened.

## IN-5 Student Inbox (apps/main)
- [ ] Status: done server side 2026-09-26; the browser pass is Niraj's.
  - `app/(main)/inbox` (page and loading), `actions/inbox.action.ts`, and the
    nav entry after Home.
  - The shared queries are in `@repo/db/inbox` and the mapping in
    `@repo/db/inbox-view`.
  - The platform leak is gone: the student Inbox reads `platform = MAIN` only.

**Files.** `apps/main/app/(main)/inbox/*` and `apps/main/actions/inbox.action.ts`.

**Steps.**
- List MAIN notifications, and threads with their latest message, merged
  newest first.
- Open, mark read and mark all read; reply in a thread.
- Fix the leak: only `platform = MAIN`.

**Done when.** A company message and an Updates notice show in their tabs; a
reply lands on the company side; the counts update.

## IN-6 Company Inbox (apps/hiring)
- [ ] Status: done server side 2026-09-26; the browser pass is Niraj's.
  - `app/(main)/inbox`, `actions/inbox`, and the nav entry.
  - Any member reads their own inbox. Replying needs "message candidates"
    (otherwise the reply box says why).

**Files.** `apps/hiring/app/(main)/inbox/*`, `apps/hiring/actions/inbox`, and the
nav entry.

**Steps.**
- The same shape, plus the company's threads for members with "message
  candidates", with read per member.

**Done when.** Two members each see their own unread count, and one reading
doesn't clear it for the other.

## IN-7 Starting a thread; replies; batched email
- [ ] Status: done server side 2026-09-26. The real email is part of Niraj's
  pass.
  - A Message button in the candidate workspace (members with "message
    candidates") calls `messageCandidateAction`, which runs `startThread`.
  - `@repo/email/messages` `sendNewMessageEmail` is sent through each app's
    `lib/inbox/email.ts`, linking to the other app's /inbox.
    `NEXT_PUBLIC_HIRING_URL` was added to main and `NEXT_PUBLIC_MAIN_URL` to
    hiring (examples and local `.env`).
  - A withdrawal calls `closeThreadsForSend`.
  - **Found:** the hourly cutoff compared a JS Date against a timestamp column
    in the wrong zone, so every message emailed. The stamp and the cutoff are
    now both `now()` in SQL.

**Files.**
- a Message button in the candidate workspace
- `apps/hiring/lib/emails/new-message.ts` and `apps/main/lib/emails/new-message.ts`

**Steps.**
- A company member opens the thread on a student who sent results, or reuses
  the existing one.
- Each message notifies the other side (MESSAGE kind, linked to the thread).
- An email goes out when none was sent for that thread in the last hour.
- A withdrawn send sets `closed_at`. The company can't write any more; the
  student can still read.

**Done when.** A company message reaches the student's Inbox and email, the
reply appears for the company, and a second message within the hour sends no
second email.

## IN-8 Hiring events write to the Inbox
- [x] Status: done 2026-09-26.
  - `SEND_RECEIVED` (a new send only, not a double click) and
    `SEND_WITHDRAWN` go to members with "view candidates".
  - `ROUND_SCORED` goes to the student from `closeAttempt`, scored or refunded,
    for every round type except aptitude.
  - `MEMBER_JOINED` goes to members with "manage team" when an invite is
    accepted.

**Steps.**
- New send: `SEND_RECEIVED` to members with "view candidates". This is
  plan/hiring-rounds HR-25's in-app half; its email half stays in HR-25.
- Withdrawn send: `SEND_WITHDRAWN` to the same members.
- The student hears `ROUND_SCORED` when an AI-assessed round is scored.

**Done when.** Each event lands in the right tab on the right side.

## IN-9 Retire the bell sheets
- [x] Status: done 2026-09-26. Niraj: remove the bell entirely; the sidebar's
  Inbox count is the one indicator.
  - Deleted the main and hiring `notifications-panel.tsx`,
    `packages/ui/.../notifications-panel.tsx`, main's `notification.action.ts`
    and hiring's `actions/notifications`.
  - Also deleted `actions/candidates/candidate-assignments.ts` (unused,
    approved the same day).
  - The admin and uni sidebars keep their own notification code.

**Proposed.**
- `apps/main/components/navigation/notifications-panel.tsx`
- `apps/hiring/components/navigation/notifications-panel.tsx`
- `packages/ui/src/components/ui/notifications-panel.tsx`
- the bell footer slot becomes an Inbox shortcut with the count

**Done when.** No bell sheet remains, and the shortcut opens /inbox.

## Verification (2026-09-26)

Against the dev DB with throwaway users, roles, a role and a send (all
deleted after):

- **The shared inbox logic, 19/19:**
  - the fan-out filter by permission
  - thread start and reuse
  - one email per hour
  - one collapsed thread row, and unread counted once
  - opening shows the conversation and clears the count
  - a reply reaches the company's permitted members only
  - read per member
  - no cross-user or cross-app reads
  - mark unread and mark all read
  - a closed thread blocks the company but not the student
  - another student can't post
- **The mapping layer, 10/10:**
  - each kind lands in its tab on each side
  - tab counts add up
  - a thread opens as a conversation, a notice with its Open link
  - a company member isn't notified of their own message
  - a withdrawn thread is read-only with the reason
  - (an 11th check assumed the author name passed in; the stored account name
    is used, which is correct)

**Manual pass (Niraj):**
- `/inbox` in both apps: tabs, the Unread switch, mark all read, keys j/k/e,
  and the phone layout
- Message a candidate from the workspace; reply as the student
- The badge updates on both sides
- The email arrives once within an hour
