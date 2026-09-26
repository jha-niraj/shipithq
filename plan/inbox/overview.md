# Inbox - overview

## What this module is

One place, on each side of ShipItHQ, where everything that needs a person's
attention arrives:
- messages between a company and a student
- every notification: a new result, an invite, a score, a team invite, a
  practice reminder

It replaces the notification bell's sheet. It is built once, as a layout in
`@repo/ui`, and used by the student app (`apps/main`) and the company app
(`apps/hiring`).

It follows the reference Niraj gave (Gr8r Studio's inbox, 2026-09-26):
- **List** on the left:
  - a header with an Unread toggle and "mark all read"
  - tabs
  - each item has initials, "**actor** did **thing**", a preview line, and a
    meta row (icon, coloured dot, context, time)
- **Detail** on the right:
  - back, a breadcrumb, and an Open button
  - the title and metadata chips
  - the conversation and a reply box (Cmd/Ctrl+Enter to send)

## Definition of done

1. **One layout.** `@repo/ui` exports the Inbox layout, list, item and detail.
   Neither app has its own inbox markup, only data and actions.
2. **Tabs.**
   - Student: All, Companies, Rounds, Updates.
   - Company: All, Candidates, Results, Team.
   - Every notification kind belongs to exactly one tab (a table in code).
3. **Unread** has a toggle, "mark all read", and a count on the sidebar's Inbox
   item in both apps. The count updates when something is read or arrives
   (checked on focus and every 60 s).
4. **Messages are threads.**
   - A thread is between one company and one student, opened by the company,
     and only for a student who sent it results.
   - The student replies from their Inbox. Any company member with "message
     candidates" can read and reply, and each message shows who wrote it.
5. **Read is per person.** Each company member has their own unread state. One
   reading doesn't clear it for the others.
6. **Every notification has a shape:** kind, actor, context (label, link) and
   an optional thread, written by one helper, `notify()`. No app inserts
   notification rows by hand.
7. **A company notice reaches every member who should see it:** one row per
   member with the right permission.
8. **Email is batched:** at most one email per thread per hour for new
   messages. The email links to the thread.
9. **Nothing leaks across apps.** The student Inbox shows only MAIN
   notifications, and the company Inbox shows only HIRING ones.
10. **A withdrawn send closes the door.** The student can still read the thread,
    but the company can't start new messages to them.

## Out of scope

- Mentions and assignments (there is no team task system).
- Attachments in messages (plan/hiring-app HA-13 covers AI attachments).
- Messages between students, or between company members.
- Push notifications.

## Decisions

- **The Inbox replaces the bell sheet** (Niraj, 2026-09-26). The bell becomes a
  shortcut to /inbox with the same count. The old sheets are deleted after
  Niraj's OK.
- **Tabs** (Niraj, 2026-09-26):
  - Student:
    - Companies: messages and invites
    - Rounds: scores, sends, declines, outcomes
    - Updates: everything else from ShipItHQ
  - Company:
    - Candidates: student replies
    - Results: new sends and withdrawals
    - Team: invites, joins, claims
- **Shared threads, read per member** (Niraj, 2026-09-26).
- **The notification table is extended, not replaced** (Niraj, 2026-09-26). It
  gains kind, actor, context, a thread link, a read time, and a company for
  fan-out rows.
- **Polling, not sockets:** counts are refreshed on focus and every 60 s. A
  live channel can come later without changing the layout.
