"use client"

/**
 * Edit Profile (plan/profile PRF-10). Replaces `modals/edit-profile-modal.tsx`.
 *
 * Niraj, 2026-09-25: "the worst of all of them". What was wrong, and what this does:
 * - The tabs overrode the base `Tabs` into an underline bar, with `bg-transparent`
 *   and `bg-background` on one element. These are the base tabs, props only.
 * - The avatar fell back to `/default-avatar.png`, which does not exist, so a user
 *   with no photo saw a broken image. Initials now.
 * - The camera button was `toast.info("coming soon")` while the page behind the
 *   sheet could already upload. It uses the page's own upload.
 * - `company` and `occupation` were in the form with no inputs; `theme` was sent
 *   from dead constants. Every field in the form now has an input and nothing else
 *   is sent.
 * - There was nowhere to make the profile private, now that it is public by
 *   default (Niraj, 2026-09-25). The Privacy tab is that place.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Switch } from "@repo/ui/components/ui/switch"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@repo/ui/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"
import toast from "@repo/ui/components/ui/sonner"
import { saveProfileDetails, type ProfileDetailsInput } from "@/actions/(main)/user/profile.action"
import { getCompanies } from "@/actions/(main)/user/college.action"
import { PROFILE_LIMITS } from "@/lib/profile/limits"
import { Field, FieldGroup, ProfileSheet, Segmented, normalizeUrl } from "./profile-sheet"

export type ProfileDetails = ProfileDetailsInput & {
    username: string | null
    image: string | null
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    details: ProfileDetails
    onSaved: () => void
    /** The page's avatar upload; the sheet only picks the file. */
    onUploadAvatar: (file: File) => void | Promise<void>
    avatarBusy?: boolean
    /** The tab it opens on: Career goals opens on "career". */
    initialTab?: EditProfileTab
}

export type EditProfileTab = "basic" | "work" | "career" | "privacy"
type Tab = EditProfileTab

const ROLES = [
    "Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile Developer",
    "Data Scientist", "ML Engineer", "DevOps Engineer", "Other",
]
/** Stored ids from the old sheet, read back as the roles they meant. */
const LEGACY_ROLE: Record<string, string> = {
    frontend: "Frontend Developer", backend: "Backend Developer", fullstack: "Full Stack Developer",
    mobile: "Mobile Developer", "data-science": "Data Scientist", "ml-engineer": "ML Engineer",
    devops: "DevOps Engineer", other: "Other",
}
const EXPERIENCE = ["Fresher (0 years)", "0-1 years", "1-2 years", "2-3 years", "3-5 years", "5+ years"]
const NOTICE = ["Immediate", "15 days", "1 month", "2 months", "3 months", "Serving notice"]

