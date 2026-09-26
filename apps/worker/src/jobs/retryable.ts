/**
 * A run that fails with one of these is worth another attempt: the request never
 * reached a decision, so retrying cannot duplicate anything the first attempt
 * did. Anything else (bad model output, a missing row, insufficient input) will
 * fail identically on a retry and is failed immediately instead.
 *
 * Its own file, with no Workers imports, so pure step logic (stepped-core.ts)
 * and its tests can use it; base.ts re-exports it for every existing job.
 */
export class RetryableError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "RetryableError"
	}
}
