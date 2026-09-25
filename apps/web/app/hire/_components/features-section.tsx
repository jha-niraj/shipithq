"use client"

import { motion } from "framer-motion"
import {
    Code, Users, ClipboardCheck, BarChart3, Zap, Shield, Eye, Calendar
} from "lucide-react"
import { cn } from "@repo/ui/lib/utils"

const features = [
    { icon: Code, title: "Production Code", desc: "Review actual commits." },
    { icon: Users, title: "Pre-Vetted", desc: "Rigorous assessment verification." },
    { icon: ClipboardCheck, title: "Sandbox Mode", desc: "Anti-cheat controlled environments." },
    { icon: BarChart3, title: "Match Algo", desc: "AI-driven skill compatibility." },
    { icon: Zap, title: "High Velocity", desc: "60% faster hiring cycles." },
    { icon: Shield, title: "30-Day Guarantee", desc: "Full replacement warranty." },
    { icon: Eye, title: "Deep Analytics", desc: "View candidate learning curves." },
    { icon: Calendar, title: "Auto-Sync", desc: "Integrated calendar scheduling." },
]

export default function FeaturesSection() {
    return (
        <section id="features" className="py-32 bg-neutral-50 dark:bg-neutral-900 border-y border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 block">
                            System Capabilities
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-neutral-900 dark:text-white">
                            The Intelligence Engine
                        </h2>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-400 max-w-md text-sm leading-relaxed">
                        A modular suite of tools designed to filter signal from noise in the hiring process.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {
                        features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    "group p-6 rounded-3xl bg-white dark:bg-neutral-950",
                                    "border border-neutral-200 dark:border-neutral-800",
                                    "hover:border-neutral-400 dark:hover:border-neutral-700",
                                    "transition-all duration-300 hover:shadow-xl"
                                )}
                            >
                                <div className="w-10 h-10 rounded-lg bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center mb-4 border border-neutral-100 dark:border-neutral-800 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                                    <feature.icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))
                    }
                </div>
            </div>
        </section>
    )
}