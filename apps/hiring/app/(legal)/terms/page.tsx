"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-dvh bg-white dark:bg-neutral-950 font-sans selection:bg-neutral-100 dark:selection:bg-neutral-800">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-7xl mx-auto px-6 py-16 md:py-24"
            >
                <div className="flex gap-16 items-start">
                    {/* Sidebar */}
                    <aside className="hidden lg:block w-[260px] shrink-0">
                        <div className="sticky top-24">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2">
                                ShipItHQ Hiring
                            </p>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-6">
                                Legal documents
                            </p>
                            <nav className="space-y-1 mb-10">
                                <span className="block px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                    Terms of Service
                                </span>
                                <Link
                                    href="/privacy"
                                    className="block px-3 py-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white dark:text-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900 dark:bg-white rounded-lg transition-colors"
                                >
                                    Privacy Policy
                                </Link>
                                <a
                                    href="mailto:legal@shipithq.com"
                                    className="block px-3 py-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white dark:text-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900 dark:bg-white rounded-lg transition-colors"
                                >
                                    Contact
                                </a>
                            </nav>
                            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-3">
                                    Questions?
                                </p>
                                <a
                                    href="mailto:legal@shipithq.com"
                                    className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors break-all"
                                >
                                    legal@shipithq.com
                                </a>
                            </div>
                        </div>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 min-w-0">
                        <div className="mb-12">
                            <p className="text-sm text-neutral-400 mb-6">Last updated: September 26, 2026</p>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-none mb-6">
                                Terms of <em>service.</em>
                            </h1>
                            <p className="text-base text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
                                These terms govern your use of ShipItHQ Hiring. By using our platform, you agree to be bound by them.
                            </p>
                        </div>

                        <div className="space-y-0">
                            {/* Section 01 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">01</span>
                                    Acceptance of Terms
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                    By accessing or using ShipItHQ Hiring, you agree to be bound by these Terms of Service.
                                    If you disagree with any part of the terms, you may not access the service.
                                </p>
                            </div>

                            {/* Section 02 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">02</span>
                                    Platform Services
                                </h2>
                                <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    <p>
                                        ShipItHQ Hiring provides a technical hiring platform that connects companies
                                        with pre-vetted engineering candidates. Our services include:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>Candidate sourcing and vetting</li>
                                        <li>Technical assessment tools</li>
                                        <li>AI-powered interview systems</li>
                                        <li>Application tracking and management</li>
                                        <li>Analytics and reporting</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Section 03 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">03</span>
                                    Account Registration
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                    To use our platform, you must register a company account and provide accurate information.
                                    You are responsible for maintaining the confidentiality of your account credentials
                                    and for all activities under your account.
                                </p>
                            </div>

                            {/* Section 04 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">04</span>
                                    User Conduct
                                </h2>
                                <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    <p>You agree not to:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>Post false, misleading, or discriminatory job listings</li>
                                        <li>Misuse candidate information or violate their privacy</li>
                                        <li>Attempt to circumvent platform fees or security measures</li>
                                        <li>Use the platform for any unlawful purpose</li>
                                        <li>Harass, abuse, or harm other users</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Section 05 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">05</span>
                                    Candidate Results
                                </h2>
                                <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    <p>Candidates take your rounds on ShipItHQ and choose, one send at a time, to share their results with you.</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong className="text-neutral-700 dark:text-neutral-300">One purpose:</strong> use a candidate&apos;s results only to assess them for the role they sent them for. Do not export, resell or share them outside your team.</li>
                                        <li><strong className="text-neutral-700 dark:text-neutral-300">A person decides:</strong> AI scores and integrity signals inform your decision; they must not be the only basis for it. Someone on your team decides every invite and every decline, and remains responsible for it, including under the laws on discrimination that apply to you.</li>
                                        <li><strong className="text-neutral-700 dark:text-neutral-300">Withdrawal and retention:</strong> a candidate can withdraw a send until you decide on it, and it then leaves your view. Withdrawn and declined results are deleted after 90 days, and at once if the candidate deletes their account.</li>
                                        <li><strong className="text-neutral-700 dark:text-neutral-300">Your page:</strong> until you claim and verify your company page, it is marked &quot;Unclaimed - not affiliated with ShipItHQ&quot;, shows ShipItHQ&apos;s generic rounds, and cannot receive results. Claiming it needs a work email on your company&apos;s domain and our approval.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Section 06 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">06</span>
                                    Fees and Payment
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                    Subscription fees are billed according to your selected plan. All fees are non-refundable
                                    unless otherwise specified. We reserve the right to modify pricing with 30 days notice.
                                </p>
                            </div>

                            {/* Section 07 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">07</span>
                                    Quality Guarantee
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                    We offer a 30-day replacement guarantee for candidates hired through our platform.
                                    If a hire doesn&apos;t meet expectations within 30 days, we&apos;ll provide replacement
                                    candidates at no additional cost.
                                </p>
                            </div>

                            {/* Section 08 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">08</span>
                                    Intellectual Property
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                    The platform, including its original content, features, and functionality,
                                    is owned by ShipItHQ and protected by international copyright, trademark,
                                    and other intellectual property laws.
                                </p>
                            </div>

                            {/* Section 09 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">09</span>
                                    Limitation of Liability
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                    ShipItHQ Hiring shall not be liable for any indirect, incidental, special,
                                    consequential, or punitive damages resulting from your use of the service.
                                </p>
                            </div>

                            {/* Section 10 */}
                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                    <span className="font-mono text-xs text-neutral-400 mr-4">10</span>
                                    Termination
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                    We may terminate or suspend your account immediately for any breach of these Terms.
                                    Upon termination, your right to use the platform will cease immediately.
                                </p>
                            </div>

                            <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    Questions about these Terms? Contact us at{" "}
                                    <a href="mailto:legal@shipithq.com" className="text-neutral-900 dark:text-white underline">
                                        legal@shipithq.com
                                    </a>
                                </p>
                            </div>
                        </div>
                    </main>
                </div>
            </motion.div>
        </div>
    );
}
