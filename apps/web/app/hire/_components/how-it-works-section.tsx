"use client"

import { motion } from "framer-motion"
import {
    Building2, ClipboardList, Users, CheckCircle
} from "lucide-react"

const steps = [
    { id: "01", title: "Initialize Profile", desc: "Configure company parameters and tech stack.", icon: Building2 },
    { id: "02", title: "Deploy Challenges", desc: "Launch verified coding assignments.", icon: ClipboardList },
    { id: "03", title: "Analyze & Match", desc: "AI filters talent based on execution.", icon: Users },
    { id: "04", title: "Execute Hire", desc: "Finalize contracts and onboarding.", icon: CheckCircle },
]

export default function HowItWorksSection() {
    return (
        <section className="py-32 bg-white dark:bg-neutral-950">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-20">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 block">
                        Workflow Sequence
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">
                        Operational Logic
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                    <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-px bg-neutral-200 dark:border-neutral-800 border-t border-dashed border-neutral-300 dark:border-neutral-700 z-0" />

                    {
                        steps.map((step, index) => (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="relative z-10 flex flex-col items-center text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-6 shadow-sm">
                                    <span className="font-mono font-bold text-neutral-900 dark:text-white">{step.id}</span>
                                </div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[200px]">
                                    {step.desc}
                                </p>
                            </motion.div>
                        ))
                    }
                </div>
            </div>
        </section>
    )
}