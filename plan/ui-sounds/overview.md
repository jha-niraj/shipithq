# Interface sounds - overview

## What it is

Short, quiet synthesised sounds on interaction across every ShipItHQ app: a
tap on buttons, a rising or falling note on toggles, open and close on menus,
a two-note chime when a toast says done and a low one on an error. Brought in
by Niraj (2026-09-24) as `packages/ui/src/components/ui/sounds.tsx`, built on
`@web-kits/audio` (MIT, by Raphael Salaja, synthesised in the browser, no audio
files).

## Definition of done

1. Every app mounts the sound layer once. Sounds are for occasional moments
   only (Niraj, 2026-09-24): toasts, unmuting, and elements that opt in with
   `data-sound`. Clicks, toggles and menus are silent.
2. A speaker toggle in the sidebar footer mutes and unmutes; the choice is
   remembered per browser and shared across tabs.
3. A success toast plays the success chime and an error toast the error one;
   info, warning and loading are silent.
4. Nothing plays while muted, typing in a field is silent, and a disabled
   control plays the "blocked" tick.
5. It builds on our stack: our `cn`, our colour tokens, no `kobra` names.

## Out of scope

- Per-sound settings or a volume slider in the UI (the API supports a volume;
  no control is shown yet).
- Sounds in emails, the marketing site's static pages, or mobile haptics.

## Decisions (Niraj, 2026-09-24)

| Decision | Choice |
|---|---|
| Add the sounds | Yes, every app |
| Default | ON; the toggle mutes |
| Toasts | Success and error chime; nothing else |
| Clicks | Silent (revised 2026-09-24: too frequent for a sound) |
| Package | `@web-kits/audio` 0.2.x (early version: pinned, re-checked on upgrade) |
