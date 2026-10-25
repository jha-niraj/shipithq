// kept for shipithq apps - Gurukul's toast API over ShipItHQ's own toast engine
import { toast } from './toast-gurukul';
import {
    ERROR_TITLES,
    failureKind,
    failureMessage,
    failureRetryable,
    type ActionFailure,
} from '@repo/errors';

/**
 * Show a failed ActionResult as a toast - the standard replacement for bare
 * `toast.error(res.error)`. Reads `kind`/`retryable` to pick an honest title and
 * to offer a Retry action only when a retry could actually help.
 *
 *   const res = await doThing();
 *   if (!res.success) { toastError(res, { onRetry: () => doThing() }); return; }
 *
 * Pass a stable `id` to dedupe a burst of identical failures into one toast.
 */
export function toastError(
    res: ActionFailure,
    opts?: { onRetry?: () => void; id?: string },
): void {
    const kind = failureKind(res);
    const retryable = failureRetryable(res);
    toast.error(ERROR_TITLES[kind], {
        description: failureMessage(res),
        id: opts?.id,
        action: retryable && opts?.onRetry
            ? { label: 'Retry', onClick: opts.onRetry }
            : undefined,
    });
}
