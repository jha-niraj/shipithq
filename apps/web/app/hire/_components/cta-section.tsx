"use client"

import { HIRING_LINKS } from "@/lib/site"
import {
    ArrowRight, Terminal
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"

export default function CtaSection() {
    return (
        <section className="py-32 bg-white dark:bg-neutral-950 relative overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
            <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <Terminal className="w-8 h-8 text-neutral-900 dark:text-white" />
                </div>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-neutral-900 dark:text-white mb-8">
                    Ready to upgrade your <br /> hiring infrastructure?
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a href={HIRING_LINKS.signup}>
                        <Button className="cursor-pointer h-14 px-8 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold text-lg">
                            Initialize Workspace
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </a>
                    <a href={HIRING_LINKS.contact}>
                        <Button variant="outline" className="cursor-pointer h-14 px-8 rounded-full border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 dark:bg-white font-bold text-lg">
                            Contact Engineering
                        </Button>
                    </a>
                </div>
            </div>
        </section>
    )
}