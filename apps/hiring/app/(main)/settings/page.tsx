"use client"

import { motion } from "framer-motion"
import { Bell, Shield, Save, User } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Switch } from "@repo/ui/components/ui/switch"
import { useState } from "react"
import { useSession } from "@repo/auth/client"

export default function SettingsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => setLoading(false), 1000)
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader title="Settings" subtitle="Manage your account preferences" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl space-y-8"
            >
                {/* Profile Settings */}
                <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                    <h2 className="font-bold text-lg text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Profile Settings
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                            <Input
                                id="name"
                                defaultValue={session?.user?.name || ""}
                                className="mt-2 rounded-xl"
                            />
                        </div>
                        <div>
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                defaultValue={session?.user?.email || ""}
                                className="mt-2 rounded-xl"
                                disabled
                            />
                            <p className="text-xs text-neutral-500 mt-1">Contact support to change your email</p>
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </div>

                {/* Notification Settings */}
                <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                    <h2 className="font-bold text-lg text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notifications
                    </h2>
                    <div className="space-y-4">
                        {[
                            { label: "New Applications", desc: "Get notified when candidates apply" },
                            { label: "Interview Reminders", desc: "Receive reminders before interviews" },
                            { label: "Weekly Reports", desc: "Get weekly hiring pipeline summaries" },
                            { label: "Team Updates", desc: "Notifications about team activity" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white">{item.label}</p>
                                    <p className="text-sm text-neutral-500">{item.desc}</p>
                                </div>
                                <Switch />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security */}
                <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                    <h2 className="font-bold text-lg text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Security
                    </h2>
                    <div className="space-y-4">
                        <Button variant="outline" className="rounded-xl">
                            Change Password
                        </Button>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium text-neutral-900 dark:text-white">Two-Factor Authentication</p>
                                <p className="text-sm text-neutral-500">Add an extra layer of security</p>
                            </div>
                            <Switch />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
