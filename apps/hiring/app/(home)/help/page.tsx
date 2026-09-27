"use client"

import { motion } from "framer-motion"
import {
    HelpCircle, Book, MessageCircle, FileText, ExternalLink,
    Mail
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import Link from "next/link"

const helpCategories = [
    {
        icon: <Book className="w-6 h-6" />,
        title: "Documentation",
        description: "Learn how to use all features",
        href: "#",
    },
    {
        icon: <MessageCircle className="w-6 h-6" />,
        title: "Live Chat",
        description: "Get instant help from our team",
        href: "#",
    },
    {
        icon: <Mail className="w-6 h-6" />,
        title: "Email Support",
        description: "We reply within 24 hours",
        href: "mailto:support@shipithq.com",
    },
    {
        icon: <FileText className="w-6 h-6" />,
        title: "FAQs",
        description: "Find answers to common questions",
        href: "#",
    },
]

const faqs = [
    {
        q: "How do I post a new job?",
        a: "Navigate to Jobs > Create New Job. Fill in the job details including title, description, requirements, and compensation. Click 'Publish' when ready.",
    },
    {
        q: "How do I invite team members?",
        a: "Go to Team > Invite Member. Enter their email address and select their role (Admin or Recruiter). They'll receive an invitation email.",
    },
    {
        q: "Can I create custom assessments?",
        a: "Yes! Go to Assessments and click 'Create Assessment'. You can create coding challenges, quizzes, or take-home projects tailored to your needs.",
    },
    {
        q: "How do I upgrade my plan?",
        a: "Visit Billing > Upgrade Plan to see available options. Select a plan and complete the payment process to unlock premium features.",
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
                            <Link href={item.href}>
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
                className="max-w-3xl"
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