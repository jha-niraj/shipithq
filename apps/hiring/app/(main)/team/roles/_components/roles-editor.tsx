"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Lock, Plus, ShieldCheck, Trash2, Users } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Switch } from "@repo/ui/components/ui/switch"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@repo/ui/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { HIRING_PERMISSION_LABELS, type HiringPermission } from "@repo/db/hiring-permissions"
import {
    assignMemberRole, createCompanyRole, deleteCompanyRole, updateCompanyRole, type CompanyRoleView,
} from "@/actions/team/company-roles.action"

// ─────────────────────────────────────────────────────────────────────────────
// The roles editor (plan/hiring-app HA-7): the company's roles on the left, the
// selected one's name, permissions and members on the right. Built on the
// company_role table from HA-6; every change is checked again on the server.
// ─────────────────────────────────────────────────────────────────────────────

const GROUPS: { title: string; permissions: HiringPermission[] }[] = [
    { title: "Candidates", permissions: ["view_candidates", "message_candidates", "invite_decline"] },
    { title: "Hiring setup", permissions: ["manage_jobs", "manage_pipelines"] },
    { title: "Team", permissions: ["manage_team", "manage_roles"] },
    { title: "Company", permissions: ["edit_company", "billing", "delete_company"] },
    { title: "Insights and AI", permissions: ["view_analytics", "use_ai"] },
]

type Data = {
    roles: CompanyRoleView[]
    canManageRoles: boolean
    canManageTeam: boolean
    isOwner: boolean
    myRoleId: string | null
}

