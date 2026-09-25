"use client"

import { 
    Mic, BrainCircuit, LineChart 
} from "lucide-react"

export default function InterviewSuite() {
    return (
        <section className="py-32 bg-neutral-950 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4 block">
                            Module: Interrogation
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
                            Autonomous Interview <br /> Intelligence
                        </h2>
                        <p className="text-neutral-400 text-lg mb-10 leading-relaxed">
                            Deploy AI agents to conduct technical screenings 24/7. Our system adapts questions in real-time based on candidate responses, testing depth of knowledge, not just memorization.
                        </p>
                        <div className="space-y-6">
                            {
                                [
                                    { icon: Mic, title: "Voice & Code Sync", desc: "Agents listen to explanation while analyzing live code execution." },
                                    { icon: BrainCircuit, title: "Behavioral Analysis", desc: "Detects confidence markers, hesitation, and problem-solving patterns." },
                                    { icon: LineChart, title: "Objective Scoring", desc: "Eliminate bias with standardized rubrics generated for every session." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                        <div className="shrink-0 w-10 h-10 rounded-lg bg-black flex items-center justify-center border border-white/20">
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                                            <p className="text-sm text-neutral-500">{item.desc}</p>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-neutral-900 to-transparent z-10" />
                        <div className="relative z-0 p-8 rounded-3xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-8 pb-8 border-b border-neutral-800">
                                <div className="flex gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-neutral-900" />
                                    <div className="w-3 h-3 rounded-full bg-neutral-900" />
                                </div>
                                <div className="text-[10px] font-mono text-neutral-500">LIVE SESSION: #8X92-A</div>
                            </div>
                            <div className="space-y-4 font-mono text-xs">
                                <div className="flex gap-4">
                                    <span className="text-neutral-600">01</span>
                                    <span className="text-neutral-800">const</span>
                                    <span className="text-neutral-800">optimizeGraph</span> = (nodes) ={">"} {"{"}
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-neutral-600">02</span>
                                    <span className="text-neutral-500 ml-4">{/* Analysis: O(n log n) complexity detected */}</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-neutral-600">03</span>
                                    <span className="text-neutral-500 ml-4">{/* Candidate is refactoring for memory safety... */}</span>
                                </div>
                            </div>
                            <div className="mt-8 p-4 rounded-xl bg-neutral-900/20 border border-neutral-900/50 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-neutral-900 animate-pulse" />
                                <span className="text-neutral-800 text-xs font-bold tracking-wide">PASSING THRESHOLD MET</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}