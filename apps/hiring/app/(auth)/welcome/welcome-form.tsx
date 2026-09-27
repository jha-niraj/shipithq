"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Camera, UserRound } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Label } from "@repo/ui/components/ui/label"
import { OptionSelect } from "@repo/ui/components/ui/option-select"
import { Switch } from "@repo/ui/components/ui/switch"
import { toast } from "@repo/ui/components/ui/sonner"
import { saveMemberDetails, uploadMemberPhoto, type MemberDetails } from "@/actions/team/member-details.action"

/*
 * The invited member's first run (plan/hiring-ui HU-14): job title, LinkedIn,
 * portfolio, photo, and whether they appear on the company's People tab (on by
 * default, Niraj 2026-09-28). Every field is optional and "Skip" goes straight in.
 */

export function WelcomeForm({ initial, titles }: { initial: MemberDetails; titles: string[] }) {
    const router = useRouter()
    const file = useRef<HTMLInputElement>(null)
    const [f, setF] = useState({ title: initial.title, linkedinUrl: initial.linkedinUrl, portfolioUrl: initial.portfolioUrl, showOnPeople: initial.showOnPeople })
    const [photo, setPhoto] = useState(initial.image)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        const r = await saveMemberDetails(f)
        setSaving(false)
        if (!r.success) { toast.error(r.error); return }
        router.push("/home")
    }

    return (
        <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-page py-10 dark:bg-neutral-950">
            <form onSubmit={(e) => { e.preventDefault(); void save() }} className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Welcome to {initial.companyName}</h1>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">A few details for your team and the company page. All optional; change them any time from your profile.</p>

                <div className="mt-6 flex items-center gap-4">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7 text-neutral-400" />}
                    </span>
                    <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => {
                        const picked = e.target.files?.[0]
                        e.target.value = ""
                        if (!picked) return
                        setUploading(true)
                        const fd = new FormData()
                        fd.set("file", picked)
                        const r = await uploadMemberPhoto(fd)
                        setUploading(false)
                        if (!r.success) { toast.error(r.error); return }
                        setPhoto(r.data.url)
                    }} />
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploading} onClick={() => file.current?.click()}>
                        {uploading ? <InlineLoader size="sm" /> : <Camera className="h-4 w-4" />} {photo ? "Change photo" : "Add a photo"}
                    </Button>
                </div>

                <div className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                        <Label>Your job title</Label>
                        <OptionSelect value={f.title} onChange={(v) => setF((p) => ({ ...p, title: v }))} options={titles} placeholder="Pick one or type your own" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="w-linkedin">LinkedIn</Label>
                        <Input id="w-linkedin" value={f.linkedinUrl} onChange={(e) => setF((p) => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://www.linkedin.com/in/you" maxLength={300} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="w-portfolio">Portfolio or website</Label>
                        <Input id="w-portfolio" value={f.portfolioUrl} onChange={(e) => setF((p) => ({ ...p, portfolioUrl: e.target.value }))} placeholder="https://" maxLength={300} />
                    </div>
                    <label className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                        <span>
                            <span className="block text-sm font-medium text-neutral-900 dark:text-white">Show me on the company&apos;s People tab</span>
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400">Your name, photo, title and links, to anyone using ShipItHQ Hiring. Your team always sees you.</span>
                        </span>
                        <Switch checked={f.showOnPeople} onCheckedChange={(v: boolean) => setF((p) => ({ ...p, showOnPeople: v }))} />
                    </label>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <button type="button" onClick={() => router.push("/home")} className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white">Skip for now</button>
                    <Button type="submit" disabled={saving || uploading} className="gap-1.5">
                        {saving ? <InlineLoader size="sm" /> : null} Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        </div>
    )
}
