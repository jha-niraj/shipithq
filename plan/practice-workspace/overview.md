# The DSA workspace - what a guided problem feels like

The three-column screen a learner spends their time in: the problem, the editor and
its tests, and the mentor. This file covers the workspace itself; the mentor's
teaching rules are `plan/practice-dsa`, and the route in is `plan/practice-path`.

Written 2026-09-22 after Niraj used it on Single Number.

## Decisions (Niraj, 2026-09-22)

| | |
|---|---|
| Editor surface | Black, like the shell around it. Monaco's `vs-dark` grey read as a panel that had failed to load |
| Timer | EXAM only. It counts DOWN from a budget by difficulty and is worked out from the session's start time, so a reload agrees. Running out changes the reading, never the work |
| Above the editor | Nothing when the language has tests. The signature was already the first line of the starter code |
| Mentor composer | ONE box that the field fills, tall enough to write in, growing to a cap |
| The stage's question | Asked by the mentor as a message, not printed as a caption, and saved with the rest |
| Transcript | Kept per stage. Going back to Understand shows what was said in Understand |
| Stages | The five stay: Understand, Approach, Brute force, Optimise, Reflect |
| Voice | Sarvam AI replaces ElevenLabs. The ElevenLabs code stays in the repo, unused |
| Speaking to it | Words appear in the box as you speak, and you press send |
| It speaking back | Only when you used the mic. A mute control in the panel header |

## When it is done

- The workspace is black, with the problem statement readable at AA on it.
- An exam shows the time left and is right after a reload; assist shows no clock.
- The mentor panel opens each stage with the mentor's own question, keeps the
  conversation per stage, and scrolls inside itself.
- The mic streams words into the composer, and the mentor's reply is spoken when
  the turn was spoken.
- Nothing in the workspace calls ElevenLabs.

## Limits (decisions, referenced from the code)

- Exam budget: 20 minutes easy, 35 medium, 50 hard.
- Composer: 76px tall, growing to 224px, then scrolling.
- Voice: Sarvam's streaming speech to text for input, its speech model for replies.
