# apps/uni: the university workspace

What apps/uni is when it is 100% done, and where it stands (checked against the code 2026-10-07,
for plan/web/story ST-15). Referenced by plan/web/revamp REV-33.

## Done means

A campus can run a semester on it end to end:

1. **Set up.** The head of the institution registers, finishes onboarding (institution, type, role,
   about, departments, campus), and lands in a workspace that already has its departments.
2. **People.** Faculty are invited with a role and a department; each role's 21 permissions can be
   switched per person; invitations can be revoked; members deactivated.
3. **Classes and students.** Departments hold classes; faculty create classes; students join with
   their ShipItHQ account, are verified for the campus (one by one or in bulk), and are enrolled.
4. **Assignments reach students.** A project, a voice mock or an assessment assigned to a class
   appears in each enrolled student's ShipItHQ account, with its deadline; students do it there.
5. **Results come back.** Faculty see who started, finished and how they scored, per class and per
   student, and can open a submission. Grading is where the work needs a human.
6. **Readiness.** Analytics shows readiness and completion by department and class, and credit use
   against the pool, from the work students did.
7. **Placements.** Campus-only jobs, company referrals into ShipItHQ Hiring, and applied to placed per drive.
8. **Billing.** A plan can be bought (UNI_PLANS in @repo/pricing), with invoices; the monthly credit
   pool is real and can be allocated to students.

## Where it stands (2026-10-07)

| Part | State |
|---|---|
| Register, email code, six-step onboarding, departments created from it | Works |
| Invite faculty (head only), five invitable roles plus University Admin, 21 permissions, revoke | Works |
| Design a project (AI brief), a voice mock, a quiz / code / mixed assessment, with deadline and credits | Works |
| Classes: create, enroll | Server actions only; the Classes page is a static empty state, so nothing can be assigned |
| Students: roster, verification, credits | Server actions only; the page is static with zeros and dead buttons |
| Students receiving assignments in apps/main | Not built |
| Results: View Progress / View Results, per-student scores, detail routes | Menu items with no handler; result actions never called |
| Analytics | Placeholder, hard-coded zeros |
| Placements | Placeholder; the new-job form has a TODO |
| Billing | Not wired to checkout; a "30-day free trial" line with nothing behind it |
| Sidebar | Links to routes that do not exist (faculty/invite, assignments/new, credits/*, analytics/*, placements/applications, billing/invoices) |

## Decisions

- shipithq.com/uni presents this as early access until 3 to 5 above work (Niraj, 2026-10-07,
  plan/web/story ST-15): it shows what works, draws the rest as being built, and asks campuses to
  request early access; plan prices are shown with "Talk to us" until billing works.
- Prices and limits are UNI_PLANS in packages/pricing (decided 2026-09-26, plan/web/revamp).
