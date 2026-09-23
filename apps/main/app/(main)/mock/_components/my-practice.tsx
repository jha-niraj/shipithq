'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts'
import { Button } from '@repo/ui/components/ui/button'
import { AnimatedIcon } from '@repo/ui/components/animated-icons'
import { StatBand, StatBandSkeleton } from '@repo/ui/components/ui/stat-band'
import { Clock, Flame, Mic, Star } from 'lucide-react'
import { getMyMockStats, type MyMockStats } from '@/actions/(main)/mockvoice/stats.action'
import { ActivityChart, type ActivityPoint } from '@/components/common/activity-chart'
import { MOCK_CATEGORIES } from '../voice/_constants/mock-categories'

/**
 * The signed-in user's own practice. MK-4 in plan/mock/tasks.md.
 *
 * ── The empty state is the DEFAULT, not an edge case ─────────────────────────
 * `mock_voice_session` holds zero rows, so every user arrives here with nothing.
 * A dashboard of zeroes and flat charts would be the normal experience, which is
 * why the no-sessions branch is a real screen with one obvious action rather
 * than a grid of empty cards.
 */

const labelFor = (value: string) =>
    MOCK_CATEGORIES.find((c) => c.value === value)?.label ?? value
const iconFor = (value: string) =>
    MOCK_CATEGORIES.find((c) => c.value === value)?.icon ?? 'learning'

