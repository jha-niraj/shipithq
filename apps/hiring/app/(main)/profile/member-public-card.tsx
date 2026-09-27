"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Label } from "@repo/ui/components/ui/label"
import { OptionSelect } from "@repo/ui/components/ui/option-select"
import { Switch } from "@repo/ui/components/ui/switch"
import { toast } from "@repo/ui/components/ui/sonner"
import { OPTION_BUILTINS } from "@repo/db/option-builtins"
import { getMemberDetails, saveMemberDetails } from "@/actions/team/member-details.action"
import { getOptions } from "@/actions/options"

/*
 * What the company page's People tab shows about you (plan/hiring-ui HU-14): the
 * same fields as the /welcome step, editable any time.
 */
export function MemberPublicCard() {
    const [f, setF] = useState<{ title: string; linkedinUrl: string; portfolioUrl: string; showOnPeople: boolean } | null>(null)
    const [titles, setTitles] = useState<string[]>([...OPTION_BUILTINS.member_title])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        void getMemberDetails().then((r) => { if (r.success) setF({ title: r.data.title, linkedinUrl: r.data.linkedinUrl, portfolioUrl: r.data.portfolioUrl, showOnPeople: r.data.showOnPeople }) })
        void getOptions(["member_title"]).then((o) => { if (o.member_title?.length) setTitles(o.member_title) }).catch(() => null)
    }, [])

    if (!f) return null
    const save = async () => {
        setSaving(true)
        const r = await saveMemberDetails(f)
        setSaving(false)
        if (!r.success) { toast.error(r.error); return }
        toast.success("Saved")
    }

    return (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h3 className="font-semibold text-neutral-900 dark:text-white">On the company page</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">What the People tab shows about you.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                    <Label>Job title</Label>
                    <OptionSelect value={f.title} onChange={(v) => setF({ ...f, title: v })} options={titles} placeholder="Pick one or type your own" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="pp-linkedin">LinkedIn</Label>
                    <Input id="pp-linkedin" value={f.linkedinUrl} onChange={(e) => setF({ ...f, linkedinUrl: e.target.value })} placeholder="https://www.linkedin.com/in/you" maxLength={300} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="pp-portfolio">Portfolio or website</Label>
                    <Input id="pp-portfolio" value={f.portfolioUrl} onChange={(e) => setF({ ...f, portfolioUrl: e.target.value })} placeholder="https://" maxLength={300} />
                </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <label className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                    <Switch checked={f.showOnPeople} onCheckedChange={(v: boolean) => setF({ ...f, showOnPeople: v })} />
                    Show me to other companies on People (your team always sees you)
                </label>
                <Button onClick={() => void save()} disabled={saving} className="gap-1.5">
                    {saving ? <InlineLoader size="sm" /> : <Save className="h-4 w-4" />} Save
                </Button>
            </div>
        </div>
    )
}
