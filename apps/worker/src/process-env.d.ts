// @repo/email reads `process.env` for its defaults. The worker passes its own values
// instead (see jobs/progress-reports.ts), but the package still has to type-check here,
// where the node types are not loaded. `nodejs_compat` provides `process` at runtime.
declare const process: { env: Record<string, string | undefined> }
