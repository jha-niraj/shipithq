"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, LogOut, Monitor, Moon, Save, Sun, User } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Label } from "@repo/ui/components/ui/label"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { toast } from "@repo/ui/components/ui/sonner"
import { PasswordInput } from "@repo/ui/components/auth/auth-form"
import { useTheme } from "@repo/ui/components/themeprovider"
import { cn } from "@repo/ui/lib/utils"
import { signOut, useSession } from "@repo/auth/client"
import { changePassword, updateUserProfile } from "@/actions/profile"

/*
 * Account (plan/hiring-ui HU-12, Niraj 2026-09-28: "made real"): only settings
 * that work. Your name, the password, how the app looks, and signing out. The old
 * page's notification and two-factor switches changed nothing and are gone; they
 * come back when they do something.
 */

function Section({ icon: Icon, title, hint, children }: { icon: typeof User; title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="grid gap-4 border-b border-neutral-200 py-6 last:border-0 lg:grid-cols-[18rem_minmax(0,1fr)] dark:border-neutral-800">
            <div>
                <h2 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white"><Icon className="h-4 w-4" /> {title}</h2>
                {hint && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>}
            </div>
            <div className="min-w-0 max-w-xl">{children}</div>
        </section>
    )
}

export default function AccountPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [name, setName] = useState("")
    const [savingName, setSavingName] = useState(false)
    const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
    const [savingPw, setSavingPw] = useState(false)
    const [signingOut, setSigningOut] = useState(false)

    useEffect(() => setMounted(true), [])
    useEffect(() => { if (session?.user?.name) setName(session.user.name) }, [session?.user?.name])

    const saveName = async () => {
        if (name.trim().length < 2) { toast.error("Your name needs two characters or more"); return }
        setSavingName(true)
        const r = await updateUserProfile({ name: name.trim() })
        setSavingName(false)
        if (!r.success) { toast.error(r.error ?? "Could not save your name"); return }
        toast.success("Name saved")
        router.refresh()
    }

    const pwError = pw.newPassword && pw.newPassword.length < 8
        ? "At least 8 characters."
        : pw.confirmPassword && pw.newPassword !== pw.confirmPassword ? "The two new passwords differ." : null

    const savePassword = async () => {
        if (pwError || !pw.currentPassword || !pw.newPassword) return
        setSavingPw(true)
        const r = await changePassword(pw)
        setSavingPw(false)
        if (!r.success) { toast.error(r.error ?? "Could not change the password"); return }
        setPw({ currentPassword: "", newPassword: "", confirmPassword: "" })
        toast.success("Password changed. Other devices were signed out.")
    }

    return (
        <div className="page-frame px-page py-6">
            <PageHeader title="Account" subtitle="Your sign-in and how the app looks." />

            <div className="mt-2">
                <Section icon={User} title="You" hint="Your name shows to your team and on results you act on.">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-name">Name</Label>
                            <div className="flex gap-2">
                                <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your full name" />
                                <Button onClick={() => void saveName()} disabled={savingName || name.trim() === (session?.user?.name ?? "")} className="shrink-0 gap-1.5">
                                    {savingName ? <InlineLoader size="sm" /> : <Save className="h-4 w-4" />} Save
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-email">Email</Label>
                            <Input id="acc-email" value={session?.user?.email ?? ""} disabled readOnly />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">To change it, write to support@shipithq.com.</p>
                        </div>
                    </div>
                </Section>

                <Section icon={KeyRound} title="Password" hint="Changing it signs you out everywhere else.">
                    <form onSubmit={(e) => { e.preventDefault(); void savePassword() }} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-current">Current password</Label>
                            <PasswordInput id="acc-current" autoComplete="current-password" placeholder="Your current password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="acc-new">New password</Label>
                                <PasswordInput id="acc-new" autoComplete="new-password" placeholder="At least 8 characters" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="acc-confirm">Confirm it</Label>
                                <PasswordInput id="acc-confirm" autoComplete="new-password" placeholder="The same again" value={pw.confirmPassword} onChange={(e) => setPw((p) => ({ ...p, confirmPassword: e.target.value }))} />
                            </div>
                        </div>
                        {pwError && <p className="text-xs text-neutral-900 dark:text-white" role="alert">{pwError}</p>}
                        <Button type="submit" disabled={savingPw || Boolean(pwError) || !pw.currentPassword || !pw.newPassword || !pw.confirmPassword} className="gap-1.5">
                            {savingPw ? <InlineLoader size="sm" /> : <KeyRound className="h-4 w-4" />} Change password
                        </Button>
                    </form>
                </Section>

                <Section icon={Monitor} title="Appearance" hint="Saved on this device.">
                    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
                        {([
                            { value: "light", label: "Light", icon: Sun },
                            { value: "dark", label: "Dark", icon: Moon },
                            { value: "system", label: "System", icon: Monitor },
                        ] as const).map((t) => (
                            <button key={t.value} type="button" role="radio" aria-checked={mounted && theme === t.value} onClick={() => setTheme(t.value)}
                                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                                    mounted && theme === t.value ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white")}>
                                <t.icon className="h-4 w-4" /> {t.label}
                            </button>
                        ))}
                    </div>
                </Section>

                <Section icon={LogOut} title="Sign out" hint="Signs you out of the hiring app on this device.">
                    <Button variant="outline" className="gap-1.5" disabled={signingOut} onClick={async () => {
                        setSigningOut(true)
                        await signOut().catch(() => {})
                        router.push("/signin")
                    }}>
                        {signingOut ? <InlineLoader size="sm" /> : <LogOut className="h-4 w-4" />} Sign out
                    </Button>
                </Section>
            </div>
        </div>
    )
}
