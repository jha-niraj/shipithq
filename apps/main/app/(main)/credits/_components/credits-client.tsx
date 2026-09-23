'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import TransactionsClient from './transactions-panel'
import { Button } from '@repo/ui/components/ui/button'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Badge } from '@repo/ui/components/ui/badge'
import { AnimatedIcon } from '@repo/ui/components/animated-icons'
import { cn } from '@repo/ui/lib/utils'
import { Plus, Receipt, Gift, X, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import type { CreditsOverview } from '@/actions/(main)/credits/credits.action'

/**
 * Balance, purchases, and the full ledger. CR-11.
 *
 * The ledger is the point. Definition-of-done 2 promises every credit has a row
 * explaining where it came from; this is the first place a user can read them.
 */

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

function money(amount: string, currency: string) {
    // `amount` is a string because the column is `decimal(10,2)` - see the note
    // on CreditPurchaseRow. Parse once, here, and keep two places so 12.5 does
    // not render as "12.5" next to 12.00.
    const n = Number.parseFloat(amount)
    const symbol = CURRENCY_SYMBOL[currency] ?? ''
    return Number.isFinite(n) ? `${symbol}${n.toFixed(2)}` : `${symbol}${amount}`
}

/** 10000 -> "10k". Long ticks are what clipped the axis in the first place. */
function compactTick(v: number): string {
    return v >= 1000 ? `${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k` : String(v)
}

function when(d: Date | string) {
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CreditsClient({ data, error }: { data: CreditsOverview | null; error: string | null }) {
    // ── History panel ──
    //
    // Same shape as the AI rail in app/(main)/_components/main-shell.tsx, and the same lesson:
    // the width is applied with NO transition while dragging. Animating it
    // during a drag starts a new transition on every mousemove, so the panel
    // chases the cursor and settles late, which reads as it moving on its own.
    // Open on arrival when the URL asks for a tab. The sidebar's Referrals entry
    // links to `/credits?tab=referrals`, and the panel is where referrals now live -
    // landing on a closed panel would make that link look broken. Read in the
    // initialiser, not an effect, so the panel is open on the first paint rather
    // than flicking open after it; `transactions-panel` reads the same param for
    // which tab to start on, so both halves of the deep link agree.
    const [historyOpen, setHistoryOpen] = useState(() => {
        if (typeof window === 'undefined') return false
        return new URLSearchParams(window.location.search).has('tab')
    })
    const [historyWidth, setHistoryWidth] = useState(520)
    const [historyResizing, setHistoryResizing] = useState(false)

    const clampHistory = (w: number) => Math.min(Math.max(w, 380), 900)

    const startHistoryResize = useCallback((startX: number, startWidth: number) => {
        setHistoryResizing(true)
        // Docked RIGHT, so dragging left (smaller clientX) widens it.
        const move = (clientX: number) => setHistoryWidth(clampHistory(startWidth + (startX - clientX)))
        const onMouseMove = (e: MouseEvent) => { e.preventDefault(); move(e.clientX) }
        const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; if (t) move(t.clientX) }
        const stop = () => {
            setHistoryResizing(false)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', stop)
            window.removeEventListener('touchmove', onTouchMove)
            window.removeEventListener('touchend', stop)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', stop)
        window.addEventListener('touchmove', onTouchMove, { passive: true })
        window.addEventListener('touchend', stop)
        // Without these the drag selects page text and the cursor flickers on
        // every child it crosses.
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }, [])

    if (error || !data) {
        return (
            <div className="flex h-dvh items-center justify-center p-8">
                <div className="max-w-sm text-center">
                    <AnimatedIcon name="alert" size={40} motion="always" className="mx-auto mb-4 text-neutral-500 dark:text-neutral-400" />
                    <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Could not load your credits</h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{error ?? 'Something went wrong.'}</p>
                </div>
            </div>
        )
    }

    const { balance, totalSpent, totalAdded, purchases, usage, trend } = data

    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <header className="shrink-0 border-b border-neutral-200 px-6 py-5 dark:border-neutral-800">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Credits</h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Your balance, what you have bought, and where every credit went.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Bounty lives on BOTH pages: it is an offer, and an offer
                            belongs next to the price as well as in the wallet. */}
                        {/* History opens a docked PANEL, not an inline section.
                            It was inlined and that was wrong: reviewing what you
                            spent is something you do while looking at something
                            else, and a panel can be opened and dismissed without
                            losing your place on the page. */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHistoryOpen((v) => !v)}
                            aria-pressed={historyOpen}
                            className="cursor-pointer gap-1.5"
                        >
                            <Receipt className="h-4 w-4" />
                            History
                        </Button>
                        <Link href="/purchase?bounty=1">
                            <Button variant="outline" size="sm" className="cursor-pointer gap-1.5">
                                <Gift className="h-4 w-4" />
                                Bounty Program
                            </Button>
                        </Link>
                        <Link href="/purchase">
                            <Button size="sm" className="cursor-pointer gap-1.5">
                                <Plus className="h-4 w-4" />
                                Buy credits
                            </Button>
                        </Link>
                    </div>
                </div>

                <StatBand
                    cols={3}
                    className="mt-5"
                    items={[
                        { icon: Wallet, label: "Available", value: balance.toLocaleString() },
                        { icon: ArrowDownLeft, label: "Total added", value: totalAdded.toLocaleString() },
                        { icon: ArrowUpRight, label: "Total spent", value: totalSpent.toLocaleString() },
                    ]}
                />
            </header>

            <ScrollArea reflow className="min-h-0 min-w-0 flex-1">
                <div className="space-y-10 p-6">
                    {/* ── Usage by feature ──────────────────────────────────────
                        Above purchases on purpose: "what did I spend it on" is
                        the question this page exists to answer, and purchases are
                        the shorter, rarer list. */}
                    <section>
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Usage by feature</h2>
                        <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">
                            Credits spent per feature, with refunds already netted off.
                        </p>
                        {usage.length === 0 ? (
                            <Empty
                                icon="empty-search"
                                title="Nothing spent yet"
                                body="Once you run a generation, what it cost shows up here."
                            />
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-neutral-50 text-left text-xs text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-400">
                                            <tr>
                                                <th className="px-4 py-2.5 font-medium">Feature</th>
                                                <th className="px-4 py-2.5 font-medium">Uses</th>
                                                <th className="w-1/2 px-4 py-2.5 font-medium">Share of spend</th>
                                                <th className="px-4 py-2.5 text-right font-medium">Credits</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usage.map((u) => (
                                                <tr key={u.feature} className="border-t border-neutral-200 dark:border-neutral-800">
                                                    <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{u.feature}</td>
                                                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.uses}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                                                {/* A minimum width so a 0.4% row is still a
                                                                    visible mark rather than an empty track
                                                                    the eye reads as "no data". */}
                                                                <div
                                                                    className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100"
                                                                    style={{ width: `${Math.max(u.percent, u.credits > 0 ? 2 : 0)}%` }}
                                                                />
                                                            </div>
                                                            <span className="w-12 shrink-0 text-right font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                                                {u.percent.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-neutral-900 dark:text-neutral-100">
                                                        {u.credits.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ── Spend trend ───────────────────────────────────────────
                        Zero-filled in the action, so a quiet week draws a flat
                        line along the axis rather than a slope between two
                        distant spends. */}
                    <section>
                        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Credits over time</h2>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    What you spent and what you topped up, last 30 days.
                                </p>
                            </div>
                            {/* A legend, because two unlabelled monochrome lines are a
                                puzzle. Solid is money out, dashed is money in. */}
                            <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-0.5 w-4 rounded bg-neutral-900 dark:bg-neutral-100" />
                                    Spent <span className="text-neutral-500 dark:text-neutral-500">(left)</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-0.5 w-4 rounded bg-neutral-400 dark:bg-neutral-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg,currentColor 0 4px,transparent 4px 7px)' }} />
                                    Added <span className="text-neutral-500 dark:text-neutral-500">(right)</span>
                                </span>
                            </div>
                        </div>
                        {/* recharts writes `fill`/`stroke` as real SVG attributes, so it
                            cannot use `currentColor` or a Tailwind class. The two inks are
                            declared here as CSS variables and flipped for dark mode, which
                            keeps the chart monochrome in both themes without a JS theme read. */}
                        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 [--credit-axis:#525252] [--credit-ink:#171717] dark:[--credit-axis:#a3a3a3] dark:[--credit-ink:#f5f5f5]">
                            <div className="h-[26rem] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <defs>
                                            {/* `currentColor` is not available to recharts - it writes
                                                `fill` as a real attribute - so the ramp is defined once
                                                and the stroke colour comes from a CSS variable set on
                                                the wrapper below. */}
                                            <linearGradient id="creditSpend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--credit-ink)" stopOpacity={0.22} />
                                                <stop offset="100%" stopColor="var(--credit-ink)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                            tick={{ fontSize: 12, fill: 'var(--credit-axis)' }}
                                            axisLine={false}
                                            tickLine={false}
                                            minTickGap={28}
                                        />
                                        {/* `width={36}` clipped the label: a balance of 10,000
                                            rendered as "0000", which is not a smaller number, it
                                            is a WRONG one. Two fixes, because either alone is
                                            fragile - a compact formatter so five digits become
                                            "10k", and enough width that a long tick still fits. */}
                                        {/* TWO axes, and this is the difference between a
                                            readable chart and a flat line.
                                            Spending is in single digits to tens of credits;
                                            a top-up is thousands. On one shared linear axis
                                            the 10,000 grant sets the scale and every spend
                                            collapses onto the zero line - the screenshot that
                                            prompted this showed exactly that.
                                            Each series now gets an axis scaled to its own
                                            data: spent on the left, added on the right. */}
                                        <YAxis
                                            yAxisId="spent"
                                            tick={{ fontSize: 12, fill: 'var(--credit-axis)' }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={48}
                                            allowDecimals={false}
                                            tickFormatter={compactTick}
                                        />
                                        <YAxis
                                            yAxisId="added"
                                            orientation="right"
                                            tick={{ fontSize: 12, fill: 'var(--credit-axis)' }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={48}
                                            allowDecimals={false}
                                            tickFormatter={compactTick}
                                        />
                                        <Tooltip
                                            cursor={{ stroke: 'var(--credit-axis)', strokeDasharray: '3 3' }}
                                            contentStyle={{
                                                background: 'var(--popover)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 10,
                                                fontSize: 12,
                                                color: 'var(--popover-foreground)',
                                            }}
                                            labelFormatter={(d) => new Date(String(d)).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                                            formatter={(v, name) => [`${Number(v).toLocaleString()} credits`, String(name)] as [string, string]}
                                        />
                                        <Area
                                            yAxisId="spent"
                                            type="monotone"
                                            dataKey="credits"
                                            name="Spent"
                                            stroke="var(--credit-ink)"
                                            strokeWidth={2}
                                            fill="url(#creditSpend)"
                                        />
                                        {/* Top-ups are spiky by nature - one purchase, then
                                            nothing for weeks - so this is a line with no fill.
                                            Filling it would put a solid block under a single
                                            day and drown the spend curve underneath. */}
                                        <Area
                                            yAxisId="added"
                                            type="monotone"
                                            dataKey="added"
                                            name="Added"
                                            stroke="var(--credit-axis)"
                                            strokeWidth={2}
                                            strokeDasharray="4 3"
                                            fill="none"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>

                    {/* Rendered only when there is something to render.
                        An empty dashed box the width of the page saying "No
                        purchases yet" took more room than the table would have and
                        told the reader nothing they could act on - the Buy credits
                        button is already in the header, and the trend above now
                        answers "how often am I topping up". */}
                    {purchases.length > 0 && (
                        <section>
                            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Purchases</h2>
                            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-neutral-50 text-left text-xs text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-400">
                                            <tr>
                                                <th className="px-4 py-2.5 font-medium">Date</th>
                                                <th className="px-4 py-2.5 font-medium">Credits</th>
                                                <th className="px-4 py-2.5 font-medium">Paid</th>
                                                <th className="px-4 py-2.5 font-medium">Status</th>
                                                <th className="px-4 py-2.5 font-medium">Receipt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {purchases.map((p) => (
                                                <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800">
                                                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{when(p.createdAt)}</td>
                                                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">+{p.credits.toLocaleString()}</td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-neutral-900 dark:text-neutral-100">{money(p.amount, p.currency)}</td>
                                                    <td className="px-4 py-3">
                                                        {/* A PENDING payment is not a purchase yet, and is
                                                            counted in no total on this page. */}
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                'text-xs',
                                                                p.status === 'COMPLETED'
                                                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                                                    : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                                                            )}
                                                        >
                                                            {p.status.toLowerCase()}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                                        {p.paymentId ?? '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </ScrollArea>

            {/* ── History panel ──
                A real docked column, not a Sheet: a Sheet is modal, and the
                point is to read what you spent WHILE looking at the balance and
                purchases behind it. Fixed to the viewport's right edge and inset
                by the shell's own gutter so it lines up with the page card. */}
            <AnimatePresence initial={false}>
                {historyOpen && (
                    <motion.div
                        key="history-panel"
                        // `x` in percent so it starts exactly off-screen whatever
                        // width it has been dragged to.
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                        className="fixed right-3 top-3 bottom-3 z-40 flex overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
                        style={{
                            width: historyWidth,
                            maxWidth: '92vw',
                            transition: historyResizing ? 'none' : undefined,
                        }}
                    >
                        {/* Drag handle, keyboard-operable too - a resize that only
                            works with a mouse is not a control everyone can reach. */}
                        <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize history panel"
                            aria-valuenow={historyWidth}
                            aria-valuemin={380}
                            aria-valuemax={900}
                            tabIndex={0}
                            onMouseDown={(e) => { e.preventDefault(); startHistoryResize(e.clientX, historyWidth) }}
                            onTouchStart={(e) => { const t = e.touches[0]; if (t) startHistoryResize(t.clientX, historyWidth) }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft') { e.preventDefault(); setHistoryWidth((w) => clampHistory(w + 24)) }
                                if (e.key === 'ArrowRight') { e.preventDefault(); setHistoryWidth((w) => clampHistory(w - 24)) }
                            }}
                            className="group absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-neutral-900/40 focus:bg-neutral-900/40 focus:outline-none dark:hover:bg-white/30 dark:focus:bg-white/30"
                        >
                            <span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-neutral-600" />
                        </div>

                        <div className="flex h-full w-full min-w-0 flex-col">
                            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                                    <Receipt className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                    Transaction history
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setHistoryOpen(false)}
                                    aria-label="Close history"
                                    className="cursor-pointer rounded-lg p-1.5 text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {/* NO ScrollArea here. `TransactionsClient embedded`
                                now scrolls its own list so the title and the tab
                                bar stay put; wrapping it again would give the
                                panel two nested scrollbars and let the outer one
                                carry the tabs off-screen anyway - which is the
                                bug this was meant to fix. */}
                            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                                <TransactionsClient embedded />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function Empty({ icon, title, body }: { icon: 'empty-search'; title: string; body: string }) {
    return (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center dark:border-neutral-800">
            <AnimatedIcon name={icon} size={36} motion="always" className="mx-auto mb-3 text-neutral-600 dark:text-neutral-500" />
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{body}</p>
        </div>
    )
}
