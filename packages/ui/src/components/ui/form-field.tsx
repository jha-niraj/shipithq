'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Label } from './label';

/**
 * A labelled form field that can show its own error.
 *
 * Pairs with `useFormErrors` (`@repo/ui/hooks/use-form-errors`). Every app already has a local
 * `Field` helper - usually a `<div className="space-y-1.5">` with a `<Label>` - and none of them
 * had anywhere to put an error, which is why validation ended up in toasts. This is that helper
 * with the missing third slot.
 *
 * ```tsx
 * <Field label="First name" required error={errors.firstName} {...register('firstName')}>
 *     <Input value={v} onChange={...} />
 * </Field>
 * ```
 *
 * ## What it does with the error
 *
 * - Renders the message under the control, in `rose` (the palette's error hue - never `red`, per
 *   the root `CLAUDE.md` colour rule).
 * - Marks the wrapper `data-invalid`, so a control inside can restyle itself without every call
 *   site threading an `error` prop into the input as well:
 *   `[&[data-invalid=true]_input]:border-rose-400`.
 * - Wires `aria-describedby` / `role="alert"`, so the message is announced rather than only seen.
 *   A sighted user gets the red; a screen-reader user gets nothing at all without this.
 *
 * The `ref` is what `register()` attaches to, and it is on the WRAPPER rather than the control on
 * purpose: scrolling to the label rather than the input means the person can see what the field is
 * called, not just the box they have to fill in.
 */
export interface FieldProps {
    /**
     * From `register(key)`. Fires when any control inside changes, clearing that field's error.
     * Spread rather than passed by name, so `{...register('x')}` supplies both this and the ref.
     */
    onChangeCapture?: () => void;
    label?: React.ReactNode;
    /** Renders the required asterisk. Does NOT itself validate - the form owns that. */
    required?: boolean;
    /** Message to show. Falsy renders nothing and leaves no gap. */
    error?: string | null | false;
    /** Helper text under the control. Hidden while an error is showing - one message at a time. */
    hint?: React.ReactNode;
    /**
     * The control's current value, for controls that do NOT emit a bubbling `change` event.
     *
     * `onChangeCapture` covers `<input>`, `<textarea>` and anything else backed by a real DOM
     * control. It does NOT cover a Radix `Select` outside a `<form>` - Radix only renders its
     * hidden native select when the trigger has a form ancestor
     * (`isFormControl = !!trigger.closest('form')`), and these sheets are plain `<div>`s - nor a
     * popover date picker, whose calendar lives in a portal outside this wrapper entirely.
     *
     * Pass the value and the error clears when it changes. Keep it a PRIMITIVE: a fresh array or
     * object every render is never `Object.is`-equal, so the error would clear on any re-render.
     */
    value?: string | number | boolean | null;
    className?: string;
    labelClassName?: string;
    /**
     * Overrides the error line's colour. Only for a surface that is dark in BOTH themes - a
     * marketing hero, say - where the default `rose-600 / dark:rose-400` pair resolves to the
     * light-mode value against a near-black panel. Do not use it to restyle ordinary forms.
     */
    errorClassName?: string;
    htmlFor?: string;
    children: React.ReactNode;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(
    { label, required, error, hint, className, labelClassName, errorClassName, htmlFor, onChangeCapture, value, children },
    ref,
) {
    const reactId = React.useId();
    const errorId = `${reactId}-error`;
    const hintId = `${reactId}-hint`;
    const invalid = Boolean(error);

    // Clear the error when a non-DOM control's value changes. `onChangeCapture` is a new closure
    // every render, so the guard is the value comparison rather than the dependency list.
    const previousValue = React.useRef(value);
    React.useEffect(() => {
        if (Object.is(previousValue.current, value)) return;
        previousValue.current = value;
        onChangeCapture?.();
    }, [value, onChangeCapture]);

    return (
        <div
            ref={ref}
            data-invalid={invalid}
            // `scroll-mt-24` so that when `focusField` brings this into view it does not end up
            // flush against a sticky header. Harmless when there is no sticky header.
            className={cn('scroll-mt-24 space-y-1.5', className)}
        >
            {label && (
                <Label htmlFor={htmlFor} className={cn('text-sm', labelClassName)}>
                    {label}
                    {required && <span className="ml-0.5 text-rose-500">*</span>}
                </Label>
            )}

            {/* `onChangeCapture` here catches change events bubbling from whatever control is
                inside - input, textarea, Radix Select, date picker - so the red clears as the user
                fixes the field without any control having to opt in. */}
            <div
                aria-describedby={invalid ? errorId : hint ? hintId : undefined}
                aria-invalid={invalid || undefined}
                onChangeCapture={onChangeCapture}
            >
                {children}
            </div>

            {/* One message at a time: an error replaces the hint rather than stacking under it, so
                the field never grows by two lines and the important line is the one that is left. */}
            {invalid ? (
                <p id={errorId} role="alert" className={cn('text-xs text-rose-600 dark:text-rose-400', errorClassName)}>
                    {error}
                </p>
            ) : hint ? (
                <p id={hintId} className="text-xs text-neutral-500 dark:text-neutral-400">
                    {hint}
                </p>
            ) : null}
        </div>
    );
});
