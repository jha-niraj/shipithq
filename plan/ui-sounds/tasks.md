# Interface sounds - tasks

| ID | Task | Status |
|---|---|---|
| US-1 | Adapt `sounds.tsx` to our stack and install the package | **done 2026-09-24** |
| US-2 | Mount in all five apps, with the toggle in the sidebar footer | **done 2026-09-24** |
| US-3 | Toast chimes on success and error | **done 2026-09-24** |

## US-1 Adapt `sounds.tsx`
- [x] Done 2026-09-24: `@web-kits/audio@0.2.0` installed in packages/ui; relative `cn`; `shipithq-sound-*` keys with guarded storage; neutral toggle colours; the speaker's slash/waves animated in globals.css (reduced motion honoured). `tsc` clean in packages/ui and all five apps.
**Why.** It imports `@/lib/utils`, a `text-shell-fg-*` token and CSS classes
(`sound-slash`, `sound-wave`) that do not exist here, and names its storage
`kobra-*`.
**Files.** `packages/ui/src/components/ui/sounds.tsx`, `packages/ui/package.json`,
`packages/ui/src/styles/globals.css` (the icon's CSS).
**Steps.** Install `@web-kits/audio` in `packages/ui`; relative `cn`; neutral
tokens; `shipithq-sound-*` keys; the speaker icon's mute slash and waves
animated in CSS, respecting reduced motion; localStorage access guarded.
**Edge cases.** Server render (no `window`); private windows where storage
throws; the audio context only starts after a user gesture (browsers block it
before).
**Done when.** `tsc` clean in `packages/ui`; the package resolves in a Next
build graph (typecheck of apps/main).

## US-2 Mount everywhere
- [x] Done 2026-09-24: `<SoundEffects />` beside the toaster in all five root layouts; `<SoundToggle />` beside the theme switch in the main sidebar footer and the web, hiring and uni navbars (admin has no theme switch to sit beside). Verified in a real page by counting Web Audio oscillators: a click started them, muting stopped them, the mute survived a reload, unmuting played the swoosh, typing stayed silent.
**Files.** `apps/{main,web,admin,uni,hiring}/app/layout.tsx`, the sidebar
footer (`apps/main/components/navigation/sidebar.tsx` and the other apps'
equivalents where they have one).
**Done when.** In a real page: clicking a button plays (audio context running,
a sound scheduled), the toggle mutes and the next click is silent, reload keeps
the choice.

## US-3 Toast chimes
- [x] Done 2026-09-24: the sound layer listens for `TOAST_EVENT`; verified success 2 oscillators, error 2, info 0, and 0 while muted.
**Files.** `packages/ui/src/components/ui/toast.tsx`, `sounds.tsx`.
**Steps.** The sound layer listens for the toast event and plays `success` /
`error` for those states only, respecting mute.
**Done when.** A success toast and an error toast each schedule their sound;
info and a loading toast schedule none; muted, none.
