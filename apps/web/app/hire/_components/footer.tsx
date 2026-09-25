"use client";

import Link from "next/link";
import { HIRING_URL, HIRING_LINKS } from "@/lib/site";
import {
    Twitter, Linkedin, Github, Briefcase
} from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/hire" className="flex items-center gap-3 mb-6 group">
                            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center transition-transform group-hover:scale-105">
                                <Briefcase className="w-4 h-4 text-white dark:text-black" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white leading-none">
                                    ShipItHQ Hiring
                                </span>
                                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-1">
                                    Recruitment Platform
                                </span>
                            </div>
                        </Link>
                        <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
                            AI-powered recruitment platform for tech companies.<br />
                            Find pre-vetted engineers with verified skills.
                        </p>
                    </div>
                    <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
                        <div>
                            <h4 className="font-mono text-[10px] uppercase tracking-widest text-neutral-900 dark:text-white mb-6">Platform</h4>
                            <ul className="space-y-4 text-sm text-neutral-500">
                                <li><a href={`${HIRING_URL}/jobs`} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Job Postings</a></li>
                                <li><a href={`${HIRING_URL}/applications`} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Applications</a></li>
                                <li><a href={`${HIRING_URL}/interview-config`} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Interview Setup</a></li>
                                <li><Link href="/hire#pricing" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-mono text-[10px] uppercase tracking-widest text-neutral-900 dark:text-white mb-6">Resources</h4>
                            <ul className="space-y-4 text-sm text-neutral-500">
                                <li><Link href="/" className="hover:text-neutral-900 dark:hover:text-white transition-colors">ShipItHQ for students</Link></li>
                                <li><a href={HIRING_LINKS.help} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Help Center</a></li>
                                <li><Link href="/privacypolicy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/termsofservice" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-mono text-[10px] uppercase tracking-widest text-neutral-900 dark:text-white mb-6">Connect</h4>
                            <div className="flex gap-4">
                                <Link href="https://twitter.com/shipithq" target="_blank" className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><Twitter className="w-5 h-5" /></Link>
                                <Link href="https://github.com/shipithq" target="_blank" className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><Github className="w-5 h-5" /></Link>
                                <Link href="https://linkedin.com/company/shipithq" target="_blank" className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><Linkedin className="w-5 h-5" /></Link>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-[10px] text-neutral-500 font-mono">
                        © {new Date().getFullYear()} ShipItHQ - All rights reserved
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-900 animate-pulse" />
                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Platform Online</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}