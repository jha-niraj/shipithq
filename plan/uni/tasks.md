# apps/uni tasks

From the 2026-10-07 check (plan/uni/overview.md, "Where it stands"). In order: each unlocks the next.
None started; this is the internal round Niraj named for after the website.

### - [ ] UNI-1 Classes that can be created
- **Why:** nothing can be assigned without a class ("No classes found. Create classes first.").
- **Files:** `apps/uni/app/(main)/classes/page.tsx`, the departments page, the existing `createClass` action.
- **Steps:** list classes per department; a create sheet (name, department, year, section, faculty);
  edit and archive; the plan's classes-per-faculty limit enforced with a clear message.
- **Edge cases:** a department with no classes; the limit reached; a faculty member with no department.
- **Done when:** a class created in the UI appears in the assignment sheets' "Select Classes".

### - [ ] UNI-2 Students: join, verify, enroll
- **Why:** the Students page is static; `verifyStudent` and `enrollStudents` have no UI.
- **Files:** `apps/uni/app/(main)/students/page.tsx`; apps/main (a "join my campus" request).
- **Steps:** a student asks to join a campus from their ShipItHQ account; the campus sees pending
  requests with real counts (Verified, Pending, Rejected); verify or reject singly and in bulk;
  enroll into classes; the plan's student limit enforced.
- **Edge cases:** a student at two campuses; a request after the limit; bulk import of a CSV.
- **Done when:** a test student requests, is verified and enrolled, and the counts show 1 / 0 / 0.

### - [ ] UNI-3 Assignments reach students
- **Why:** apps/main has no "assigned to you"; a class assignment reaches nobody.
- **Files:** apps/main (a place on Home and in each module for assigned work), the assignment tables.
- **Steps:** an enrolled student sees each assignment for their classes with its deadline and opens it
  in the matching module (project, voice mock, assessment); completion is recorded against it.
- **Edge cases:** a deadline passed; a student enrolled after assignment; credits required but none held.
- **Done when:** a project, a mock and an assessment assigned to a class each appear for, and can be
  completed by, an enrolled test student.

### - [ ] UNI-4 Results back to faculty
- **Why:** "View Progress" / "View Results" have no handler; the result actions are never called.
- **Files:** `apps/uni/app/(main)/assignments/page.tsx`, new detail routes under `/assignments/*/[id]`.
- **Steps:** per assignment, a results page by class and student (status, score, time), the
  submission itself, and grading where a human is needed.
- **Done when:** the test student's completed work shows with its score in the faculty view.

### - [ ] UNI-5 Analytics from real data
- **Steps:** readiness and completion by department and class, credit use against the pool, built
  from UNI-3 and UNI-4 records; a department head sees their department, the campus admin all.
- **Done when:** the zeros are gone and each number traces to a query over real records.

### - [ ] UNI-6 Placements
- **Steps:** campus-only jobs (the new-job form's TODO), company referrals into ShipItHQ Hiring,
  applied to placed per drive. Growth and Enterprise only.
- **Done when:** a campus-only job is visible to verified students of that campus and nobody else.

### - [ ] UNI-7 Billing and credits
- **Steps:** checkout for UNI_PLANS, invoices, the monthly pool real and allocatable to students;
  remove "30-day free trial" unless a trial is decided and built.
- **Done when:** a test purchase in Razorpay test mode moves a campus to Starter with its pool.

### - [ ] UNI-8 Sidebar without dead links
- **Steps:** every link in `apps/uni/lib/navigation.ts` points at a route that exists, or is removed
  until it does (faculty/invite, assignments/new, credits/*, analytics/*, placements/applications,
  billing/invoices).
- **Done when:** a crawl of the sidebar finds no 404.

When UNI-1 to UNI-4 are done, revisit shipithq.com/uni (plan/web/story ST-15): the early-access
framing and the "being built" steps should change to what then works.
