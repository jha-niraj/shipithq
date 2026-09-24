"use client"

import type { ReactNode } from "react"
import { dismissToast, showToast, Toasts, type ToastPosition, type ToastState } from "./toast"

/**
 * The app-wide toast API, unchanged for every caller: `toast.success(...)`,
 * `toast.error(...)`, `toast.info/warning/loading/message(...)`,
 * `toast.dismiss(id?)`, `toast.promise(...)`, and `<Toaster />` mounted once in
 * each app's layout.
 *
 * Since 2026-09-24 it draws ShipItHQ's own toasts (`./toast`, the pill stack
 * Niraj chose) instead of sonner's; this file only translates sonner's calls,
 * so the ~750 call sites across the five apps did not change. Position is top
 * right, as before (Niraj, 2026-09-24).
 *
 * The pattern `const id = toast.loading("Saving..."); ...; toast.success("Saved", { id })`
 * turns one pill from pending into done in place, which is what the new
 * surface animates.
 */

type Id = string | number

export interface ToastOptions {
    /** Update an existing toast instead of adding one. */
    id?: Id
    description?: ReactNode
    /** Milliseconds. `Infinity` keeps it until dismissed. */
    duration?: number
    action?: { label: ReactNode; onClick: (event?: unknown) => void }
}

type Message = ReactNode | Error | undefined | null

const text = (value: Message | ReactNode): string => {
    if (value === undefined || value === null || value === false) return ""
    if (value instanceof Error) return value.message
    if (typeof value === "string" || typeof value === "number") return String(value)
    return String(value)
}

function show(state: ToastState | undefined, message: Message, options: ToastOptions = {}): Id {
    const description = text(options.description) || undefined
    return showToast({
        id: options.id === undefined ? undefined : String(options.id),
        message: text(message) || (state === "error" ? "Something went wrong" : ""),
        description,
        state,
        lifetime: options.duration === undefined ? undefined : options.duration === Infinity ? 24 * 60 * 60 * 1000 : options.duration,
        action: options.action ? { label: text(options.action.label), run: () => options.action!.onClick() } : undefined,
    })
}

type PromiseMessages<T> = {
    loading: Message
    success: Message | ((value: T) => Message)
    error: Message | ((error: unknown) => Message)
}

const base = (message: Message, options?: ToastOptions) => show(undefined, message, options)

export const toast = Object.assign(base, {
    success: (message: Message, options?: ToastOptions) => show("success", message, options),
    error: (message: Message, options?: ToastOptions) => show("error", message, options),
    info: (message: Message, options?: ToastOptions) => show("info", message, options),
    warning: (message: Message, options?: ToastOptions) => show("warning", message, options),
    loading: (message: Message, options?: ToastOptions) => show("pending", message, options),
    message: (message: Message, options?: ToastOptions) => show(undefined, message, options),
    dismiss: (id?: Id) => dismissToast(id === undefined ? undefined : String(id)),
    promise<T>(promise: Promise<T> | (() => Promise<T>), messages: PromiseMessages<T>, options?: ToastOptions): Id {
        const id = show("pending", messages.loading, options)
        const run = typeof promise === "function" ? promise() : promise
        run.then(
            (value) => show("success", typeof messages.success === "function" ? messages.success(value) : messages.success, { ...options, id }),
            (error: unknown) => show("error", typeof messages.error === "function" ? messages.error(error) : messages.error, { ...options, id }),
        )
        return id
    },
})

/** Mount once per app, in the root layout. */
function Toaster({ position = "top-right" }: { position?: ToastPosition }) {
    return <Toasts position={position} />
}

export { Toaster }
export default toast
