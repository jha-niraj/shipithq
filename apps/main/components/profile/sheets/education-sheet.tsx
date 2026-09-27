"use client"

/**
 * Add or edit a school (plan/profile PRF-9). Replaces `add-education-sheet.tsx`.
 * `user_education` has no "current" column: studying there now is an empty end date.
 */

import { useEffect, useMemo, useState } from "react"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { MonthPicker } from "@repo/ui/components/ui/month-picker"
import toast from "@repo/ui/components/ui/sonner"
import { OptionSelect } from "@repo/ui/components/ui/option-select"
import { rememberOptions } from "@/actions/(common)/options/options.action"
import { useOptions } from "@/lib/use-options"
import {
    addUserEducation, deleteUserEducation, updateUserEducation,
} from "@/actions/(main)/user/profile.action"
import {
    Field, FieldGroup, ProfileSheet, fromMonthValue, toBullets, toMonthValue,
} from "./profile-sheet"

export interface EducationRow {
    id: string
    institution: string
    degree?: string | null
    startDate: Date | string
    endDate?: Date | string | null
    bulletPoints?: string[] | null
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    education?: EducationRow | null
    onSaved: () => void
}

/** "B.Tech, Computer Science" into its two parts, and back. A degree with no field stays whole. */
function splitDegree(v: string): { degree: string; field: string } {
    const i = v.indexOf(", ")
    return i < 0 ? { degree: v.trim(), field: "" } : { degree: v.slice(0, i).trim(), field: v.slice(i + 2).trim() }
}
const joinDegree = (degree: string, field: string) => [degree.trim(), field.trim()].filter(Boolean).join(", ")

type Form = { institution: string; degree: string; startDate: string; endDate: string; current: boolean; bullets: string }

const EMPTY: Form = { institution: "", degree: "", startDate: "", endDate: "", current: false, bullets: "" }

function fromRow(e: EducationRow): Form {
    return {
        institution: e.institution ?? "",
        degree: e.degree ?? "",
        startDate: toMonthValue(e.startDate),
        endDate: toMonthValue(e.endDate),
        current: !e.endDate,
        bullets: (e.bulletPoints ?? []).join("\n"),
    }
}

export function EducationSheet({ open, onOpenChange, education, onSaved }: Props) {
    const editing = !!education?.id
    const initial = useMemo(() => (education ? fromRow(education) : EMPTY), [education])
    const [form, setForm] = useState<Form>(initial)
    const [busy, setBusy] = useState(false)
    const [touched, setTouched] = useState(false)

    useEffect(() => {
        if (open) {
            setForm(initial)
            setTouched(false)
        }
    }, [open, initial])

    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)

    const start = fromMonthValue(form.startDate)
    const end = form.current ? null : fromMonthValue(form.endDate)
    const errors = {
        institution: !form.institution.trim() ? "Add the school or university" : null,
        startDate: !start ? "Pick the month you started" : null,
        endDate: start && end && end < start ? "Ends before it starts" : null,
    }
    const valid = !Object.values(errors).some(Boolean)
    const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

    const submit = async () => {
        setTouched(true)
        if (!valid || !start) return
        setBusy(true)
        const data = {
            institution: form.institution.trim(),
            degree: form.degree.trim() || undefined,
            startDate: start,
            bulletPoints: toBullets(form.bullets),
        }
        try {
            const res = editing
                ? await updateUserEducation(education!.id, { ...data, endDate: end })
                : await addUserEducation({ ...data, endDate: end ?? undefined })
            if (!res.success) {
                toast.error(res.message || "Could not save this school")
                return
            }
            toast.success(editing ? "Education updated" : "Education added")
            void rememberOptions([
                { kind: "university", values: [form.institution] },
                { kind: "degree", values: [splitDegree(form.degree).degree] },
                { kind: "field_of_study", values: [splitDegree(form.degree).field] },
            ])
            onOpenChange(false)
            onSaved()
        } catch (error: unknown) {
            console.error("Saving education failed:", error)
            toast.error("Could not save this school")
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        if (!education?.id) return
        setBusy(true)
        try {
            const res = await deleteUserEducation(education.id)
            if (!res.success) {
                toast.error(res.message || "Could not delete this school")
                return
            }
            toast.success("Education deleted")
            onOpenChange(false)
            onSaved()
        } catch (error: unknown) {
            console.error("Deleting education failed:", error)
            toast.error("Could not delete this school")
        } finally {
            setBusy(false)
        }
    }

    const options = useOptions(["university", "degree", "field_of_study"] as const)

    return (
        <ProfileSheet
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "Edit education" : "Add education"}
            description="Schools appear on your public profile and in resumes built from it."
            onSubmit={submit}
            submitLabel={editing ? "Save changes" : "Add education"}
            busyLabel={editing ? "Saving" : "Adding"}
            busy={busy}
            dirty={dirty}
            onDelete={editing ? remove : undefined}
            deleteWhat="this school"
        >
            <FieldGroup>
                <Field label="School or university" htmlFor="edu-school" required error={show("institution")}>
                    <OptionSelect id="edu-school" value={form.institution} onChange={(v) => set("institution", v)} options={options.university} placeholder="Pick one or type your own" />
                </Field>
                {/* Two choices, saved as one line ("B.Tech, Computer Science") as before (UF-2). */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Degree" htmlFor="edu-degree">
                        <OptionSelect id="edu-degree" value={splitDegree(form.degree).degree} onChange={(v) => set("degree", joinDegree(v, splitDegree(form.degree).field))} options={options.degree} placeholder="B.Tech, BCA, MBA..." />
                    </Field>
                    <Field label="Field of study" htmlFor="edu-field">
                        <OptionSelect id="edu-field" value={splitDegree(form.degree).field} onChange={(v) => set("degree", joinDegree(splitDegree(form.degree).degree, v))} options={options.field_of_study} placeholder="Computer Science..." />
                    </Field>
                </div>
            </FieldGroup>

            <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Started" required error={show("startDate")}>
                        <MonthPicker aria-label="Start month" placeholder="Month and year" value={form.startDate} onChange={(v) => set("startDate", v ?? "")} />
                    </Field>
                    <Field label="Finished" error={show("endDate")}>
                        <MonthPicker
                            aria-label="End month"
                            placeholder={form.current ? "Present" : "Month and year"}
                            disabled={form.current}
                            value={form.current ? "" : form.endDate}
                            onChange={(v) => set("endDate", v ?? "")}
                        />
                    </Field>
                </div>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                    <Checkbox className="cursor-pointer" checked={form.current} onCheckedChange={(c) => set("current", c === true)} />
                    I study here now
                </label>
            </FieldGroup>

            <FieldGroup>
                <Field label="Highlights" htmlFor="edu-bullets" hint="One per line: grades, coursework, clubs, awards.">
                    <Textarea
                        id="edu-bullets"
                        rows={4}
                        className="resize-none"
                        placeholder={"CGPA 8.6 / 10\nLead, campus coding club"}
                        value={form.bullets}
                        onChange={(e) => set("bullets", e.target.value)}
                    />
                </Field>
            </FieldGroup>
        </ProfileSheet>
    )
}
