'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Field-level form errors: collect every failure, scroll to the first one, show it AT the field.
 *
 * ## The problem this exists to fix
 *
 * Long forms across this app validate like this:
 *
 * ```ts
 * if (!form.firstName.trim()) { toast.error('First name is required'); return false }
 * if (!form.lastName.trim())  { toast.error('Last name is required');  return false }
 * ```
 *
 * Three separate faults, and the third is the one that actually hurts:
 *
 * 1. **It stops at the first failure.** Fill that one in, press Next, get told about the second.
 *    A form with five gaps takes five round trips to discover them.
 * 2. **The message is nowhere near the field.** A toast in the corner names a field that may be a
 *    thousand pixels above the fold, and the toast is gone in four seconds.
 * 3. **It does not move you to the problem.** On a scrolling sheet, "First name is required" can
 *    refer to a control that is not on screen and gives no way to reach it.
 *
 * So: validate everything, put the message under the field, and take the person to the first one.
 *
 * ## Toasts are not banned - they are for a different thing
 *
 * A toast is right for the OUTCOME of a submit ("Student added", "Could not save - try again"). It
 * is wrong for the STATE of a field, which has a place on screen to live.
 *
 * ## Usage
 *
 * ```tsx
 * const { errors, validate, register, clearError } = useFormErrors<'firstName' | 'rollNumber'>()
 *
 * const onNext = () => {
 *     const ok = validate({
 *         firstName:  !form.firstName.trim() && 'First name is required',
 *         rollNumber: !form.rollNumber      && 'Roll number is required',
 *     })
 *     if (!ok) return
 *     setStep(s => s + 1)
 * }
 *
 * <Field label="First name" required error={errors.firstName} {...register('firstName')}>
 *     <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
 * </Field>
 * ```
 *
 * The spread carries both the scroll ref and a change handler, so the red clears as the user fixes
 * the field with nothing extra at the call site. `clearError` is still exported for the rare
 * control that does not emit a bubbling change event.
 */

export type FormErrors<K extends string> = Partial<Record<K, string>>;

/**
 * What `validate` accepts: a message when the field is INVALID, or a falsy value when it is fine.
 *
 * `false | undefined | null | ''` all mean valid, which lets a check read as
 * `!value.trim() && 'Required'` - the natural way to write it, and short-circuiting to `false` when
 * the value is present.
 */
export type ValidationMap<K extends string> = Partial<Record<K, string | false | null | undefined>>;

export interface UseFormErrors<K extends string> {
    errors: FormErrors<K>;
    /** True when any field currently has an error. */
    hasErrors: boolean;
    /**
     * Check every entry, store all failures, then scroll to and focus the first one.
     * Returns true when everything passed.
     */
    validate: (checks: ValidationMap<K>) => boolean;
    /**
     * Spread onto a `Field`. Gives it the ref to scroll to, AND an change-capture handler that
     * clears this field's error as soon as the user edits it - so no call site has to remember to
     * call `clearError`.
     */
    register: (key: K) => {
        ref: (el: HTMLElement | null) => void;
        onChangeCapture: () => void;
    };
    /** Drop one field's error - call as the user edits it, so the red clears while they type. */
    clearError: (key: K) => void;
    /** Drop everything - on close, on reset, on step change. */
    clearErrors: () => void;
    /** Set errors directly, e.g. from a server response that reports per-field problems. */
    setErrors: (errors: FormErrors<K>) => void;
    /** Scroll to a specific field. Rarely needed; `validate` already does it. */
    focusField: (key: K) => void;
}

export function useFormErrors<K extends string = string>(): UseFormErrors<K> {
    const [errors, setErrorState] = useState<FormErrors<K>>({});
    const nodes = useRef(new Map<K, HTMLElement>());

    /**
     * The ORDER fields were registered in, which is the order they appear in the form.
     *
     * `Object.keys` on the checks object is close to this but not guaranteed to be it - a caller
     * can list checks in any order, and "first error" has to mean first ON SCREEN or the scroll
     * takes you to the wrong place. Registration happens during render, top to bottom.
     */
    const order = useRef<K[]>([]);

    const register = useCallback((key: K) => ({
        ref: (el: HTMLElement | null) => {
            if (el) {
                nodes.current.set(key, el);
                if (!order.current.includes(key)) order.current.push(key);
            } else {
                nodes.current.delete(key);
            }
        },
        /**
         * Clears this field's error the moment its control changes.
         *
         * `onChangeCapture` on the WRAPPER rather than `onChange` on each control: change events
         * bubble, so one handler on the field covers an `<input>`, a `<textarea>`, a Radix Select
         * and a date picker without any of them knowing it exists. The alternative - calling
         * `clearError` from every `onChange` - is a change to hundreds of call sites across the
         * app, and one that is silently forgotten the next time a field is added.
         */
        onChangeCapture: () => clearErrorRef.current(key),
    }), []);

    const focusField = useCallback((key: K) => {
        const el = nodes.current.get(key);
        if (!el) return;

        // `block: 'center'` rather than the default `start`: a field scrolled to the very top of a
        // sheet sits under the sticky header on some of these screens, so the thing you were sent
        // to look at is the one thing covered up.
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Focus the control INSIDE the wrapper, not the wrapper. Done on a timeout because
        // `focus()` during a smooth scroll cancels it in Chrome - the browser jumps straight to the
        // element and the movement that tells the user where they have been taken is lost.
        window.setTimeout(() => {
            const control = el.querySelector<HTMLElement>(
                'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="combobox"], button',
            );
            control?.focus({ preventScroll: true });
        }, 350);
    }, []);

    const validate = useCallback((checks: ValidationMap<K>): boolean => {
        const found: FormErrors<K> = {};
        for (const [key, message] of Object.entries(checks) as Array<[K, string | false | null | undefined]>) {
            if (message) found[key] = message;
        }

        setErrorState(found);

        const failed = Object.keys(found) as K[];
        if (failed.length === 0) return true;

        // First in FORM order, falling back to the order the checks were listed in for a field that
        // has not registered a node (a control that is conditionally rendered, or on another step).
        const first = order.current.find((k) => failed.includes(k)) ?? failed[0]!;
        focusField(first);
        return false;
    }, [focusField]);

    // Held in a ref so `register` can stay referentially stable - a `register` that changes every
    // render would re-run the ref callback on every field on every keystroke.
    const clearErrorRef = useRef<(key: K) => void>(() => {});

    const clearError = useCallback((key: K) => {
        setErrorState((prev) => {
            if (!(key in prev)) return prev;   // no error here - do not re-render for nothing
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    clearErrorRef.current = clearError;

    const clearErrors = useCallback(() => setErrorState({}), []);

    return {
        errors,
        hasErrors: Object.keys(errors).length > 0,
        validate,
        register,
        clearError,
        clearErrors,
        setErrors: setErrorState,
        focusField,
    };
}
