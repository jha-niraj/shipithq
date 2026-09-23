# The practice path - what to do next, in order

A personal route through a module's catalogue, built from the onboarding: stages of
problems by topic, each ending in a checkpoint. It replaces the flat "Recommended"
list, which told a user which 30 problems to do but nothing about the order, the
shape of the journey, or whether they were ready to move on.

Asked for by Niraj on 2026-09-22, after using the recommended list: "you don't even
have an idea how way to move ... if I open the single number, this is just like going
in a random order ... we need to think about something like you can see on the
takeuforward website".

## Decisions (Niraj, 2026-09-22)

| | |
|---|---|
| Shape | Stages by topic, 6 to 8, each with a goal, 3 to 6 problems and a checkpoint |
| Placement | The DSA page's first tab becomes Path; All stays as the second tab |
| Checkpoint | ONE checkpoint per stage with THREE parts, in order: quiz, mock, timed problem |
| What each part is for | The quiz tests the choice ("which structure, and why"), the mock teaches how to say the approach out loud, the exam-mode problem tests what the stage taught |
| Cost | The quiz is free. The timed problem charges the existing exam price. The mock consumes a mock pack, as it does today |
| A weak result | Adds two or three problems aimed at what went wrong, then the checkpoint can be retried. The stage stays open |
| Input | The onboarding profile and the mentor's memory. Never a form: the user has already answered these questions |

## When it is done

- Finishing a module's onboarding produces a path: ordered stages, each with a topic,
  a one-line goal, its problems in order, and a checkpoint.
- The module page opens on the path, showing where you are, what is next, and an
  honest estimate of when you will finish at the pace you said you have.
- A stage's problems are the catalogue's own problems; the path never invents one.
- A checkpoint runs quiz, then mock, then timed problem, each recorded with its
  result, and the stage is complete when all three are done.
- A weak quiz or timed problem adds targeted problems to the stage and offers a retry.
- The path re-plans on demand, from the profile plus what the mentor has since
  recorded, without losing what is already done.
- Every problem stays reachable through the All tab, unchanged.

## Limits (decisions, referenced from the code)

- 6 to 8 stages, 3 to 6 problems each, from the module's catalogue only.
- Quiz: 6 questions, free, model-generated from the stage's concepts.
- Timed problem: the stage's hardest unsolved problem, in the existing exam mode.
- Mock: the existing voice mock, seeded with the stage's topics.
- Pace: from the hours the onboarding recorded, to estimate a finish date.

## Not in scope

- A day-by-day calendar. Stages are the unit; a missed day should not make the plan wrong.
- Locking. The next stage is suggested, never blocked.
- Adding problems to the catalogue. That control is off the page (2026-09-22).
