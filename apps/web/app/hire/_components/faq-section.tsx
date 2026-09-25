"use client"

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { MessageCircle, Plus, HelpCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";

// Content specifically for University Admins
const faqData = [
    {
        id: "item-1",
        question: "How does student verification work?",
        answer: "Students sign up on the main platform and select their university. We verify them using their university-issued email address (.edu domain) or a custom API integration with your existing student database."
    },
    {
        id: "item-2",
        question: "How are credits allocated and managed?",
        answer: "Admins purchase credit pools. You can set auto-allocation rules (e.g., 500 credits per student per semester) or manually grant credits. Credits used for mandatory assignments are deducted from the university pool, while personal projects can use the student's personal credits."
    },
    {
        id: "item-3",
        question: "Can we integrate with Moodle, Canvas, or Blackboard?",
        answer: "Yes. Enterprise plans include LTI v1.3 integration capabilities. We can sync assignment grades directly to your LMS gradebook and allow single sign-on (SSO) for students."
    },
    {
        id: "item-4",
        question: "What distinguishes the 'Private Job Board'?",
        answer: "Placement officers can curate job listings visible *only* to verified students of your university. You can also invite partner companies to post exclusive roles for your campus drives."
    },
    {
        id: "item-5",
        question: "Is the code execution environment secure?",
        answer: "The sandbox runs in isolated Docker containers with no network access (unless whitelist enabled). We employ strict anti-cheat measures including copy-paste tracking, focus loss detection, and code similarity analysis."
    },
    {
        id: "item-6",
        question: "What kind of analytics do we get?",
        answer: "You receive a dashboard showing student engagement, average assignment scores, skill proficiency heatmaps across the batch, and individual student progress reports."
    },
];

export default function FaqSection() {
    const [openIndex, setOpenIndex] = useState<string | null>(null);

    return (
        <section className="py-24 relative bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
            {/* Schematic Grid Background */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-4"
                    >
                        <div className="sticky top-24">
                            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium text-xs font-mono mb-6 uppercase tracking-wider">
                                <HelpCircle className="w-3.5 h-3.5 mr-2" />
                                Support Protocol
                            </Badge>
                            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-6 tracking-tight">
                                Administration <br />
                                <span className="text-neutral-400 dark:text-neutral-600">Queries.</span>
                            </h2>
                            <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
                                Technical details regarding integration, security, and academic policies.
                            </p>
                            <Link href="mailto:support@shipithq.com">
                                <Button className="cursor-pointer h-12 px-6 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 font-bold transition-all">
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Contact Support
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                    
                    <div className="lg:col-span-8">
                        <div className="space-y-4">
                            {
                                faqData.map((faq, index) => (
                                    <motion.div
                                        key={faq.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                                    >
                                        <button
                                            onClick={() => setOpenIndex(openIndex === faq.id ? null : faq.id)}
                                            className="cursor-pointer flex items-start justify-between w-full p-6 text-left"
                                        >
                                            <span className="text-lg font-bold text-neutral-900 dark:text-white pr-8">
                                                {faq.question}
                                            </span>
                                            <div className={cn(
                                                "flex-shrink-0 transition-transform duration-300",
                                                openIndex === faq.id ? "rotate-45" : "rotate-0"
                                            )}>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center border transition-colors",
                                                    openIndex === faq.id 
                                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-black border-transparent"
                                                        : "bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400"
                                                )}>
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {
                                                openIndex === faq.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    >
                                                        <div className="px-6 pb-6 pt-0">
                                                            <div className="h-px w-full bg-neutral-100 dark:bg-neutral-800 mb-4" />
                                                            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                                                {faq.answer}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )
                                            }
                                        </AnimatePresence>
                                    </motion.div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};