"use client"

import { motion } from "framer-motion"
import {
    GitPullRequest, Terminal, Bot, Boxes
} from "lucide-react"
import { cn } from "@repo/ui/lib/utils"

const modules = [
    {
        title: "Open Source Sandbox",
        desc: "Deploy candidates directly into your repositories. Our AI bot monitors PRs for code quality, architectural patterns, and velocity.",
        icon: GitPullRequest,
        tags: ["Live Vetting", "Issue Tracking", "Bot Analysis"],
        colSpan: "md:col-span-2"
    },
    {
        title: "Assignment Studio",
        desc: "Spin up full-stack environments. Candidates execute tickets, not algorithms.",
        icon: Terminal,
        tags: ["Docker Containers", "Real-time"],
        colSpan: "md:col-span-1"
    },
    {
        title: "Architectural Review",
        desc: "AI analyzes system design choices and commit history pattern recognition.",
        icon: Boxes,
        tags: ["Design Patterns", "Clean Code"],
        colSpan: "md:col-span-1"
    },
    {
        title: "Code Quality Agent",
        desc: "Automated analysis of complexity, maintainability, and testing coverage.",
        icon: Bot,
        tags: ["Static Analysis", "Coverage"],
        colSpan: "md:col-span-2"
    }
]

export default function VerificationTools() {
    return (
        <section className="py-32 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 block">
                            Infrastructure
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white">
                            Real-World Vetting Protocols
                        </h2>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-400 max-w-md text-sm leading-relaxed text-right md:text-left">
                        Move beyond LeetCode. Evaluate candidates in environments that mirror your actual production stack.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {
                        modules.map((module, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "group relative p-8 rounded-3xl border transition-all duration-300",
                                    "bg-neutral-50 dark:bg-neutral-900",
                                    "border-neutral-200 dark:border-neutral-800",
                                    "hover:border-neutral-400 dark:hover:border-neutral-700",
                                    module.colSpan
                                )}
                            >
                                <div className="absolute top-8 right-8 text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                                    <module.icon className="w-8 h-8" />
                                </div>
                                <div className="mt-16">
                                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                                        {module.title}
                                    </h3>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6 max-w-sm">
                                        {module.desc}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {
                                            module.tags.map((tag, t) => (
                                                <span key={t} className="px-2 py-1 rounded-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[10px] font-mono uppercase tracking-wide text-neutral-500">
                                                    {tag}
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    }
                </div>
            </div>
        </section>
    )
}