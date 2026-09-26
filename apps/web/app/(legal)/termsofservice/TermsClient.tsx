/**
 * Server component. It renders static legal text and has no state, no event handlers and
 * no motion.
 *
 * It carried `"use client"` until 2026-08-21, which was vestigial: the directive predates
 * `Reveal` being converted to a zero-JS server component, and nothing else in the file
 * ever needed it. The cost was roughly two hundred lines of legal prose crossing a client
 * boundary for no reason.

 */
import Link from "next/link"
import { Reveal } from "@/components/reveal"

export default function TermsOfService() {
    return (
            <div className="w-full bg-white dark:bg-neutral-950 font-sans selection:bg-neutral-100 dark:selection:bg-neutral-800">
                <Reveal fadeOnly className="max-w-7xl mx-auto px-6 py-16 md:py-24">
                    <div className="flex gap-16 items-start">
                        {/* Sidebar */}
                        {/* `sticky` lives on the ASIDE, not on a div inside it.
                            It was on the inner div, which never stuck: a sticky element
                            travels within its CONTAINING BLOCK, and that div's containing
                            block was the aside - whose height is its own content, because
                            the flex parent is `items-start`. Zero travel, so it behaved
                            like `static`.
                            On the aside itself the containing block becomes the flex
                            container, which is as tall as the article column, so it now has
                            the whole page to stick through. `self-start` keeps it from
                            stretching, which would break sticky the other way. */}
                        <aside className="hidden lg:block w-[260px] shrink-0 self-start sticky top-24">
                            <div>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-6">
                                    Legal documents
                                </p>
                                <nav className="space-y-1 mb-10">
                                    <span className="block px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                        Terms of Service
                                    </span>
                                    <Link
                                        href="/privacypolicy"
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
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-3">
                                        Questions?
                                    </p>
                                    <a
                                        href="mailto:legal@shipithq.com"
                                        className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors break-all"
                                    >
                                        legal@shipithq.com
                                    </a>
                                </div>
                            </div>
                        </aside>

                        {/* Main content */}
                        <main className="flex-1 min-w-0">
                            <div className="mb-12">
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Effective September 26, 2026</p>
                                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-none mb-6">
                                    Terms of <em>service.</em>
                                </h1>
                                <p className="text-base text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
                                    These terms govern your use of ShipItHQ. By using our platform, you agree to be bound by them. Please read carefully.
                                </p>
                            </div>

                            {/* TL;DR */}
                            <div className="mb-12 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-3">TL;DR</p>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    You own everything you create. Credits are purchased one-time and don&apos;t expire. You pay for what you use. If we make mistakes, our liability is capped at what you paid us.
                                </p>
                            </div>

                            <div className="space-y-0">
                                {/* Section 01 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">01</span>
                                        Your Account
                                    </h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                        You must be at least 13 years old to create an account. By registering, you confirm your information is accurate and complete. You are responsible for maintaining the security of your credentials and must notify us immediately of any unauthorized access. One person or entity may not maintain more than one free account.
                                    </p>
                                </div>

                                {/* Section 02 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">02</span>
                                        Credits &amp; Billing
                                    </h2>
                                    <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        <p>
                                            ShipItHQ uses a credit-based system for AI features and premium tools. Credits are purchased as one-time transactions and do not expire unless your account is terminated for a violation of these terms.
                                        </p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">No Expiration:</strong> Purchased credits persist indefinitely under a standing account.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Non-Refundable:</strong> All purchases are final except where required by law.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Non-Transferable:</strong> Credits cannot be sold, gifted, or exchanged for cash.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Section 03 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">03</span>
                                        Your Content &amp; Projects
                                    </h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                        You retain full ownership of all code, projects, and content you create or submit on ShipItHQ. We do not claim intellectual property rights over your work. By sharing content to public showcases, you grant ShipItHQ a limited, non-exclusive license to display that content for promotional and educational purposes only.
                                    </p>
                                </div>

                                {/* Section 04 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">04</span>
                                        AI Outputs
                                    </h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                        AI-generated content on our platform is provided as-is. We do not guarantee the accuracy, completeness, or fitness of AI outputs for any specific purpose. You are responsible for reviewing and validating any AI-generated code, documents, or suggestions before use in production environments. We do not use your content to train our AI models.
                                    </p>
                                </div>

                                {/* Section 05 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">05</span>
                                        Acceptable Use
                                    </h2>
                                    <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        <p>You agree not to engage in any of the following:</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li>Reverse engineering our AI models or assessment algorithms.</li>
                                            <li>Using bots or scripts to farm credits or manipulate metrics.</li>
                                            <li>Harassing, bullying, or intimidating other users.</li>
                                            <li>Posting content that infringes on intellectual property rights.</li>
                                            <li>Using the platform for any unlawful or fraudulent purpose.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Section 06 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">06</span>
                                        Hiring Rounds
                                    </h2>
                                    <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        <p>Hiring rounds let you take a company&apos;s assessment rounds for a role and, if you choose, send your results to that company.</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Nothing is sent without you:</strong> your results go to a company only when you press Send on that send, after seeing exactly what the company will receive. We keep a record of that consent: what was shared, when and with whom. You can withdraw a send until the company decides on it.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">AI assessment:</strong> some rounds (system design and voice rounds) are scored by AI against a published rubric; aptitude and coding rounds are scored automatically. Scores inform a company&apos;s decision and never make it: a person at the company decides every invite and every decline.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Voice rounds:</strong> a voice round is a spoken conversation with an AI interviewer. We ask for your consent before the first question, and the conversation is transcribed so it can be scored and, if you send it, read by the company.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Integrity:</strong> we record signals such as pasting and leaving the tab during a round, and show them to a company with your results. We do not watch you through your camera.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Unclaimed company pages:</strong> some company pages are built by ShipItHQ from the company&apos;s own public website and are marked &quot;Unclaimed - not affiliated with ShipItHQ&quot;. Their rounds are ShipItHQ&apos;s generic pipelines, for practice only, and not that company&apos;s hiring process. Results cannot be sent to a company until it has claimed and verified its page.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Companies:</strong> a company that receives results may use them only to assess you for the role you sent them for, and must not share them further.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Section 07 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">07</span>
                                        Termination
                                    </h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                        We may suspend or terminate your access immediately, without prior notice, if you breach these Terms. You may also delete your account at any time from Settings; deleting it withdraws any results you have sent and removes them from the companies that received them. Upon termination, your right to use the Service ceases immediately. Unused credits are forfeited upon termination for a terms violation.
                                    </p>
                                </div>

                                {/* Section 08 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">08</span>
                                        Disclaimers &amp; Liability
                                    </h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                        The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind. ShipItHQ makes no warranties regarding the accuracy of AI-generated outputs or the likelihood of any specific outcome. Our total liability to you for any claim arising from use of the Service is capped at the amount you paid us in the 12 months preceding the claim.
                                    </p>
                                </div>

                                {/* Section 09 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">09</span>
                                        Governing Law
                                    </h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                        These Terms are governed by and construed in accordance with applicable law. Any disputes arising under these Terms shall be resolved through binding arbitration, except where prohibited by law.
                                    </p>
                                </div>

                                {/* Section 10 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">10</span>
                                        Changes
                                    </h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                        We may update these Terms at any time. We will notify you of material changes via email or a prominent notice on the platform. Continued use of ShipItHQ after changes constitutes your acceptance of the updated Terms.
                                    </p>
                                </div>

                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                        Questions about these terms? Email us at{" "}
                                        <a href="mailto:legal@shipithq.com" className="text-neutral-900 dark:text-white underline">
                                            legal@shipithq.com
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </main>
                    </div>
                </Reveal>
            </div>
    )
}
