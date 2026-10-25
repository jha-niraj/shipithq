/**
 * Gurukul's `toast.*` API, drawn by ShipItHQ's own toast engine (`./toast`, `showToast` /
 * `dismissToast` / `<Toasts />`) - kept for shipithq apps.
 *
 * ShipItHQ keeps its toast system and sounds (decided 2026-10-25). Components copied from Gurukul's
 * base UI (e.g. `toast-error.tsx`) call Gurukul's shape - `toast.error(title, { description, id,
 * action: { label, onClick } })`, plus `progress`, `undo`, `rich`, `promise` - so this file maps that
 * shape onto `showToast`. App code keeps using `./sonner` (`toast`, `<Toaster />`) unchanged.
 *
 * What the ShipItHQ engine cannot draw degrades to text: a progress bar becomes "<message> (42%)",
 * a rich toast's avatar is dropped and only its accept button is offered, `cancel` and `icon` are ignored.
 */
import { dismissToast, showToast, type ToastState } from './toast'

export type ToastKind =
    | 'success'
    | 'error'
    | 'info'
    | 'warning'
    | 'message'
    | 'loading'
    | 'progress'
    | 'undo'
    | 'rich'

export interface ToastButton {
    label: string
    onClick: () => void
}

export interface ToastOptions {
    description?: string
    /** Milliseconds. `Infinity` = stays until closed. */
    duration?: number
    /** A stable key - a second toast with the same id replaces the first in place. */
    id?: string
    action?: ToastButton
    /** Accepted for Gurukul call compatibility; the ShipItHQ engine has one button only. */
    cancel?: { label: string; onClick?: () => void }
    /** Accepted for Gurukul call compatibility; the ShipItHQ engine picks its icon by state. */
    icon?: unknown
}

export interface ProgressToastOptions extends Omit<ToastOptions, 'duration'> {
    /** 0-100. Clamped. */
    value: number
}

export interface UndoToastOptions {
    description?: string
    id?: string
    onUndo: () => void
    /** Milliseconds. Default 8000. */
    duration?: number
    /** Button text. Default "Undo". */
    label?: string
}

export interface RichToastOptions {
    description?: string
    id?: string
    duration?: number
    avatar?: { name: string; src?: string | null }
    accept?: { label?: string; onClick: () => void }
    decline?: { label?: string; onClick?: () => void }
}

export interface PromiseToastMessages<T> {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((err: unknown) => string)
    description?: string
    id?: string
}

const STATE: Record<ToastKind, ToastState | undefined> = {
    success: 'success',
    error: 'error',
    info: 'info',
    warning: 'warning',
    message: undefined,
    loading: 'pending',
    progress: 'pending',
    undo: undefined,
    rich: 'info',
}

/** A day stands in for "until closed" - the engine takes a finite lifetime. */
const UNTIL_CLOSED = 24 * 60 * 60 * 1000

function lifetime(duration: number | undefined): number | undefined {
    if (duration === undefined) return undefined
    return Number.isFinite(duration) ? duration : UNTIL_CLOSED
}

function push(kind: ToastKind, message: string | undefined, opts: ToastOptions = {}): string {
    return showToast({
        id: opts.id,
        message: message ?? (kind === 'error' ? 'Something went wrong' : ''),
        description: opts.description,
        state: STATE[kind],
        action: opts.action ? { label: opts.action.label, run: opts.action.onClick } : undefined,
        lifetime: lifetime(opts.duration),
    })
}

function isFailedResult(v: unknown): v is { success: false; error?: unknown } {
    return typeof v === 'object' && v !== null && (v as { success?: unknown }).success === false
}

function promiseToast<T>(p: Promise<T> | (() => Promise<T>), m: PromiseToastMessages<T>): Promise<T> {
    const run = typeof p === 'function' ? p() : p
    const id = push('loading', m.loading, { id: m.id, description: m.description })
    const fail = (err: unknown) => {
        const reason =
            isFailedResult(err) && typeof err.error === 'string'
                ? err.error
                : err instanceof Error
                  ? err.message
                  : undefined
        if (typeof m.error === 'function') push('error', m.error(err), { id })
        else push('error', m.error, { id, description: reason })
    }
    run.then((data) => {
        if (isFailedResult(data)) return fail(data)
        push('success', typeof m.success === 'function' ? m.success(data) : m.success, { id })
    }, fail)
    return run
}

export const toast = {
    success: (message: string | undefined, opts?: ToastOptions) => push('success', message, opts),
    error: (message: string | undefined, opts?: ToastOptions) => push('error', message, opts),
    info: (message: string | undefined, opts?: ToastOptions) => push('info', message, opts),
    warning: (message: string | undefined, opts?: ToastOptions) => push('warning', message, opts),
    message: (message: string | undefined, opts?: ToastOptions) => push('message', message, opts),
    loading: (message: string | undefined, opts?: ToastOptions) => push('loading', message, opts),
    progress: (message: string | undefined, opts: ProgressToastOptions) => {
        const value = Math.max(0, Math.min(100, opts.value))
        return push(value >= 100 ? 'success' : 'progress', `${message ?? ''} (${Math.round(value)}%)`.trim(), opts)
    },
    promise: promiseToast,
    undo: (message: string | undefined, opts: UndoToastOptions) =>
        push('undo', message, {
            id: opts.id,
            description: opts.description,
            duration: opts.duration ?? 8000,
            action: { label: opts.label ?? 'Undo', onClick: opts.onUndo },
        }),
    rich: (title: string | undefined, opts: RichToastOptions) =>
        push('rich', title, {
            id: opts.id,
            description: opts.description,
            duration: opts.duration,
            action: opts.accept ? { label: opts.accept.label ?? 'Accept', onClick: opts.accept.onClick } : undefined,
        }),
    dismiss: (id?: string) => dismissToast(id),
}

export default toast
