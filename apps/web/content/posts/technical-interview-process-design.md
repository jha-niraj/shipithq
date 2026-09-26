Most engineering interview loops were not designed. They accreted. Someone added a coding round after a bad hire, someone else added a "culture" chat after a good candidate left, and five years later the loop takes three weeks, tests the same thing twice and misses the thing that actually predicts performance.

This guide is a way to design the loop on purpose: decide what the job needs, pick one round per need, give each round a pass mark, and stop.

## Start from the job, not from the rounds

Before choosing a single question, write down the four or five things someone must be able to do in the first six months. Not traits, not "passion". Things they do.

For a backend engineer on a small team that list might be:

- write correct, readable code in the team's language under mild time pressure
- reason about data structures well enough to spot an accidental O(n²)
- design a small service and explain its trade-offs
- explain their own past work clearly to a non-specialist

Every round in your loop should map to exactly one of these. If a round maps to none, delete it. If two rounds map to the same need, keep the better one.

## What the research says predicts performance

The best-known evidence comes from meta-analyses of personnel selection. Schmidt and Hunter's 1998 review ([Psychological Bulletin, doi:10.1037/0033-2909.124.2.262](https://doi.org/10.1037/0033-2909.124.2.262)) found work samples, general mental ability tests and structured interviews among the strongest predictors of job performance, with unstructured interviews well behind.

A 2022 re-analysis by Sackett and colleagues ([Journal of Applied Psychology, doi:10.1037/apl0000994](https://doi.org/10.1037/apl0000994)) corrected an old statistical overcorrection and revised many of those numbers down. Structured interviews came out at the top; unstructured interviews stayed near the bottom.

Two lessons survive both papers:

1. **Structure beats chemistry.** The same questions, asked the same way, scored against a written rubric, predict far better than a free-flowing conversation. (See [structured interviews for engineering hiring](/blogs/structured-interviews-engineering-hiring).)
2. **Doing the work beats talking about it.** A task that looks like the job tells you more than a question about the job. (See [work samples vs take-home assignments](/blogs/work-sample-vs-take-home-assignment).)

## A loop that fits in a week

For most engineering roles four rounds are enough:

| Round | Tests | Format |
|---|---|---|
| Aptitude | reasoning under time | 20 questions, 25 minutes |
| Coding | correct code, data structures | one or two problems, hidden tests |
| System design | trade-offs, communication | one open prompt, 45 minutes |
| Structured conversation | past work, collaboration | fixed questions, scored rubric |

The first two are cheap for you and screen at volume. The last two are expensive, so they should only see candidates who cleared the first two.

## Gates: which rounds decide, and which only inform

Not every round should be allowed to reject someone. Decide up front:

- **Hard gate:** below the pass mark, the candidate does not continue. Use this for rounds that test a floor the job cannot work without, such as writing correct code.
- **Advisory:** the score is recorded and discussed, but it does not stop anyone. Use this for rounds where a low score is informative but not disqualifying on its own, such as a design conversation with a junior candidate.

Most loops make every round an implicit hard gate, because any interviewer can say "no". Writing the gate down removes that veto and forces the decision back to evidence.

How to choose the number itself is its own problem: see [setting pass marks for technical assessments](/blogs/pass-marks-technical-assessments).

## Write the rubric before you meet anyone

For each round, write down what a strong, acceptable and weak answer looks like, in observable terms. "Handles the empty input without being prompted" is observable. "Strong problem solver" is not.

Rubrics written after the interview describe the candidate you liked. Rubrics written before describe the job.

## Keep the loop short and the same for everyone

Every extra round costs you candidates, and it costs you the best ones first, because they have other offers. A loop that runs in a week with four rounds beats a loop that runs in a month with seven.

And give every candidate for the same role the same loop. Changing rounds per candidate is how bias gets in, and it makes scores impossible to compare.

## How ShipItHQ fits

ShipItHQ Hiring lets you build this loop once as a [pipeline](/hire/pipelines): aptitude, coding, system design and voice rounds, each with a pass mark, a time limit and a hard or advisory gate, attached to a job. The question pools behind the rounds are described on [the questions page](/hire/questions).