export function RolesEditor({ data }: { data: Data }) {
    const router = useRouter()
    const [selectedId, setSelectedId] = useState(data.roles[0]?.id ?? null)
    const selected = data.roles.find((r) => r.id === selectedId) ?? data.roles[0] ?? null
    const [draft, setDraft] = useState<{ name: string; permissions: HiringPermission[] } | null>(null)
    const [pending, startTransition] = useTransition()
    const [creating, setCreating] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const editable = Boolean(selected && !selected.isOwner && data.canManageRoles)
    const current = draft ?? (selected ? { name: selected.name, permissions: selected.permissions } : null)
    const dirty = Boolean(draft && selected && (draft.name !== selected.name || [...draft.permissions].sort().join() !== [...selected.permissions].sort().join()))

    const select = (id: string) => {
        setSelectedId(id)
        setDraft(null)
    }

    const toggle = (p: HiringPermission, on: boolean) => {
        if (!current) return
        const next = on ? [...new Set([...current.permissions, p])] : current.permissions.filter((x) => x !== p)
        setDraft({ name: current.name, permissions: next })
    }

    const save = () => {
        if (!selected || !draft) return
        startTransition(async () => {
            const r = await updateCompanyRole(selected.id, draft)
            if (!r.success) { toast.error(r.error); return }
            toast.success("Role saved")
            setDraft(null)
            router.refresh()
        })
    }

    const remove = () => {
        if (!selected) return
        startTransition(async () => {
            const r = await deleteCompanyRole(selected.id)
            setConfirmDelete(false)
            if (!r.success) { toast.error(r.error); return }
            toast.success(r.data.movedMembers ? `Role deleted; ${r.data.movedMembers} member(s) moved to Interviewer` : "Role deleted")
            setSelectedId(data.roles[0]?.id ?? null)
            setDraft(null)
            router.refresh()
        })
    }

    const reassign = (memberId: string, roleId: string) => {
        startTransition(async () => {
            const r = await assignMemberRole(memberId, roleId)
            if (!r.success) { toast.error(r.error); return }
            toast.success("Role changed")
            router.refresh()
        })
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Roles"
                subtitle="What each role in your company can do. The Owner role always has everything."
                actions={data.canManageRoles ? (
                    <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
                        <Plus className="h-4 w-4" /> New role
                    </Button>
                ) : undefined}
            />

            <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
                {/* The roles */}
                <nav aria-label="Roles" className="h-fit rounded-2xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                    {data.roles.map((role) => (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => select(role.id)}
                            aria-current={role.id === selected?.id ? "true" : undefined}
                            className={cn(
                                "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                                role.id === selected?.id
                                    ? "bg-neutral-100 dark:bg-neutral-800"
                                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                            )}
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                {role.isOwner ? <Lock className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">{role.name}</span>
                                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                                    {role.isOwner ? "Fixed" : role.presetKey ? "Starting role" : "Custom"} · {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                                </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                                <Users className="h-3.5 w-3.5" /> {role.members.length}
                            </span>
                        </button>
                    ))}
                </nav>

                {/* The selected role */}
                {selected && current && (
                    <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
                            <Input
                                value={current.name}
                                disabled={!editable}
                                maxLength={40}
                                onChange={(e) => setDraft({ name: e.target.value, permissions: current.permissions })}
                                aria-label="Role name"
                                className="h-9 max-w-xs font-medium"
                            />
                            {selected.isOwner && (
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">Every permission, always. It can't be edited or removed.</span>
                            )}
                            {!data.canManageRoles && !selected.isOwner && (
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">You can view roles; changing them needs &quot;Manage roles&quot;.</span>
                            )}
                            {editable && !selected.presetKey && (
                                <Button variant="ghost" size="sm" className="ml-auto gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => setConfirmDelete(true)}>
                                    <Trash2 className="h-4 w-4" /> Delete role
                                </Button>
                            )}
                        </div>

                        <div className="grid gap-x-8 gap-y-5 p-4 sm:grid-cols-2">
                            {GROUPS.map((group) => (
                                <fieldset key={group.title} className="space-y-2.5">
                                    <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{group.title}</legend>
                                    {group.permissions.map((p) => {
                                        const ownerOnly = p === "delete_company"
                                        const on = selected.isOwner || current.permissions.includes(p)
                                        return (
                                            <label key={p} className={cn("flex items-start justify-between gap-3", (!editable || ownerOnly) && "opacity-70")}>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-medium text-neutral-900 dark:text-white">{HIRING_PERMISSION_LABELS[p].label}</span>
                                                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">{HIRING_PERMISSION_LABELS[p].description}</span>
                                                </span>
                                                <Switch
                                                    checked={on}
                                                    disabled={!editable || ownerOnly}
                                                    onCheckedChange={(v: boolean) => toggle(p, v)}
                                                    aria-label={HIRING_PERMISSION_LABELS[p].label}
                                                />
                                            </label>
                                        )
                                    })}
                                </fieldset>
                            ))}
                        </div>

                        {/* Who has it */}
                        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
                            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">
                                Members with this role <span className="font-normal text-neutral-500">{selected.members.length}</span>
                            </h2>
                            {selected.members.length === 0 ? (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Nobody yet. Give a member this role from here or when inviting them.</p>
                            ) : (
                                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {selected.members.map((m) => (
                                        <li key={m.id} className="flex items-center gap-3 py-2">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                                                {m.image ? <img src={m.image} alt="" className="h-full w-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">{m.name}</span>
                                                <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{m.email}</span>
                                            </span>
                                            {data.canManageTeam && (
                                                <Select value={selected.id} onValueChange={(roleId: string) => reassign(m.id, roleId)} disabled={pending}>
                                                    <SelectTrigger size="sm" className="w-40" aria-label={`Role for ${m.name}`}>
                                                        <SelectValue>{selected.name}</SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {data.roles
                                                            .filter((r) => !r.isOwner || data.isOwner)
                                                            .map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {editable && (
                            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
                                <Button variant="ghost" size="sm" disabled={!dirty || pending} onClick={() => setDraft(null)}>Discard</Button>
                                <Button size="sm" disabled={!dirty || pending} onClick={save} className="gap-1.5">
                                    {pending && <InlineLoader size="sm" />} Save changes
                                </Button>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <NewRoleDialog
                open={creating}
                onOpenChange={setCreating}
                roles={data.roles.filter((r) => !r.isOwner)}
                onCreated={(id) => { setCreating(false); setSelectedId(id); setDraft(null); router.refresh() }}
            />

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &quot;{selected?.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {selected?.members.length
                                ? `Its ${selected.members.length} member(s) move to the Interviewer role.`
                                : "Nobody has this role."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={pending} onClick={(e) => { e.preventDefault(); remove() }}>
                            {pending && <InlineLoader size="sm" className="mr-1.5" />} Delete role
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function NewRoleDialog({ open, onOpenChange, roles, onCreated }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    roles: CompanyRoleView[]
    onCreated: (id: string) => void
}) {
    const [name, setName] = useState("")
    const [from, setFrom] = useState<string>("blank")
    const [pending, startTransition] = useTransition()
    const fromName = useMemo(() => roles.find((r) => r.id === from)?.name, [roles, from])

    const create = () => {
        startTransition(async () => {
            const r = await createCompanyRole({ name, fromRoleId: from === "blank" ? null : from })
            if (!r.success) { toast.error(r.error); return }
            toast.success("Role created")
            setName("")
            setFrom("blank")
            onCreated(r.data.id)
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New role</DialogTitle>
                    <DialogDescription>Name it, start from an existing role or from nothing, then choose its permissions.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Campus recruiter" aria-label="Role name" autoFocus />
                    <Select value={from} onValueChange={setFrom}>
                        <SelectTrigger aria-label="Start from">
                            <SelectValue>{from === "blank" ? "Start from nothing" : `Copy ${fromName}`}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="blank">Start from nothing</SelectItem>
                            {roles.map((r) => <SelectItem key={r.id} value={r.id}>Copy {r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
                    <Button onClick={create} disabled={!name.trim() || pending} className="gap-1.5">
                        {pending && <InlineLoader size="sm" />} Create role
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
