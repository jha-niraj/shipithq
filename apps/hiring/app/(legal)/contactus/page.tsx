"use client"

import { motion } from "framer-motion"
import { Mail, ArrowRight, Calendar, MessageCircle, Building2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import Link from "next/link"
import { useState } from "react"
import { submitHiringContact } from "@/actions/contact.action"

const SUBJECTS: Record<string, string> = {
    demo: "Request a demo",
    sales: "Sales enquiry",
    support: "Technical support",
    partnership: "Partnership",
    other: "Other",
}

/**
 * The hiring contact page (plan/web/story ST-1). The form used to wait a second and say
 * "sent" without sending; it now stores the message (`submitHiringContact`). The placeholder
 * phone, office address, hours and map box are gone: only the real email addresses stay.
 */
export default function ContactPage() {
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" })
    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const r = await submitHiringContact({ ...form, subject: SUBJECTS[form.subject] ?? "" })
            if (r.success) setSubmitted(r.message)
            else setError(r.message)
        } catch (err: unknown) {
            console.error("Sending the contact form failed:", err)
            setError("Something went wrong. Please email us directly instead.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-dvh bg-white dark:bg-neutral-950">
            <section className="pt-32 pb-16 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px] opacity-50" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <span className="inline-block text-[10px] font-mono uppercase tracking-widest text-neutral-500 bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-full mb-6">
                            Contact
                        </span>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-neutral-900 dark:text-white mb-6">
                            Let&apos;s Build <br />
                            <span className="text-neutral-400 dark:text-neutral-600">Something Great.</span>
                        </h1>
                        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                            Whether you have questions about our platform, need a demo, or want to discuss enterprise solutions - we&apos;re here to help.
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
                    >
                        <Link href="https://cal.com/coderzai" target="_blank">
                            <div className="group bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-white dark:to-neutral-100 rounded-2xl p-8 text-white dark:text-black hover:scale-105 transition-transform cursor-pointer">
                                <div className="w-14 h-14 rounded-xl bg-white/10 dark:bg-black/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Calendar className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Schedule a Demo</h3>
                                <p className="text-neutral-400 dark:text-neutral-600 text-sm mb-4">
                                    See ShipItHQ Hiring in action with a personalized walkthrough.
                                </p>
                                <div className="flex items-center gap-2 font-medium text-sm">
                                    Book Meeting <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                            <div className="w-14 h-14 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-6">
                                <Building2 className="w-7 h-7 text-neutral-600 dark:text-neutral-400" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Enterprise Sales</h3>
                            <p className="text-neutral-500 text-sm mb-4">
                                Custom solutions for large organizations with complex needs.
                            </p>
                            <a href="mailto:sales@shipithq.com" className="flex items-center gap-2 font-medium text-sm text-neutral-900 dark:text-white hover:underline">
                                sales@shipithq.com <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                            <div className="w-14 h-14 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-6">
                                <MessageCircle className="w-7 h-7 text-neutral-600 dark:text-neutral-400" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Technical Support</h3>
                            <p className="text-neutral-500 text-sm mb-4">
                                Get help with platform issues and technical questions.
                            </p>
                            <a href="mailto:support@shipithq.com" className="flex items-center gap-2 font-medium text-sm text-neutral-900 dark:text-white hover:underline">
                                support@shipithq.com <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>
            <section className="py-20 px-6 bg-neutral-50 dark:bg-neutral-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-6">
                                Send us a message
                            </h2>
                            <p className="text-neutral-500 mb-8">
                                Fill in the form and we&apos;ll get back to you within two working days.
                            </p>

                            {
                                submitted ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800/40 flex items-center justify-center mx-auto mb-4">
                                            <Mail className="w-8 h-8 text-neutral-800 dark:text-neutral-100" />
                                        </div>
                                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                                            Message sent
                                        </h3>
                                        <p className="text-neutral-500">{submitted}</p>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <Label htmlFor="name" className="text-sm font-medium">Your name</Label>
                                            <Input
                                                id="name"
                                                value={form.name}
                                                onChange={set("name")}
                                                placeholder="Ada Lovelace"
                                                className="mt-2 rounded-xl bg-white dark:bg-neutral-950"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="email" className="text-sm font-medium">Work Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={form.email}
                                                onChange={set("email")}
                                                placeholder="you@company.com"
                                                className="mt-2 rounded-xl bg-white dark:bg-neutral-950"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="company" className="text-sm font-medium">Company Name</Label>
                                            <Input
                                                id="company"
                                                value={form.company}
                                                onChange={set("company")}
                                                placeholder="Acme Inc."
                                                className="mt-2 rounded-xl bg-white dark:bg-neutral-950"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                                            <Select value={form.subject} onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}>
                                                <SelectTrigger className="mt-2 rounded-xl bg-white dark:bg-neutral-950">
                                                    <SelectValue placeholder="How can we help?" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(SUBJECTS).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="message" className="text-sm font-medium">Message</Label>
                                            <Textarea
                                                id="message"
                                                value={form.message}
                                                onChange={set("message")}
                                                placeholder="Tell us about your needs..."
                                                className="mt-2 rounded-xl bg-white dark:bg-neutral-950 min-h-[150px]"
                                                required
                                            />
                                        </div>
                                        {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
                                        <Button
                                            type="submit"
                                            disabled={loading || !form.subject}
                                            className="w-full rounded-xl h-12 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold"
                                        >
                                            {loading ? "Sending..." : "Send Message"}
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </form>
                                )
                            }
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="lg:pl-12"
                        >
                            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-6">
                                Get in touch
                            </h2>
                            <p className="text-neutral-500 mb-12">
                                Prefer to reach out directly? Here&apos;s how you can contact us.
                            </p>
                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                        <Mail className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-neutral-900 dark:text-white mb-1">Email</p>
                                        <a href="mailto:hello@shipithq.com" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                                            hello@shipithq.com
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    )
}