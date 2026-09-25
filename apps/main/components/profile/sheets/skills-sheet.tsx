"use client"

/**
 * Manage skills (plan/profile PRF-9). Replaces `add-skills-sheet.tsx`.
 *
 * Saves as you go. The old sheet queued new skills and saved them on a second
 * button, closing the sheet first and reporting failure in a toast. A skill is one
 * small row; adding, re-levelling and removing each save immediately, and the
 * footer is a single "Done".
 */

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import toast from "@repo/ui/components/ui/sonner"
import { deleteSkill, updateUserSkills } from "@/actions/(main)/user/user.action"
import {
    SKILL_CATEGORIES, SKILL_LEVELS, skillCategoryLabel, skillLevelLabel, type SkillCategory,
} from "@/lib/profile/labels"
import type { UserSkill } from "@/types/user"
import { Field, FieldGroup, ProfileSheet } from "./profile-sheet"

export interface SkillRow {
    id: string
    name: string
    level: string
    category: string
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    skills: SkillRow[]
    onSaved: () => void
}

export function SkillsSheet({ open, onOpenChange, skills: initialSkills, onSaved }: Props) {
    const [skills, setSkills] = useState<SkillRow[]>(initialSkills)
    const [name, setName] = useState("")
    const [category, setCategory] = useState<SkillCategory>("LANGUAGES")
    const [level, setLevel] = useState<string>("intermediate")
    const [adding, setAdding] = useState(false)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [changed, setChanged] = useState(false)

    useEffect(() => {
        if (open) {
            setSkills(initialSkills)
            setName("")
            setChanged(false)
        }
    }, [open, initialSkills])

    // Refresh the page behind the sheet once, when it closes, rather than per edit.
    const close = (next: boolean) => {
        onOpenChange(next)
        if (!next && changed) onSaved()
    }

    const duplicate = skills.some((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase())

    const add = async () => {
        const n = name.trim()
        if (!n || duplicate || adding) return
        setAdding(true)
        try {
            const saved = await updateUserSkills([{ name: n, category, level } as UserSkill])
            setSkills(saved.map((s) => ({ id: s.id!, name: s.name, level: String(s.level), category: s.category ?? "FRONTEND" })))
            setName("")
            setChanged(true)
        } catch (error: unknown) {
            console.error("Adding skill failed:", error)
            toast.error(`Could not add "${n}"`)
        } finally {
            setAdding(false)
        }
    }

    const relevel = async (s: SkillRow, next: string) => {
        if (next === s.level) return
        setPendingId(s.id)
        const before = skills
        setSkills((list) => list.map((x) => (x.id === s.id ? { ...x, level: next } : x)))
        try {
            await updateUserSkills([{ id: s.id, name: s.name, category: s.category, level: next } as UserSkill])
            setChanged(true)
        } catch (error: unknown) {
            console.error("Updating skill failed:", error)
            setSkills(before)
            toast.error(`Could not update "${s.name}"`)
        } finally {
            setPendingId(null)
        }
    }

    const remove = async (s: SkillRow) => {
        setPendingId(s.id)
        try {
            await deleteSkill(s.id)
            setSkills((list) => list.filter((x) => x.id !== s.id))
            setChanged(true)
        } catch (error: unknown) {
            console.error("Deleting skill failed:", error)
            toast.error(`Could not remove "${s.name}"`)
        } finally {
            setPendingId(null)
        }
    }

    const grouped = useMemo(() => {
        const order = new Map<string, number>(SKILL_CATEGORIES.map((c, i) => [c, i]))
        const groups = new Map<string, SkillRow[]>()
        for (const s of [...skills].sort((a, b) => a.name.localeCompare(b.name))) {
            groups.set(s.category, [...(groups.get(s.category) ?? []), s])
        }
        return [...groups.entries()].sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99))
    }, [skills])

    return (
        <ProfileSheet
            open={open}
            onOpenChange={close}
            title="Skills"
            description="What you work with. Grouped by category on your public profile and in your resumes."
            closeLabel="Done"
        >
            <FieldGroup title="Add a skill">
                <div
                    // Name on its own line: in a 512px sheet, a four-column row left the
                    // name field about 80px wide, too narrow to read what you typed.
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"
                    onKeyDown={(e) => {
                        // Enter adds the skill instead of submitting the sheet's form.
                        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
                            e.preventDefault()
                            void add()
                        }
                    }}
                >
                    <Input aria-label="Skill" autoFocus placeholder="TypeScript" className="col-span-3" value={name} onChange={(e) => setName(e.target.value)} />
                    <Select value={category} onValueChange={(v) => setCategory(v as SkillCategory)}>
                        <SelectTrigger aria-label="Category" className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {SKILL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{skillCategoryLabel(c)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger aria-label="Level" className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {SKILL_LEVELS.map((l) => <SelectItem key={l} value={l}>{skillLevelLabel(l)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button type="button" onClick={add} disabled={!name.trim() || duplicate || adding} className="min-w-16 cursor-pointer">
                        {adding ? <InlineLoader size="sm" /> : "Add"}
                    </Button>
                </div>
                {duplicate && name.trim() && (
                    <p className="-mt-2 text-xs text-neutral-500 dark:text-neutral-400">&ldquo;{name.trim()}&rdquo; is already on your list.</p>
                )}
            </FieldGroup>

            <FieldGroup title={`Your skills${skills.length ? ` (${skills.length})` : ""}`}>
                {skills.length === 0 ? (
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400">No skills yet. Add the languages and tools you use most.</p>
                ) : (
                    <div className="space-y-5">
                        {grouped.map(([cat, list]) => (
                            <Field key={cat} label={skillCategoryLabel(cat)}>
                                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                                    {list.map((s) => (
                                        <li key={s.id} className="flex items-center gap-2 py-1 pl-3 pr-1">
                                            <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-900 dark:text-neutral-100">{s.name}</span>
                                            {pendingId === s.id && <InlineLoader size="sm" />}
                                            <Select value={s.level.toLowerCase()} onValueChange={(v) => relevel(s, v)} disabled={pendingId === s.id}>
                                                <SelectTrigger aria-label={`${s.name} level`} className="h-7 w-32 cursor-pointer border-transparent text-xs shadow-none hover:border-neutral-200 dark:hover:border-neutral-700">
                                                    <SelectValue placeholder={skillLevelLabel(s.level)} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SKILL_LEVELS.map((l) => <SelectItem key={l} value={l}>{skillLevelLabel(l)}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Remove ${s.name}`}
                                                title={`Remove ${s.name}`}
                                                disabled={pendingId === s.id}
                                                onClick={() => remove(s)}
                                                className="size-7 cursor-pointer text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                            >
                                                <X className="size-3.5" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </Field>
                        ))}
                    </div>
                )}
            </FieldGroup>
        </ProfileSheet>
    )
}