export function MyPractice() {
    const [stats, setStats] = useState<MyMockStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        getMyMockStats().then((r) => {
            if (!alive) return
            setStats(r.success ? r.data : null)
            setLoading(false)
        })
        return () => { alive = false }
    }, [])

    if (loading) {
        return (
            <div className="mt-6 space-y-4">
                <StatBandSkeleton count={4} cols={4} />
                <div className="h-72 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
        )
    }

    // The zero case keeps the page's SHAPE.
    //
    // It used to return one dashed box floating in a large empty area, which is
    // what Niraj meant by "not done yet" - the page had nothing to hold on to.
    // Every other overview in the product now shows its stat row and its chart at
    // zero, because an axis with nothing on it is a true reading and a page that
    // changes shape the first time you use it is a worse one. The invitation is
    // one panel among them rather than the whole screen. See JB-7.
    if (!stats || stats.total === 0) {
        return (
            <div className="mt-6 space-y-6">
                <StatBand
                    cols={4}
                    items={[
                        { icon: Mic, label: 'Sessions', value: '0', hint: 'none yet' },
                        { icon: Clock, label: 'Practice time', value: '-', hint: 'not recorded yet' },
                        { icon: Star, label: 'Average score', value: '-', hint: 'none scored yet' },
                        { icon: Flame, label: 'Streak', value: '-', hint: 'practise today to start one' },
                    ]}
                />

                <section>
                    <div className="mb-3">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Practice over time</h2>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Last 30 days.</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                        <ActivityChart data={emptyThirtyDays()} unit="interview" />
                    </div>
                </section>

                <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center dark:border-neutral-700">
                    <AnimatedIcon name="voice" size={40} motion="always" className="mx-auto mb-3 text-neutral-500 dark:text-neutral-400" />
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                        You have not practised yet
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                        A mock interview is a real conversation with an AI interviewer: it asks
                        follow-ups, you answer out loud, and afterwards you get a transcript and
                        a breakdown of how you did.
                    </p>
                    <Button asChild className="mt-5 cursor-pointer">
                        <Link href="/mock/voice">Start your first interview</Link>
                    </Button>
                </div>
            </div>
        )
    }

    const { total, completed, minutes, averageScore, scoredSessions, streak, trend, byCategory } = stats
    const maxCat = Math.max(...byCategory.map((c) => c.sessions), 1)

    return (
        <div className="mt-6 space-y-8">
            {/* The SAMPLE is shown beside the average. "4.2" from one session
                and "4.2" from forty are different claims, and only one of them
                is worth acting on. */}
            <StatBand
                cols={4}
                items={[
                    { icon: Mic, label: 'Sessions', value: total.toLocaleString(), hint: `${completed} completed` },
                    { icon: Clock, label: 'Practice time', value: minutes > 0 ? `${minutes}m` : '-', hint: minutes > 0 ? 'across all sessions' : 'not recorded yet' },
                    {
                        icon: Star,
                        label: 'Average score',
                        value: averageScore !== null ? `${averageScore}/5` : '-',
                        hint: scoredSessions > 0 ? `from ${scoredSessions} scored` : 'none scored yet',
                    },
                    { icon: Flame, label: 'Streak', value: streak > 0 ? `${streak}d` : '-', hint: streak > 0 ? 'consecutive days' : 'practise today to start one' },
                ]}
            />

            {/* TWO charts, not one chart with two y-axes.
                What stood here was a dual-axis LineChart: sessions on the left
                scale, average score (1-5) on the right. The comment beside it
                argued that sharing one axis "would flatten whichever is smaller",
                which correctly identifies the problem and picks the wrong fix.

                A second y-scale is arbitrary, and everything the reader infers
                from the two lines TOGETHER - where they cross, which is higher,
                whether they diverge - is an artefact of the two ranges somebody
                chose, not something in the data. Slide either axis and the story
                changes. Small multiples keep both series honest: a shared x-axis
                so the dates line up, separate y-axes so neither is flattened, and
                no invitation to read a relationship that is not there.

                Gridlines are solid rather than `strokeDasharray="3 3"` for the
                same reason a dashed line is: a second rhythm the eye has to
                filter out before it can read the data. */}
            <section>
                <div className="mb-3">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Practice over time</h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Last 30 days.</p>
                </div>

                <div className="grid gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 [--mk-axis:#525252] [--mk-grid:#e5e5e5] [--mk-ink:#171717] dark:[--mk-axis:#a3a3a3] dark:[--mk-grid:#262626] dark:[--mk-ink:#f5f5f5]">
                    <TrendChart
                        title="Sessions"
                        data={trend}
                        dataKey="sessions"
                        allowDecimals={false}
                        formatValue={(v) => (v === null ? "-" : String(v))}
                    />
                    {/* Score is plotted only if anything has been scored. An axis of
                        1-5 with no points on it says a session was rated badly
                        rather than not rated at all. */}
                    {scoredSessions > 0 && (
                        <TrendChart
                            title="Average score"
                            data={trend}
                            dataKey="score"
                            domain={[0, 5]}
                            connectNulls={false}
                            formatValue={(v) => (v === null ? "not scored" : `${v}/5`)}
                        />
                    )}
                </div>
            </section>

            {byCategory.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Practice by category</h2>
                    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                        {byCategory.map((c) => (
                            <div key={c.category} className="flex items-center gap-4 border-b border-neutral-200 px-4 py-3 last:border-b-0 dark:border-neutral-800">
                                <AnimatedIcon name={iconFor(c.category)} size={18} className="shrink-0 text-neutral-900 dark:text-neutral-100" />
                                <span className="w-40 shrink-0 truncate text-sm text-neutral-900 dark:text-neutral-100">{labelFor(c.category)}</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                    <div
                                        className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100"
                                        style={{ width: `${Math.max((c.sessions / maxCat) * 100, 3)}%` }}
                                    />
                                </div>
                                <span className="w-10 shrink-0 text-right font-mono text-xs text-neutral-600 dark:text-neutral-400">{c.sessions}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

/**
 * One series, one y-axis, one title. The title names the series, so there is no
 * legend - a box with a single swatch restates the heading and costs a row.
 */
function TrendChart({
    title,
    data,
    dataKey,
    domain,
    allowDecimals = true,
    connectNulls = true,
    formatValue,
}: {
    title: string
    data: MyMockStats['trend']
    dataKey: 'sessions' | 'score'
    domain?: [number, number]
    allowDecimals?: boolean
    connectNulls?: boolean
    formatValue: (v: number | null) => string
}) {
    return (
        <div>
            <p className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">{title}</p>
            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--mk-grid)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            tick={{ fontSize: 12, fill: 'var(--mk-axis)' }}
                            axisLine={false} tickLine={false} minTickGap={28}
                        />
                        {/* width=44 holds two digits plus padding. A narrower axis
                            renders "10" as "0", which is a WRONG number rather than
                            a clipped one. */}
                        <YAxis
                            width={44}
                            allowDecimals={allowDecimals}
                            domain={domain}
                            tick={{ fontSize: 12, fill: 'var(--mk-axis)' }}
                            axisLine={false} tickLine={false}
                        />
                        <Tooltip
                            cursor={{ stroke: 'var(--mk-axis)' }}
                            contentStyle={{
                                background: 'var(--popover)', border: '1px solid var(--border)',
                                borderRadius: 10, fontSize: 12, color: 'var(--popover-foreground)',
                            }}
                            labelFormatter={(d) => new Date(String(d)).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                            formatter={(v) => [formatValue(v as number | null), title] as [string, string]}
                        />
                        <Line
                            type="monotone" dataKey={dataKey} name={title}
                            stroke="var(--mk-ink)" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                            connectNulls={connectNulls}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

/**
 * A full 30-day run of zeros ending today, in UTC.
 *
 * `getMyMockStats` returns an empty `trend` when there are no sessions, and an
 * empty array draws no axis at all. The chart is built to render a real one with
 * nothing on it, so it needs the days.
 */
function emptyThirtyDays(): ActivityPoint[] {
    const out: ActivityPoint[] = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i))
        out.push({ date: d.toISOString().slice(0, 10), value: 0 })
    }
    return out
}
