/**
 * Which incidents have a hand-written Pathfinder path (content/incidents/paths.ts). A
 * separate list so the player can show "Adopt this path" without shipping every
 * path's notes to the browser. The seed checks the two agree.
 */
export const PATH_CASES: readonly string[] = ["the-demo-that-died-at-30-seconds", "the-login-that-said-yes-to-guessing", "the-export-that-finished-after-it-failed"]
