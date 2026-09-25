/**
 * @repo/errors - the single source of truth for error handling across every app.
 *
 * Pure TypeScript, zero runtime dependencies, no React / DOM / Node-only APIs,
 * so it runs identically in the Next server, the Next client, React Native, and
 * Cloudflare Workers. See srs/error-handling/error-playbook.md for the full spec.
 */

// Kinds + status mapping
export type { ErrorKind } from './kinds';
export { ERROR_KINDS, RETRYABLE_KINDS, kindToHttpStatus } from './kinds';

// The one response type
export type { ActionResult, ActionOk, ActionFailure } from './result';
export { isFailure, failureKind, failureRetryable, failureMessage } from './result';

// Classification brain
export type { ClassifiedError } from './classify';
export { classifyError, isTransient } from './classify';

// Deliberate domain errors
export { AppError, isAppError } from './app-error';
export {
    errAuth, errForbidden, errNotFound, errValidation,
    errConflict, errRateLimit, errNetwork,
} from './app-error';

// Result builders
export { ok, fail, failWith } from './helpers';

// User-facing copy (i18n-ready)
export { ERROR_TITLES, ERROR_MESSAGES, defaultMessage } from './messages';

// HTTP envelope (route handlers, worker, public-api)
export { toHttpError, errorResponse } from './http';

// Next.js control-flow guard
export { isNextControlFlow } from './next';