function initialsOf(name: string, username: string | null) {
    const src = name.trim() || username || "?"
    return src.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

function normalize(d: ProfileDetails): ProfileDetailsInput {
    return {
        name: d.name ?? "", headline: d.headline ?? "", bio: d.bio ?? "", location: d.location ?? "",
        website: d.website ?? "", occupation: d.occupation ?? "", company: d.company ?? "",
        university: d.university ?? "", openToWork: !!d.openToWork,
        careerGoals: (d.careerGoals ?? []).map((g) => LEGACY_ROLE[g] ?? g),
        targetCompanies: d.targetCompanies ?? [], expectedSalary: d.expectedSalary ?? "",
        noticePeriod: d.noticePeriod ?? "", workExperience: d.workExperience ?? "",
        visibility: d.visibility ?? "PUBLIC", showEmail: !!d.showEmail, showResume: d.showResume !== false,
    }
}

export function EditProfileSheet({ open, onOpenChange, details, onSaved, onUploadAvatar, avatarBusy, initialTab = "basic" }: Props) {
    const initial = useMemo(() => normalize(details), [details])
    const [form, setForm] = useState<ProfileDetailsInput>(initial)
    const [tab, setTab] = useState<Tab>("basic")
    const [busy, setBusy] = useState(false)
    const [serverError, setServerError] = useState<{ field?: string; message: string } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setForm(initial)
            setTab(initialTab)
            setServerError(null)
        }
    }, [open, initial, initialTab])

    const set = <K extends keyof ProfileDetailsInput>(k: K, v: ProfileDetailsInput[K]) => setForm((f) => ({ ...f, [k]: v }))
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)

    const website = normalizeUrl(form.website)
    const errors = {
        name: !form.name.trim() ? "Your name cannot be empty" : serverError?.field === "name" ? serverError.message : null,
        website: website.error ?? (serverError?.field === "website" ? serverError.message : null),
    }
    // Which tab owns each error, so the right trigger is marked and focused.
    const errorTab: Tab | null = errors.name || errors.website ? "basic" : null

    const submit = async () => {
        if (errorTab) {
            setTab(errorTab)
            return
        }
        setBusy(true)
        setServerError(null)
        try {
            const res = await saveProfileDetails({ ...form, website: website.url ?? "" })
            if (!res.success) {
                const field = "field" in res ? res.field : undefined
                setServerError({ field, message: res.error })
                if (field) setTab("basic")
                toast.error(res.error)
                return
            }
            toast.success("Profile saved")
            onOpenChange(false)
            onSaved()
        } catch (error: unknown) {
            console.error("Saving profile failed:", error)
            toast.error("Could not save your profile")
        } finally {
            setBusy(false)
        }
    }

    const role = form.careerGoals[0] ?? ""

    return (
        // The Tabs root wraps the whole sheet so the list can sit in the header while
        // the panels sit in the body. React context crosses the Sheet's portal.
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <ProfileSheet
            open={open}
            onOpenChange={onOpenChange}
            width="lg"
            title="Edit profile"
            description="How others see you."
            onSubmit={submit}
            submitLabel="Save changes"
            busy={busy}
            dirty={dirty}
            headerAside={
                <TabsList variant="segmented" size="sm" fit>
                    <TabsTrigger value="basic">Basics{errorTab === "basic" && tab !== "basic" ? " *" : ""}</TabsTrigger>
                    <TabsTrigger value="work">Work</TabsTrigger>
                    <TabsTrigger value="career">Career goals</TabsTrigger>
                    <TabsTrigger value="privacy">Privacy</TabsTrigger>
                </TabsList>
            }
        >

                <TabsContent value="basic" className="mt-0 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar className="size-20 rounded-2xl">
                                {details.image && <AvatarImage src={details.image} alt="" className="object-cover" />}
                                <AvatarFallback className="rounded-2xl bg-neutral-100 text-lg font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                    {initialsOf(form.name, details.username)}
                                </AvatarFallback>
                            </Avatar>
                            {avatarBusy && (
                                <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-black/60">
                                    <InlineLoader size="md" label="Uploading photo" />
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Button type="button" variant="outline" size="sm" disabled={avatarBusy} onClick={() => fileRef.current?.click()} className="cursor-pointer">
                                <Camera className="mr-1.5 size-3.5" /> {details.image ? "Change photo" : "Upload photo"}
                            </Button>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Square works best. JPG or PNG, up to 5MB.</p>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    e.target.value = ""
                                    if (f) void onUploadAvatar(f)
                                }}
                            />
                        </div>
                    </div>

                    <Field label="Name" htmlFor="ep-name" required error={errors.name}
                        aside={<Counter value={form.name} max={PROFILE_LIMITS.name} />}>
                        <Input id="ep-name" maxLength={PROFILE_LIMITS.name} value={form.name} onChange={(e) => set("name", e.target.value)} />
                    </Field>
                    <Field label="Headline" htmlFor="ep-headline" hint="One line under your name. What you do, not your title history."
                        aside={<Counter value={form.headline} max={PROFILE_LIMITS.headline} />}>
                        <Input id="ep-headline" maxLength={PROFILE_LIMITS.headline} placeholder="Backend engineer who likes shipping small tools" value={form.headline} onChange={(e) => set("headline", e.target.value)} />
                    </Field>
                    <Field label="About" htmlFor="ep-bio" hint="A short paragraph. It opens your public profile."
                        aside={<Counter value={form.bio} max={PROFILE_LIMITS.bio} />}>
                        <Textarea id="ep-bio" rows={5} maxLength={PROFILE_LIMITS.bio} className="resize-none" value={form.bio} onChange={(e) => set("bio", e.target.value)} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Location" htmlFor="ep-location">
                            <Input id="ep-location" placeholder="Bengaluru, India" value={form.location} onChange={(e) => set("location", e.target.value)} />
                        </Field>
                        <Field label="Website" htmlFor="ep-website" error={errors.website}>
                            <Input id="ep-website" inputMode="url" placeholder="yourname.dev" value={form.website} onChange={(e) => set("website", e.target.value)} />
                        </Field>
                    </div>
                </TabsContent>

                <TabsContent value="work" className="mt-0 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Current title" htmlFor="ep-occupation">
                            <Input id="ep-occupation" placeholder="Software Engineer" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
                        </Field>
                        <Field label="Company" htmlFor="ep-company">
                            <Input id="ep-company" placeholder="Acme" value={form.company} onChange={(e) => set("company", e.target.value)} />
                        </Field>
                    </div>
                    <Field label="University" htmlFor="ep-university">
                        <Input id="ep-university" placeholder="Lovely Professional University" value={form.university} onChange={(e) => set("university", e.target.value)} />
                    </Field>
                    <ToggleRow
                        title="Open to work"
                        body="Shows an Open to work marker on your public profile."
                        checked={form.openToWork}
                        onChange={(v) => set("openToWork", v)}
                    />
                </TabsContent>

                <TabsContent value="career" className="mt-0 space-y-6">
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                        Used to match you with jobs. Not shown on your public profile.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Role you want">
                            <Select value={role} onValueChange={(v) => set("careerGoals", [v])}>
                                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder="Choose a role" /></SelectTrigger>
                                <SelectContent>
                                    {(ROLES.includes(role) || !role ? ROLES : [...ROLES, role]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Experience">
                            <Select value={form.workExperience} onValueChange={(v) => set("workExperience", v)}>
                                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder="How many years" /></SelectTrigger>
                                <SelectContent>
                                    {(EXPERIENCE.includes(form.workExperience) || !form.workExperience ? EXPERIENCE : [...EXPERIENCE, form.workExperience]).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Expected salary (LPA)" htmlFor="ep-salary">
                            <Input id="ep-salary" inputMode="decimal" placeholder="12" value={form.expectedSalary} onChange={(e) => set("expectedSalary", e.target.value.replace(/[^\d.]/g, ""))} />
                        </Field>
                        <Field label="Notice period">
                            <Select value={form.noticePeriod} onValueChange={(v) => set("noticePeriod", v)}>
                                <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder="Choose" /></SelectTrigger>
                                <SelectContent>
                                    {(NOTICE.includes(form.noticePeriod) || !form.noticePeriod ? NOTICE : [...NOTICE, form.noticePeriod]).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <TargetCompanies value={form.targetCompanies} onChange={(v) => set("targetCompanies", v)} />
                </TabsContent>

                <TabsContent value="privacy" className="mt-0 space-y-6">
                    <FieldGroup title="Who can see your profile">
                        <Segmented
                            label="Profile visibility"
                            value={form.visibility}
                            onChange={(v) => set("visibility", v)}
                            options={[
                                { value: "PUBLIC", label: "Anyone with the link" },
                                { value: "FOLLOWERS", label: "Followers" },
                                { value: "PRIVATE", label: "Only me" },
                            ]}
                        />
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {form.visibility === "PUBLIC"
                                ? "Your profile page can be opened by anyone, including people who are not signed in, and shows in link previews."
                                : form.visibility === "FOLLOWERS"
                                    ? "Only people who follow you see your profile. Everyone else sees your name and photo."
                                    : "Only you see it. To anyone else your link shows a not-found page."}
                        </p>
                    </FieldGroup>
                    <FieldGroup title="On your public profile">
                        <ToggleRow title="Show my email" body="Adds an Email button to your profile." checked={form.showEmail} onChange={(v) => set("showEmail", v)} />
                        <ToggleRow title="Show my resume" body="Adds a Resume button when you have one on file." checked={form.showResume} onChange={(v) => set("showResume", v)} />
                    </FieldGroup>
                </TabsContent>
        </ProfileSheet>
        </Tabs>
    )
}

function Counter({ value, max }: { value: string; max: number }) {
    const near = value.length > max * 0.9
    return <span className={`text-[11px] tabular-nums ${near ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}>{value.length}/{max}</span>
}

function ToggleRow({ title, body, checked, onChange }: { title: string; body: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <span>
                <span className="block text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{title}</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{body}</span>
            </span>
            <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 cursor-pointer" />
        </label>
    )
}

/** Target companies: a combobox over the company list, plus anything typed. */
function TargetCompanies({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const [companies, setCompanies] = useState<string[]>([])
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")

    useEffect(() => {
        let cancelled = false
        getCompanies()
            .then((r) => { if (!cancelled && r.success) setCompanies(r.companies) })
            .catch((error: unknown) => console.error("Loading companies failed:", error))
        return () => { cancelled = true }
    }, [])

    const add = (c: string) => {
        const t = c.trim()
        if (t && !value.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...value, t])
        setQuery("")
    }
    const options = companies.filter((c) => !value.includes(c))

    return (
        <Field label="Companies you would like to work at" hint="Up to 20.">
            <div className="flex flex-wrap items-center gap-1.5">
                {value.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 py-0.5 pl-2 pr-1 text-xs text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                        {c}
                        <button type="button" aria-label={`Remove ${c}`} onClick={() => onChange(value.filter((x) => x !== c))}
                            className="cursor-pointer rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white">
                            <X className="size-3" />
                        </button>
                    </span>
                ))}
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-7 cursor-pointer px-2.5 text-xs" disabled={value.length >= 20}>
                            Add company
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Search or type a name" value={query} onValueChange={setQuery} />
                            <CommandList className="max-h-56">
                                <CommandEmpty>
                                    {query.trim() ? (
                                        <button type="button" className="w-full cursor-pointer px-2 py-1.5 text-left text-sm" onClick={() => { add(query); setOpen(false) }}>
                                            Add &ldquo;{query.trim()}&rdquo;
                                        </button>
                                    ) : "No companies found."}
                                </CommandEmpty>
                                <CommandGroup>
                                    {options.map((c) => (
                                        <CommandItem key={c} value={c} onSelect={() => { add(c); setOpen(false) }}>{c}</CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </Field>
    )
}
