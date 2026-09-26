"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Plus } from "lucide-react"

/**
 * The one FAQ accordion. Landing page, topic hubs and comparison pages all use it.
 *
 * ── Why it was extracted ──
 *
 * There were two treatments. The landing page had this: bordered cards, a circular plus
 * that rotates to a cross, an animated height reveal. The hubs and comparison pages had a
 * plain `<details>` list I wrote separately, chosen because it needs no JavaScript.
 *
 * Zero-JS was the right instinct and the wrong call. A visitor moving from the landing page
 * to a comparison page met two different components answering the same kind of question,
 * and inconsistency across pages reads as carelessness far more loudly than a few kilobytes
 * of accordion reads as slowness. One component, everywhere.
 *
 * ── It renders the LIST only ──
 *
 * No heading, no section wrapper, no eyebrow. Each caller supplies its own chrome, because
 * the landing page puts the FAQ in a two-column layout with a sticky sidebar and the other
 * pages stack it under a plain heading. Baking a section in here would have forced one of
 * those to fight it.
 *
 * ── The answer must also be in the JSON-LD ──
 *
 * Every caller emits `FAQPage` from the SAME array it passes here. Google requires the
 * marked-up answer to match the visible one, and passing one list to two places is the only
 * way to guarantee that without a test. See `lib/schema.ts`.
 */

export interface FaqItem {
    question: string
    answer: string
}

export function FaqAccordion({ faqs, idPrefix = "faq" }: { faqs: readonly FaqItem[]; idPrefix?: string }) {
    const [openId, setOpenId] = useState<string | null>(null)

    return (
        <div className="space-y-2.5">
            {faqs.map((faq, i) => {
                const id = `${idPrefix}-${i}`
                const open = openId === id
                return (
                    <div
                        key={faq.question}
                        className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                    >
                        <button
                            type="button"
                            onClick={() => setOpenId(open ? null : id)}
                            aria-expanded={open}
                            aria-controls={`${id}-panel`}
                            className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left"
                        >
                            <span className="pr-6 text-base font-semibold text-neutral-900 dark:text-white">
                                {faq.question}
                            </span>
                            <span
                                aria-hidden
                                className={`flex-shrink-0 transition-transform duration-300 ${open ? "rotate-45" : "rotate-0"}`}
                            >
                                {open ? (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white">
                                        <Plus className="h-4 w-4 rotate-45" />
                                    </span>
                                ) : (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500 transition-colors group-hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:group-hover:bg-neutral-800">
                                        <Plus className="h-4 w-4" />
                                    </span>
                                )}
                            </span>
                        </button>
                        <AnimatePresence initial={false}>
                            {open && (
                                <motion.div
                                    id={`${id}-panel`}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                >
                                    <div className="px-5 pb-5 pt-0">
                                        <div className="mb-3 h-px w-full bg-neutral-100 dark:bg-neutral-800" />
                                        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )
            })}
        </div>
    )
}

export default FaqAccordion
