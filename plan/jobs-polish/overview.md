# Jobs polish - overview

## What this module is

A pass over the student side of jobs and rounds (Niraj, 2026-09-28): the "Practise any
job" page, the company page, the rounds lists, the round runner and its results, the
cool-down, the interview report, plus two platform-wide sweeps it exposed: native date
inputs and inline confirmations.

## Definition of done

1. **The shell lines up.** The jobs header's bottom border and the AI rail's (Harbor's)
   header border are the same height on desktop.
2. **Practise any job:** the three steps sit in a left column as a vertical stepper; the job
   is a one-line link box, with "Paste the text instead" opening a text area only when
   asked; the rest of the form on the right.
3. **The company page has tabs,** kept in the URL (`?tab=`): Overview (about, stack,
   culture, benefits, stats, quick facts), Jobs (open roles, jobs students imported),
   Practice (ShipItHQ's rounds, paste a job), Interviews (what students report, report yours).
4. **Rounds lists** (a job's, a company's practice, an imported job's) are two columns: the
   job and company on the left, sticky; the rounds on the right.
5. **Cool-down is visible and skippable.** A cooling-down round shows a live countdown and
   "Try now" at the round's price; after the cool-down, a retake is free. A first attempt
   costs the round's price, as today.
6. **The aptitude screen:** the question (its lines kept, statements and numbered
   conclusions laid out as a list) with the options two per row; a sticky right column with
   the question grid, answered and left counts, and Submit.
7. **Submitting and leaving a round ask in a dialog,** never inline. The same for every other
   final or destructive action in the apps: no inline "Keep going / Submit" rows and no
   browser `confirm()`.
8. **Results:** a sticky left column with the score, pass mark, result, right / wrong /
   unanswered counts, time taken and the way back; the questions on the right in a
   ScrollArea.
9. **The company decides what a student sees after scoring,** per round: score only, score
   and right-or-wrong, or full answers and explanations. The server never sends what the
   setting hides. ShipItHQ's own practice rounds show full answers.
10. **Report your interview** is a wider sheet in three steps (the interview, the rounds,
    review), and submitting it earns 20 XP (once per report). Approval still pays 10 credits.
11. **No native date or time inputs** anywhere in the apps: dates, months, date-times and
    times use the shared pickers in packages/ui (shadcn Calendar in a Popover; time as a
    select of 15-minute slots).

## Decisions (Niraj, 2026-09-28)

- Import page: steps on the left; one-line link box with "Paste the text instead".
- Aptitude screen: navigator on the right; options two per row.
- Retake price: free after the cool-down, for every round type; "Try now" during the
  cool-down costs the round's normal price.
- Answer visibility: per round, three levels; platform practice rounds default to full.
- Company tabs: Overview, Jobs, Practice, Interviews.
- Interview report XP: 20 XP on submission, once per report (Claude's call, as asked:
  a report is ten minutes of careful writing; incidents pay 10 to 50 XP per step).

## Out of scope

- Changing round prices; the hiring app's own company page (already tabbed).
