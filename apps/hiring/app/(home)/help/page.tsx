"use client"

import { motion } from "framer-motion"
import {
    HelpCircle, Book, MessageCircle, FileText, ExternalLink,
    Mail
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import Link from "next/link"

/**
 * Help (plan/web/story ST-1): every card goes somewhere real and every answer names the real
 * screen and button. "Live Chat" and "Documentation" were dead links to things that don't
 * exist; the hiring guides live on the website.
 */
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://www.shipithq.com"

const helpCategories = [
    {
        icon: <Book className="w-6 h-6" />,
        title: "Hiring guides",
        description: "How to set up pipelines, rounds and your team",
        href: `${WEB_URL}/hire/guides`,
    },
    {
        icon: <MessageCircle className="w-6 h-6" />,
        title: "Contact form",
        description: "Write to us from the contact page",
        href: "/contactus",
    },
    {
        icon: <Mail className="w-6 h-6" />,
        title: "Email support",
        description: "We reply within two working days",
        href: "mailto:support@shipithq.com",
    },
    {
        icon: <FileText className="w-6 h-6" />,
        title: "FAQs",
        description: "Answers to common questions, below",
        href: "#faqs",
    },
]

const faqs = [
    {
        q: "How do I post a new job?",
        a: "On Home, choose New job. Fill in the role, attach a pipeline of rounds, and post it. Results arrive under Results as students clear the rounds.",
    },
    {
        q: "How do I invite team members?",
        a: "Open Team and choose Invite a team member. Enter their work email and pick a role: Admin, Hiring manager, Recruiter or Interviewer. They get an invitation email.",
    },
    {
        q: "How do I set the rounds candidates take?",
        a: "Open Pipelines. A pipeline is the rounds for a role (aptitude, DSA, system design and voice rounds), each with its own pass mark. Attach one when you post a job.",
    },
    {
        q: "How do I change my plan?",
        a: "Open Billing, pick a plan and confirm it in the Upgrade dialog.",
    },
]

export default function HelpPage() {
    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                    Help & Support
                </h1>
                <p className="text-neutral-500 mt-1">
                    Get help with using ShipItHQ Hiring
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                {
                    helpCategories.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Link href={item.href} {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                                <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer h-full">
                                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4 text-neutral-600 dark:text-neutral-400">
                                        {item.icon}
                                    </div>
                                    <h3 className="font-bold text-neutral-900 dark:text-white mb-1">{item.title}</h3>
                                    <p className="text-sm text-neutral-500">{item.description}</p>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                }
            </div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-3xl scroll-mt-24"
                id="faqs"
            >
                <h2 className="font-bold text-xl text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                    {
                        faqs.map((faq, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                            >
                                <h3 className="font-bold text-neutral-900 dark:text-white mb-2">{faq.q}</h3>
                                <p className="text-sm text-neutral-500">{faq.a}</p>
                            </div>
                        ))
                    }
                </div>
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-12 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-8 text-center max-w-3xl"
            >
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">
                    Still need help?
                </h3>
                <p className="text-neutral-500 mb-4">
                    Our support team is ready to assist you with any questions.
                </p>
                <Button asChild className="gap-1.5">
                    <Link href="/contactus">Contact support <ExternalLink className="h-4 w-4" /></Link>
                </Button>
            </motion.div>
        </div>
    )
}