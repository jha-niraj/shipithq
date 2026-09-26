"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown, Code2, Copy, CornerDownRight, RotateCcw } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { CodeTab, DecisionLeaf } from "@/content/incidents/types"
import { EASE, Inline, Reveal, Sources, useCase } from "./primitives"
import { useProgress } from "./case-progress"
import { useGate } from "./sign-in-gate"

/**
 * Part five, the fix (plan/incidents INC-3): the decision tree walked one question
 * at a time, the patterns it leads to (each saying what it does NOT fix), the twist,
 * and what bites after the fix ships. Code is diagrams-first: always collapsed, never
 * needed to follow the case.
 */
export function Fix() {
    const c = useCase()
    return (
        <div className="space-y-16">
            <DecisionTree />

            <div className="grid gap-4 md:grid-cols-2">
                {c.fix.patterns.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 2) * 80} className="min-w-0">
                        <article className="flex h-full flex-col rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800">
                            <h3 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">{p.title}</h3>
                            <p className="mt-1 text-[13.5px] leading-6 text-neutral-500 dark:text-neutral-400"><Inline text={p.when} /></p>
                            <p className="mt-3 flex-1 text-[15px] leading-7 text-neutral-700 dark:text-neutral-300"><Inline text={p.body} /></p>
                            {p.doesNotFix && (
                                <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-[13.5px] leading-6 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                                    <span className="font-semibold">Does not fix:</span> <Inline text={p.doesNotFix} />
                                </p>
                            )}
                            {p.code && <CodeTabs tabs={p.code} className="mt-4" />}
                            <Sources refs={p.sources} className="mt-4" />
                        </article>
                    </Reveal>
                ))}
            </div>

            <Twist />

            {c.postmortem && <Postmortem />}

            <div>
                <Reveal className="max-w-[44rem]">
                    <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">What bites after the fix ships</h3>
                    <p className="mt-2 text-[15px] leading-7 text-neutral-600 dark:text-neutral-400">Four things that are invisible until the alarm is live. Each is its own task.</p>
                </Reveal>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {c.fix.afterShip.map((a, i) => (
                        <Reveal key={a.title} delay={(i % 2) * 80}>
                            <div className="h-full rounded-2xl bg-neutral-50 p-5 dark:bg-neutral-900">
                                <p className="font-mono text-[11px] text-neutral-500">{String(i + 1).padStart(2, "0")}</p>
                                <p className="mt-1 text-[16px] font-semibold text-neutral-900 dark:text-white">{a.title}</p>
                                <p className="mt-2 text-[14.5px] leading-6 text-neutral-700 dark:text-neutral-300"><Inline text={a.body} /></p>
                                <Sources refs={a.sources} className="mt-3" />
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ── The decision tree ──────────────────────────────────────────────────────

function DecisionTree() {
    const c = useCase()
    const { gate } = useGate()
    const { dispatch } = useProgress()
    const { tree } = c.fix
    const [path, setPath] = useState<{ node: string; yes: boolean }[]>([])

    const nodeById = (id: string) => tree.nodes.find((n) => n.id === id)
    const leafById = (id: string) => tree.leaves.find((l) => l.id === id)
    const currentId = path.length ? (path[path.length - 1]!.yes ? nodeById(path[path.length - 1]!.node)!.yes : nodeById(path[path.length - 1]!.node)!.no) : tree.start
    const current = nodeById(currentId)
    const reached = current ? null : leafById(currentId) ?? null

    const answer = (yes: boolean) => gate(() => {
        const next = [...path, { node: currentId, yes }]
        setPath(next)
        const n = nodeById(currentId)!
        const target = yes ? n.yes : n.no
        if (leafById(target)) dispatch({ type: "treeLeaf", leaf: target })
    }, "fix")

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
            <Reveal className="min-w-0">
                <div className="rounded-3xl border border-neutral-900 p-5 sm:p-6 dark:border-white/80">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Walk it for any long path</p>
                        {path.length > 0 && (
                            <button type="button" onClick={() => setPath([])} className="inline-flex items-center gap-1.5 text-[12.5px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                                <RotateCcw className="size-3.5" aria-hidden /> Start over
                            </button>
                        )}
                    </div>
                    <ol className="mt-4 space-y-2">
                        {path.map((p) => (
                            <li key={p.node} className="flex items-start gap-2 text-[14px] leading-6 text-neutral-500 dark:text-neutral-400">
                                <CornerDownRight className="mt-1 size-3.5 shrink-0" aria-hidden />
                                <span>{nodeById(p.node)!.question} <span className="font-medium text-neutral-900 dark:text-white">{p.yes ? "Yes" : "No"}</span></span>
                            </li>
                        ))}
                    </ol>
                    <div className="relative mt-4 min-h-[8.5rem]">
                        <AnimatePresence mode="wait" initial={false}>
                            {current ? (
                                <motion.div key={current.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3, ease: EASE }}>
                                    <p className="text-xl font-semibold leading-snug tracking-tight text-neutral-900 dark:text-white">{current.question}</p>
                                    <div className="mt-5 flex gap-2">
                                        {[true, false].map((yes) => (
                                            <button
                                                key={String(yes)}
                                                type="button"
                                                onClick={() => answer(yes)}
                                                className={cn(
                                                    "h-11 flex-1 rounded-2xl border text-[15px] font-medium transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5",
                                                    yes ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 text-neutral-900 hover:border-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:border-white",
                                                )}
                                            >
                                                {yes ? "Yes" : "No"}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : reached && (
                                <motion.div key={reached.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Use this</p>
                                    <p className="mt-1 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{reached.title}</p>
                                    <p className="mt-2 text-[15px] leading-7 text-neutral-700 dark:text-neutral-300"><Inline text={reached.body} /></p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </Reveal>

            {/* Every destination, readable without walking the tree. */}
            <Reveal delay={80} className="min-w-0">
                <ol className="space-y-2">
                    {tree.leaves.map((l: DecisionLeaf) => {
                        const on = reached?.id === l.id
                        return (
                            <li key={l.id} className={cn("rounded-2xl border px-4 py-3 transition-[border-color,background-color] duration-300", on ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40" : "border-neutral-200 dark:border-neutral-800")}>
                                <p className="flex items-center gap-2 text-[15px] font-semibold text-neutral-900 dark:text-white">
                                    {on && <Check className="size-4 text-emerald-600" aria-hidden />}
                                    {l.title}
                                </p>
                                <p className="mt-0.5 text-[13.5px] leading-6 text-neutral-600 dark:text-neutral-400"><Inline text={l.body} /></p>
                            </li>
                        )
                    })}
                </ol>
            </Reveal>
        </div>
    )
}

// ── The postmortem ─────────────────────────────────────────────────────────

function Postmortem() {
    const pm = useCase().postmortem!
    return (
        <Reveal>
            <article className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">The postmortem</p>
                    <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">Blameless · written the Monday after</p>
                </div>
                <p className="mt-3 max-w-[44rem] text-[16px] leading-7 text-neutral-800 dark:text-neutral-200"><Inline text={pm.summary} /></p>
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                    {pm.sections.map((sec) => (
                        <section key={sec.title}>
                            <h4 className="text-[14px] font-semibold text-neutral-900 dark:text-white">{sec.title}</h4>
                            <ul className="mt-2 space-y-2">
                                {sec.items.map((it) => (
                                    <li key={it} className="flex gap-2 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">
                                        <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-neutral-400" />
                                        <span><Inline text={it} /></span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
                <Sources refs={pm.sources} className="mt-6" />
            </article>
        </Reveal>
    )
}

// ── The twist ──────────────────────────────────────────────────────────────

function Twist() {
    const c = useCase()
    const tw = c.fix.twist
    return (
        <Reveal>
            <article className="overflow-hidden rounded-[28px] border border-neutral-900 dark:border-white/70">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="p-6 sm:p-8">
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">The twist</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{tw.title}</h3>
                        <div className="mt-4 space-y-4 text-[15.5px] leading-7 text-neutral-700 dark:text-neutral-300">
                            {tw.body.map((p, i) => <p key={i}><Inline text={p} /></p>)}
                        </div>
                        <Sources refs={tw.sources} className="mt-5" />
                    </div>
                    <div className="flex flex-col justify-center gap-4 bg-neutral-950 p-6 text-white sm:p-8">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-neutral-400">What it looks like</p>
                        <p className="font-mono text-[14px] leading-6 text-rose-300">{tw.signature}</p>
                        <CodeTabs tabs={tw.code} dark />
                    </div>
                </div>
            </article>
        </Reveal>
    )
}

// ── Code ────────────────────────────────────────────────────────────────────

/** Collapsed by default: the case never needs the code to be followed. */
export function CodeTabs({ tabs, className, dark = false }: { tabs: CodeTab[]; className?: string; dark?: boolean }) {
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const [copied, setCopied] = useState(false)
    const tab = tabs[active]!

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(tab.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch (error: unknown) {
            if (error instanceof Error) console.warn("[incidents] copy failed:", error.message)
        }
    }

    return (
        <div className={className}>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={cn("inline-flex items-center gap-2 text-[13px] font-medium", dark ? "text-neutral-300 hover:text-white" : "text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white")}
            >
                <Code2 className="size-4" aria-hidden />
                {open ? "Hide the code" : "Show the code"}
                <ChevronDown className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div key="code" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
                        <div className="mt-3 overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
                                <div role="tablist" className="flex gap-1 overflow-x-auto">
                                    {tabs.map((t, i) => (
                                        <button
                                            key={t.label}
                                            role="tab"
                                            type="button"
                                            aria-selected={i === active}
                                            onClick={() => setActive(i)}
                                            className={cn("whitespace-nowrap rounded-lg px-2.5 py-1 font-mono text-[11.5px] transition-colors", i === active ? "bg-white/10 text-white" : "text-neutral-400 hover:text-neutral-200")}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                                <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] text-neutral-400 hover:text-white">
                                    {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>
                            <pre className="max-h-[26rem] overflow-auto p-4 font-mono text-[12.5px] leading-[1.7] text-neutral-200"><code>{tab.code}</code></pre>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
