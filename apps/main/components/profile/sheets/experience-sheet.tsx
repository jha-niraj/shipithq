"use client"

/**
 * Add or edit a role (plan/profile PRF-9). Replaces `add-work-experience-sheet.tsx`,
 * whose edit mode existed but was never opened by anything.
 */

import { useEffect, useMemo, useState } from "react"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { MonthPicker } from "@repo/ui/components/ui/month-picker"
import toast from "@repo/ui/components/ui/sonner"
import {
    addWorkExperience, deleteWorkExperience, updateWorkExperience,
} from "@/actions/(main)/user/profile.action"
import {
    Field, FieldGroup, ProfileSheet, fromMonthValue, normalizeUrl, toBullets, toMonthValue,
} from "./profile-sheet"

export interface ExperienceRow {
    id: string
    companyName: string
    roleTitle: string
    companyWebsite?: string | null
    description?: string | null
    bulletPoints?: string[] | null
    startDate: Date | string
    endDate?: Date | string | null
    isCurrentlyWorking?: boolean | null
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Present = edit mode. */
    experience?: ExperienceRow | null
    onSaved: () => void
}

type Form = {
    companyName: string
    roleTitle: string
    companyWebsite: string
    startDate: string
    endDate: string
    current: boolean
    description: string
    bullets: string
}

const EMPTY: Form = {
    companyName: "", roleTitle: "", companyWebsite: "", startDate: "", endDate: "",
    current: false, description: "", bullets: "",
}

function fromRow(e: ExperienceRow): Form {
    return {
        companyName: e.companyName ?? "",
        roleTitle: e.roleTitle ?? "",
        companyWebsite: e.companyWebsite ?? "",
        startDate: toMonthValue(e.startDate),
        endDate: toMonthValue(e.endDate),
        current: !!e.isCurrentlyWorking,
        description: e.description ?? "",
        bullets: (e.bulletPoints ?? []).join("\n"),
    }
}

export function ExperienceSheet({ open, onOpenChange, experience, onSaved }: Props) {
    const editing = !!experience?.id
    const initial = useMemo(() => (experience ? fromRow(experience) : EMPTY), [experience])
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

    const website = normalizeUrl(form.companyWebsite)
    const start = fromMonthValue(form.startDate)
    const end = form.current ? null : fromMonthValue(form.endDate)
    const errors = {
        companyName: !form.companyName.trim() ? "Add the company name" : null,
        roleTitle: !form.roleTitle.trim() ? "Add your title" : null,
        startDate: !start ? "Pick the month you started" : null,
        endDate: start && end && end < start ? "Ends before it starts" : null,
        companyWebsite: website.error,
    }
    const valid = !Object.values(errors).some(Boolean)

    const submit = async () => {
        setTouched(true)
        if (!valid || !start) return
        setBusy(true)
        const data = {
            companyName: form.companyName.trim(),
            roleTitle: form.roleTitle.trim(),
            companyWebsite: website.url ?? undefined,
            description: form.description.trim() || undefined,
            bulletPoints: toBullets(form.bullets),
            startDate: start,
            isCurrentlyWorking: form.current,
        }
        try {
            const res = editing
                // `null` clears an old end date when the role becomes current.
                ? await updateWorkExperience(experience!.id, { ...data, endDate: end })
                : await addWorkExperience({ ...data, endDate: end ?? undefined })
            if (!res.success) {
                toast.error(res.message || "Could not save this role")
                return
            }
            toast.success(editing ? "Role updated" : "Role added")
            onOpenChange(false)
            onSaved()
        } catch (error: unknown) {
            console.error("Saving experience failed:", error)
            toast.error("Could not save this role")
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        if (!experience?.id) return
        setBusy(true)
        try {
            const res = await deleteWorkExperience(experience.id)
            if (!res.success) {
                toast.error(res.message || "Could not delete this role")
                return
            }
            toast.success("Role deleted")
            onOpenChange(false)
            onSaved()
        } catch (error: unknown) {
            console.error("Deleting experience failed:", error)
            toast.error("Could not delete this role")
        } finally {
            setBusy(false)
        }
    }

    const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

    return (
        <ProfileSheet
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "Edit role" : "Add a role"}
            description="Roles appear on your public profile and fill the experience section of resumes built from it."
            onSubmit={submit}
            submitLabel={editing ? "Save changes" : "Add role"}
            busyLabel={editing ? "Saving" : "Adding"}
            busy={busy}
            dirty={dirty}
            onDelete={editing ? remove : undefined}
            deleteWhat="this role"
        >
            <FieldGroup>
                <Field label="Title" htmlFor="exp-title" required error={show("roleTitle")}>
                    <Input id="exp-title" autoFocus placeholder="Software Engineer" value={form.roleTitle} onChange={(e) => set("roleTitle", e.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company" htmlFor="exp-company" required error={show("companyName")}>
                        <Input id="exp-company" placeholder="Acme" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                    </Field>
                    <Field label="Company website" htmlFor="exp-site" error={show("companyWebsite")}>
                        <Input id="exp-site" inputMode="url" placeholder="acme.com" value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} />
                    </Field>
                </div>
            </FieldGroup>

            <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Started" required error={show("startDate")}>
                        <MonthPicker aria-label="Start month" placeholder="Month and year" value={form.startDate} onChange={(v) => set("startDate", v ?? "")} />
                    </Field>
                    <Field label="Ended" error={show("endDate")}>
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
                    I work here now
                </label>
            </FieldGroup>

            <FieldGroup>
                <Field label="Summary" htmlFor="exp-desc" hint="One or two sentences about the role.">
                    <Textarea id="exp-desc" rows={3} className="resize-none" placeholder="Backend engineer on the payments team." value={form.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
                <Field label="Highlights" htmlFor="exp-bullets" hint="One per line. Lead with a verb and a number where you can.">
                    <Textarea
                        id="exp-bullets"
                        rows={5}
                        className="resize-none"
                        placeholder={"Cut p95 checkout latency by 40%\nLed a team of 5 across 3 releases"}
                        value={form.bullets}
                        onChange={(e) => set("bullets", e.target.value)}
                    />
                </Field>
            </FieldGroup>
        </ProfileSheet>
    )
}
