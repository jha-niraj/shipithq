"use client"

import { useState, type FormEvent } from "react"
import { Check } from "lucide-react"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { cn } from "@repo/ui/lib/utils"
import { submitContactMessage } from "@/actions/contact.action"
import { BRAND } from "@/lib/site"
import { MONO } from "@/components/marketing/primitives"

/**
 * Request early access for a campus (plan/web/story ST-15; Niraj, 2026-10-07). It goes through
 * `submitContactMessage`, web's existing contact capture (apps/web/CLAUDE.md lists it), so the
 * request lands in `contact_submissions` (the contactMessages table) with a "[Uni early access]" subject and no new data use.
 * The role and size choices are apps/uni onboarding's own lists ((auth)/onboarding/page.tsx).
 */

const ROLES = ["Chancellor / Vice Chancellor", "Principal / Director", "Registrar", "Dean", "Head of Department", "Placement Head / TPO", "Professor / Faculty", "Administrative Staff"]
const SIZES = ["Under 500 students", "500-1,000 students", "1,000-5,000 students", "5,000-10,000 students", "10,000+ students"]

const input = "h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-[15px] text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"

export function EarlyAccess() {
    const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string }>({ status: "idle" })
    const [form, setForm] = useState({ name: "", email: "", institution: "", role: ROLES[0]!, size: SIZES[0]!, note: "" })
    const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setState({ status: "sending" })
        const r = await submitContactMessage({
            name: form.name,
            email: form.email,
            subject: `[Uni early access] ${form.institution}`.slice(0, 200),
            message: [`Institution: ${form.institution}`, `Role: ${form.role}`, `Size: ${form.size}`, form.note && `Note: ${form.note}`].filter(Boolean).join("\n"),
        })
        setState(r.success ? { status: "sent", message: r.message } : { status: "error", message: r.message })
    }

    if (state.status === "sent") {
        return (
            <div className="rounded-2xl bg-white p-6 ring-1 ring-neutral-900/10">
                <p className="flex items-center gap-2 text-[16px] font-semibold text-neutral-900"><Check className="size-5" aria-hidden /> Request received</p>
                <p className="mt-2 text-[15px] leading-7 text-neutral-700">{state.message} We will set up {form.institution || "your campus"} with you.</p>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-2xl bg-white p-5 ring-1 ring-neutral-900/10 sm:grid-cols-2 sm:p-6">
            <label className="grid gap-1.5 text-[13px] font-medium text-neutral-900" htmlFor="ea-name">Your name
                <input id="ea-name" required maxLength={120} autoComplete="name" className={input} value={form.name} onChange={set("name")} />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-neutral-900" htmlFor="ea-email">Work email
                <input id="ea-email" type="email" required maxLength={254} autoComplete="email" placeholder="you@university.edu" className={input} value={form.email} onChange={set("email")} />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-neutral-900 sm:col-span-2" htmlFor="ea-inst">Institution
                <input id="ea-inst" required maxLength={150} autoComplete="organization" className={input} value={form.institution} onChange={set("institution")} />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-neutral-900" htmlFor="ea-role">Your role
                <select id="ea-role" className={input} value={form.role} onChange={set("role")}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-neutral-900" htmlFor="ea-size">Students
                <select id="ea-size" className={input} value={form.size} onChange={set("size")}>{SIZES.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-neutral-900 sm:col-span-2" htmlFor="ea-note">Anything we should know <span className="font-normal text-neutral-600">(optional)</span>
                <textarea id="ea-note" rows={3} maxLength={2000} className={cn(input, "h-auto py-2.5")} value={form.note} onChange={set("note")} placeholder="Departments, the placement season, what you would use first" />
            </label>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <button type="submit" disabled={state.status === "sending"} className="inline-flex h-11 items-center gap-2 rounded-lg bg-neutral-900 px-5 text-[15px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-70">
                    {state.status === "sending" ? <><InlineLoader size="sm" /> Sending</> : "Request early access"}
                </button>
                <p className={cn(MONO, "text-[11px] text-neutral-600")}>Or write to {BRAND.email}</p>
            </div>
            {state.status === "error" && <p role="alert" className="text-[14px] text-rose-700 sm:col-span-2">{state.message}</p>}
        </form>
    )
}
