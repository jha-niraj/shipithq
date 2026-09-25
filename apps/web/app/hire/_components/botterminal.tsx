"use client"

import { motion } from "framer-motion"

export default function BotTerminal() {
    return (
        <section className="py-24 bg-neutral-950 border-y border-neutral-900 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-12">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 block">
                        Automated Code Review
                    </span>
                    <h2 className="text-3xl font-bold text-white tracking-tighter">
                        The &quot;Silent Partner&quot; in Vetting
                    </h2>
                </div>
                <div className="max-w-3xl mx-auto">
                    <div className="rounded-xl overflow-hidden border border-neutral-800 bg-[#0c0c0c] shadow-2xl">
                        <div className="flex items-center px-4 py-3 bg-neutral-900 border-b border-neutral-800">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-neutral-900/20 border border-neutral-900/50" />
                                <div className="w-3 h-3 rounded-full bg-neutral-900/20 border border-neutral-900/50" />
                            </div>
                            <div className="ml-4 text-[10px] font-mono text-neutral-500">shipit-bot - analysis - bash</div>
                        </div>
                        <div className="p-6 font-mono text-sm space-y-2">
                            <div className="flex">
                                <span className="text-neutral-900 mr-2">➜</span>
                                <span className="text-white">git push origin feat/payment-integration</span>
                            </div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-neutral-500 pt-2"
                            >
                                Analyzing commit hash 8a2f9c...
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                                className="space-y-1 pt-2"
                            >
                                <div className="flex items-center text-neutral-800">
                                    <span className="mr-2">ℹ</span> Cyclomatic Complexity: Low (3.2)
                                </div>
                                <div className="flex items-center text-neutral-800">
                                    <span className="mr-2">✔</span> Test Coverage: 94% (+2%)
                                </div>
                                <div className="flex items-center text-neutral-900">
                                    <span className="mr-2">⚠</span> Pattern Detection: Factory Pattern Implemented Correctly
                                </div>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 2 }}
                                className="text-neutral-500 pt-4"
                            >
                                {">"} ShipItHQBot: <span className="text-white">Candidate demonstrates strong understanding of SOLID principles. Design patterns applied correctly.</span>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}