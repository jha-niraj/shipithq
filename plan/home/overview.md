# Home - overview

## What this module is

`/home`, the first page after sign-in. It answers "what should I do next?" first
and "how am I doing?" second.

## Definition of done

1. **It paints once.** The skeleton is shaped like the page and the content replaces
   it in place: no snap, no blank frame between skeleton and content. Server-rendered
   content is visible before hydration; nothing starts at `opacity: 0` waiting for JS.
2. **Action-first** (Niraj, 2026-09-25): a header with the greeting and two quick
   actions; the headline `StatBand`; a "Pick up where you left off" card naming the
   one thing in progress with one button; four compact module cards in a 2x2 grid
   (Momentum, Projects, Career goals, Interview practice), each a number, a line of
   context and a small trend line, linking to its module; then the activity calendar.
3. **Honest when empty.** A new user sees a start card ("Start your first project"),
   not a resume button for nothing; zero trends draw flat, not as an error.
4. **Responsive**: 2x2 becomes one column below `md`; no horizontal page scroll at
   390px.

## Decisions

- **Entrance motion is CSS, not framer `initial`.** A server-rendered element with an
  inline `opacity: 0` is invisible until hydration finishes; on a heavy page that was
  a full second of blank screen (Niraj, 2026-09-25). A CSS keyframe plays on first
  paint without JS, and `motion-reduce` turns it off.
- The stat band and the activity calendar stay (both were right).
