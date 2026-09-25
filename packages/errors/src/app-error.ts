import type { ErrorKind } from './kinds';
import { RETRYABLE_KINDS } from './kinds';
import { defaultMessage } from './messages';

/**
 * Throw this for a DELIBERATE domain failure so it classifies precisely instead
 * of falling through to `unknown`. Guards and actions throw `AppError`; the
 * catch/`fail()` boundary reads `kind`, `userMessage`, and `retryable` off it.
 *
 * `userMessage` is always safe to show to the user. Put sensitive detail (if
 * any) in `cause`, which stays in logs only.
 */
export class AppError extends Error {
    readonly kind: ErrorKind;
    readonly userMessage: string;
    readonly retryable: boolean;

    constructor(
        kind: ErrorKind,
        userMessage?: string,
        opts?: { retryable?: boolean; cause?: unknown },
    ) {
        const message = userMessage ?? defaultMessage(kind);
        super(message, opts?.cause !== undefined ? { cause: opts.cause } : undefined);
        this.name = 'AppError';
        this.kind = kind;
        this.userMessage = message;
        this.retryable = opts?.retryable ?? RETRYABLE_KINDS.has(kind);
    }
}

export function isAppError(err: unknown): err is AppError {
    return err instanceof AppError;
}

// ── Sugar constructors (readable throws at call sites) ──────────────────────────
export const errAuth = (m?: string) => new AppError('auth', m);
export const errForbidden = (m?: string) => new AppError('forbidden', m);
export const errNotFound = (m?: string) => new AppError('notfound', m);
export const errValidation = (m?: string) => new AppError('validation', m);
export const errConflict = (m?: string) => new AppError('conflict', m);
export const errRateLimit = (m?: string) => new AppError('ratelimit', m);
export const errNetwork = (m?: string) => new AppError('network', m);
