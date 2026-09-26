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

export default function PrivacyPolicy() {
    const promises = [
        {
            title: "We don't train on your data",
            description: "Your code, prompts, and projects are never used to train our AI models.",
        },
        {
            title: "Encrypted at rest and in transit",
            description: "All data is encrypted using industry-standard AES-256 at rest and TLS in transit.",
        },
        {
            title: "You can export anything, anytime",
            description: "Download all your projects, outputs, and account data at any time with one click.",
        },
        {
            title: "You can delete it all",
            description: "Request full account and data deletion at any time. We honor it within 30 days.",
        },
    ]

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
                                    <Link
                                        href="/termsofservice"
                                        className="block px-3 py-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white dark:text-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900 dark:bg-white rounded-lg transition-colors"
                                    >
                                        Terms of Service
                                    </Link>
                                    <span className="block px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                        Privacy Policy
                                    </span>
                                    <a
                                        href="mailto:privacy@shipithq.com"
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
                                        href="mailto:privacy@shipithq.com"
                                        className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors break-all"
                                    >
                                        privacy@shipithq.com
                                    </a>
                                </div>
                            </div>
                        </aside>

                        {/* Main content */}
                        <main className="flex-1 min-w-0">
                            <div className="mb-12">
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Effective September 26, 2026</p>
                                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-none mb-6">
                                    Privacy <em>policy.</em>
                                </h1>
                                <p className="text-base text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
                                    We built ShipItHQ with privacy in mind from day one. Here&apos;s exactly what we collect, why we collect it, and what you can do about it.
                                </p>
                            </div>

                            {/* Promise grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                                {promises.map((p, i) => (
                                    <div
                                        key={i}
                                        className="p-5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl"
                                    >
                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">{p.title}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{p.description}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-0">
                                {/* Section 01 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">01</span>
                                        What We Collect
                                    </h2>
                                    <div className="pl-8">
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                                            We collect only what we need to provide the service.
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b border-neutral-200 dark:border-neutral-800">
                                                        <th className="text-left py-2 pr-4 text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Category</th>
                                                        <th className="text-left py-2 pr-4 text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Why</th>
                                                        <th className="text-left py-2 text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Retention</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                                    <tr>
                                                        <td className="py-3 pr-4 text-neutral-700 dark:text-neutral-300">Account info (name, email)</td>
                                                        <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400">Authentication &amp; communication</td>
                                                        <td className="py-3 text-neutral-500 dark:text-neutral-400">Until account deletion</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 pr-4 text-neutral-700 dark:text-neutral-300">Usage &amp; activity logs</td>
                                                        <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400">Platform improvement &amp; fraud prevention</td>
                                                        <td className="py-3 text-neutral-500 dark:text-neutral-400">90 days rolling</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 pr-4 text-neutral-700 dark:text-neutral-300">Payment records</td>
                                                        <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400">Billing &amp; legal compliance</td>
                                                        <td className="py-3 text-neutral-500 dark:text-neutral-400">7 years (legal requirement)</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 pr-4 text-neutral-700 dark:text-neutral-300">Device &amp; IP data</td>
                                                        <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400">Security &amp; abuse prevention</td>
                                                        <td className="py-3 text-neutral-500 dark:text-neutral-400">30 days rolling</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 02 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">02</span>
                                        Hiring Rounds
                                    </h2>
                                    <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        <p>When you take a company&apos;s hiring rounds, we keep your answers, code, diagrams, voice transcripts, scores and integrity signals (pastes and tab changes) for each attempt.</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Sending:</strong> a company sees your results only after you send them. It receives the rounds you chose to include, your profile (name, headline, skills and the projects and resume you picked) and, once it invites you, your email address.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">AI processing:</strong> to score written and spoken answers, the content of the answer is processed by our AI providers. Voice rounds are processed by our speech provider, Sarvam AI, to hold the conversation and produce the transcript. These providers process it on our behalf, to provide the round.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Withdrawn or declined:</strong> if you withdraw a send or a company declines it, it leaves the company&apos;s view straight away, and the copy of your results made for that company is deleted after 90 days. We keep a minimal record (the dates and the decision) so the company&apos;s history stays consistent.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Deleting your account:</strong> deletes your account and every send at once, not after 90 days. Message threads with companies stay on the company&apos;s side, marked &quot;Account deleted&quot; and closed. Payment records are kept without your name, as the law requires.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Section 03 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">03</span>
                                        Who We Share With
                                    </h2>
                                    <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        <p>We do not sell your personal data. Ever. We share data only with:</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Infrastructure providers</strong> - cloud hosting and database services under strict data processing agreements.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Payment processors</strong> - we use third-party processors and never store your card details ourselves.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Legal authorities</strong> - only when required by law or valid legal process.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Section 04 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">04</span>
                                        Your Rights
                                    </h2>
                                    <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        <p>Depending on your location, you have the right to:</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li>Access and receive a copy of all personal data we hold about you.</li>
                                            <li>Correct any inaccurate personal data.</li>
                                            <li>Delete your account and associated data yourself, from Settings, at any time.</li>
                                            <li>Object to or restrict certain processing activities.</li>
                                            <li>Data portability - export everything in a machine-readable format.</li>
                                        </ul>
                                        <p>To exercise any of these rights, email us at <a href="mailto:privacy@shipithq.com" className="text-neutral-900 dark:text-white underline">privacy@shipithq.com</a>.</p>
                                    </div>
                                </div>

                                {/* Section 05 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">05</span>
                                        Cookies &amp; Analytics
                                    </h2>
                                    <div className="pl-8 space-y-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        <p>We use a minimal set of cookies to operate the platform:</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Session cookies</strong> - to keep you logged in during your visit.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Preference cookies</strong> - to remember settings like dark mode.</li>
                                            <li><strong className="text-neutral-700 dark:text-neutral-300">Analytics</strong> - privacy-preserving, aggregated usage metrics only. No cross-site tracking.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Section 06 */}
                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <h2 className="flex items-center text-lg font-bold text-neutral-900 dark:text-white mb-4">
                                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 mr-4">06</span>
                                        Contact
                                    </h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed pl-8">
                                        For privacy-related inquiries or to exercise your rights, contact our Data Protection team at{" "}
                                        <a href="mailto:privacy@shipithq.com" className="text-neutral-900 dark:text-white underline">
                                            privacy@shipithq.com
                                        </a>
                                        . We aim to respond within 5 business days.
                                    </p>
                                </div>

                                <div className="py-10 border-t border-neutral-200 dark:border-neutral-800">
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                        Questions about our privacy practices? Email{" "}
                                        <a href="mailto:privacy@shipithq.com" className="text-neutral-900 dark:text-white underline">
                                            privacy@shipithq.com
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
