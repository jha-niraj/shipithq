Ask a final-year student in an interview to "walk me through a project you built" and one of three things happens. They describe a project they genuinely built and can talk about for ten minutes. They describe one they downloaded, and the first follow-up question ends the conversation. Or they have nothing to describe at all.

Coursework can move a whole batch into the first group. Most engineering programmes already require project work: mini projects, lab assignments, the final-year project. The difference between a project that helps in placements and one that does not is almost entirely in how it is assigned and assessed. This guide is for faculty and heads of department who want that work to double as interview material.

## What a recruiter actually asks about a project

It helps to start from the other side of the table. In a campus interview, the project questions are rarely about the technology. They are about decisions:

- Why did you choose this approach over the obvious alternative?
- What was the hardest bug, and how did you find it?
- What would break if ten times as many people used it?
- What would you change if you started again?
- Which part did you build yourself, in a team project?

A student can answer all five only if they made real decisions, hit real problems and remember them. That gives a design brief for coursework projects: create situations where students have to decide, get stuck and recover, and make them write it down.

## Scoping: small, finished, and theirs

The most common failure is scope. A project brief of "build an e-commerce platform" produces a folder of half-finished pages and a student who cannot explain any of them. Scope for a project that one student, or a team of two or three, can finish and deploy within the course:

- **One core feature, done properly**, rather than ten done badly. A library system that handles issuing and returning books with correct rules for overdue fines is a better project than one that claims payments, recommendations and a chat bot.
- **A real constraint.** Data that does not fit in memory, a response time target, an input format that is messy. Constraints force decisions, and decisions are what interviews ask about.
- **Room to choose.** Specify the problem, not the stack. Two students solving the same problem in different ways have two different stories to tell.

[PBLWorks](https://www.pblworks.org/) publishes a well-known framework for project-based learning, and the teaching resources at [Carnegie Mellon's Eberhard Center](https://www.cmu.edu/teaching/) are good on designing assessments that reward understanding over output.

## Deadlines that produce finished work

A single end-of-semester deadline produces a single panicked week. Break the project into checkpoints that are each small enough to review in a lab session:

1. **Proposal.** The problem, the constraint, and the one feature. One page.
2. **Working core.** The main feature running, even if it looks rough.
3. **Hardening.** Error handling, edge cases, and a README that lets someone else run it.
4. **Decision log.** A short document: three decisions, what else they considered, and why they chose what they did.
5. **Demo and viva.** Five minutes of demo, five of questions.

The decision log is the most valuable artefact in the list. It is what the student will read the night before an interview.

## A rubric that rewards understanding

If the rubric rewards the number of features or the polish of the interface, students will optimise for that, often by copying. Weight it towards what an interviewer will test:

| Criterion | Weight | What earns full marks |
|---|---|---|
| It works | 25% | runs from the README on a clean machine |
| Decisions | 30% | three real decisions, alternatives named |
| Viva | 30% | explains any part of the code when asked |
| Quality | 15% | readable code, handles bad input |

Most of the marks sit in the decision log and the viva, which are the parts that cannot be copied.

## Avoiding copied projects

Copying is easier than ever: full projects are a search away, and AI tools will generate a plausible one in minutes. Detection is an arms race you will not win on your own. Design is a better defence.

- **Make the brief local.** A problem specific to your department, your college's data, or a constraint you invented is hard to find ready-made.
- **Check code similarity within the batch.** Tools like Stanford's [MOSS](https://theory.stanford.edu/~aiken/moss/) have been used for years to flag similar submissions for a human to review.
- **Let the viva decide.** Ask the student to change one small thing in their code while you watch, or explain why a particular function exists. A student who built it can; a student who copied it usually cannot.
- **Be explicit about AI tools.** Banning them is unenforceable. Requiring students to state what they used and explain every line they submit is not.

## Team projects without passengers

Interviewers ask "which part did you build?" because team projects hide passengers. Assign each team member a named component in the proposal, look at the commit history, and run the viva individually. A student who can only describe the team's project, not their part of it, will struggle in the interview anyway; better they find out in the lab.

## From coursework to the placement season

A project assigned this way leaves the student with three things a placement season needs: a working link for the resume, a decision log to revise from, and the experience of defending their work in a viva. Placement cells can build on that directly, by asking for the project in the [readiness baseline](/blogs/placement-readiness-metrics) and using it as the opening question in [batch mock interviews](/blogs/mock-interviews-at-scale).

For students reading along, our guide to [portfolio project ideas](/blogs/portfolio-project-ideas-software-engineer) takes the same approach from their side: fewer, finished projects that they can explain.
