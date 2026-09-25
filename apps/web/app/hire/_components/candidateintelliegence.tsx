"use client"

import { motion } from "framer-motion"
import {
    CheckCircle2, GitCommit, Zap
} from "lucide-react"

export default function CandidateIntelligence() {
    return (
        <section className="py-32 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4 block">
                            Output Artifact
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white mb-6">
                            The Engineering <br />
                            <span className="text-neutral-400">Dossier.</span>
                        </h2>
                        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
                            Resumes tell you where they worked. Our Dossier tells you how they code.
                            Get a granular breakdown of architectural decisions, velocity, and code quality before you even book the interview.
                        </p>
                        <div className="space-y-4">
                            {
                                [
                                    { title: "Velocity Index", desc: "Commit frequency & PR turnaround time." },
                                    { title: "Quality Score", desc: "Static analysis of maintainability & complexity." },
                                    { title: "Stack Proficiency", desc: "Verified framework expertise via execution." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                        <div className="w-1 h-full bg-neutral-900 dark:bg-white rounded-full" />
                                        <div>
                                            <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{item.title}</h4>
                                            <p className="text-xs text-neutral-500 mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="relative"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-r from-neutral-200 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 rounded-[2rem] blur-2xl opacity-50" />

                        <div className="relative bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl">
                            <div className="flex justify-between items-start mb-8 pb-8 border-b border-neutral-100 dark:border-neutral-900">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800" />
                                    <div>
                                        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
                                        <div className="h-3 w-24 bg-neutral-100 dark:bg-neutral-900 rounded" />
                                    </div>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-100 text-[10px] font-mono font-bold uppercase">
                                    Top 1% Match
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-center">
                                    <div className="text-xs text-neutral-500 font-mono mb-1">ALGOS</div>
                                    <div className="text-xl font-bold text-neutral-900 dark:text-white">98.5</div>
                                </div>
                                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-center">
                                    <div className="text-xs text-neutral-500 font-mono mb-1">SYSTEMS</div>
                                    <div className="text-xl font-bold text-neutral-900 dark:text-white">92.0</div>
                                </div>
                                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-center">
                                    <div className="text-xs text-neutral-500 font-mono mb-1">DEBUG</div>
                                    <div className="text-xl font-bold text-neutral-900 dark:text-white">95.2</div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-2">Verified Events</div>
                                <div className="flex items-center gap-3 text-sm p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-white" />
                                    <span className="text-neutral-600 dark:text-neutral-400">Passed Open Source Audit</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <GitCommit className="w-4 h-4 text-neutral-900 dark:text-white" />
                                    <span className="text-neutral-600 dark:text-neutral-400">Refactored Legacy Auth Module</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <Zap className="w-4 h-4 text-neutral-900 dark:text-white" />
                                    <span className="text-neutral-600 dark:text-neutral-400">Solved &quot;Hard&quot; DP Challenge (15ms)</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}