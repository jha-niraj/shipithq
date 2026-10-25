'use client';

import { ArrowRight } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppLink } from '../app-link';
import { cn } from '../../lib/utils';
import { CHART_AXIS_PROPS, CHART_BAR_CURSOR, CHART_GRID_PROPS, CHART_MONO, CHART_TOOLTIP_STYLE, seriesColor } from '../../lib/chart-theme';
import { ChartEmpty } from './chart-empty';
import { useChartMotion } from '../../hooks/use-chart-motion';

/**
 * The house chart panels (Niraj, 2026-10-18 - the /home and /students style, for every first page; AGENTS.md "First
 * pages carry stats and charts"). One metric per chart in its real unit, neutral ink, amber on the ONE datum to look at
 * (the latest point, or the lowest bar), a null value is a gap / a missing bar - never 0 - and an all-empty chart is
 * `ChartEmpty`. Evenly spaced axis labels, thinned from the END (`equidistantPreserveEnd`) so the newest bucket - this month, the amber datum - always keeps its label.
 */

export function ChartPanel({ title, hint, href, className, children }: {
    title: string; hint?: React.ReactNode; href?: string; className?: string; children: React.ReactNode;
}) {
    return (
        <section className={cn('flex min-w-0 flex-col rounded-2xl border border-border/60 bg-card p-4', className)}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{title}</h2>
                    {hint && <p className="truncate text-xs text-neutral-500">{hint}</p>}
                </div>
                {href && (
                    <AppLink href={href} className="inline-flex shrink-0 items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                        View <ArrowRight className="h-3 w-3" />
                    </AppLink>
                )}
            </div>
            {children}
        </section>
    );
}

/** `gapNote` is what the tooltip says over a null point (a gap) - e.g. "payroll not run" - instead of "Nothing recorded". */
export interface ChartPoint { label: string; value: number | null; note?: string; gapNote?: string }

/**
 * Value formats: '%' (attendance, scores), money (compact on the axis, full in the tooltip), or a count.
 * Money is `unit="money"` plus `currency` (the school's ISO code, e.g. "NPR" / "INR"; null = unknown, figures print
 * bare - never a guessed code). The legacy `unit="NPR"` still works and means money in NPR unless `currency` overrides it.
 */
const isMoney = (unit: string | undefined) => unit === 'money' || unit === 'NPR';
const moneyCode = (unit: string | undefined, currency: string | null | undefined) =>
    currency !== undefined ? currency : unit === 'NPR' ? 'NPR' : null;
const fmt = (unit: string | undefined, currency?: string | null) => (v: number) => {
    if (unit === '%') return `${v}%`;
    if (isMoney(unit)) {
        const code = moneyCode(unit, currency);
        const n = Math.round(v).toLocaleString();
        return code ? `${code} ${n}` : n;
    }
    return v.toLocaleString();
};
/** Compact axis money: 1.5k / 12k / 2.5L - one decimal under 10 so ticks never repeat ("2k, 2k" at 1,500 and 2,250). */
const compact = (v: number, div: number, suffix: string) => {
    const n = v / div;
    return `${Math.abs(n) < 10 && !Number.isInteger(n) ? n.toFixed(1).replace(/\.0$/, '') : Math.round(n)}${suffix}`;
};
const axisFmt = (unit: string | undefined) => (v: number) =>
    isMoney(unit) ? (Math.abs(v) >= 100_000 ? compact(v, 100_000, 'L') : Math.abs(v) >= 1000 ? compact(v, 1000, 'k') : `${v}`) : fmt(unit)(v);

/**
 * Headroom (Niraj, 2026-10-21: "currently it is going up to 3K, so we can add 4K and 5K; if it is going up to 8, then
 * 9 and 10"): the top of the y axis is the data's max plus a fifth, rounded up to a nice number (3k -> 4k, 8 -> 10), so the highest point never touches the top edge and the axis ends on a round label. Percent charts stop at 100.
 */
export function niceAxisMax(max: number, unit?: string): number {
    if (!(max > 0)) return unit === '%' ? 100 : 1;
    const target = max * 1.2;
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    // Small counts stay on whole steps (allowDecimals is off on every axis); bigger values may land on 1.5 / 2.5.
    const steps = pow < 10 ? [1, 2, 3, 4, 5, 6, 8, 10] : [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    const nice = steps.map((m) => m * pow).find((n) => n >= target) ?? 10 * pow;
    return unit === '%' ? Math.min(100, Math.max(nice, Math.ceil(max))) : nice;
}
const headroomDomain = (values: (number | null)[], unit: string | undefined, domain: [number, number] | undefined, headroom: boolean): [number, number | 'auto'] =>
    domain ?? (headroom ? [0, niceAxisMax(Math.max(0, ...values.map((v) => v ?? 0)), unit)] : [0, 'auto']);

/** One series over time: neutral line and faint fill, the latest point amber. */
export function TrendLineChart({ points, unit, currency, domain, height = 176, emptyMessage, name = 'Value', headroom = true, keepLastLabel = true }: {
    points: ChartPoint[]; unit?: string; currency?: string | null; domain?: [number, number]; height?: number; emptyMessage: string; name?: string;
    /** Round the axis top up past the max (default on); off restores recharts' own 'auto'. */
    headroom?: boolean;
    /**
     * When the axis has to thin its labels, keep the LAST one (this month) instead of the first. Off by default (the
     * old behaviour). The thinning counts from the start, so on a half-width chart of 12 months the label under the
     * newest point - the amber datum - was the one dropped (plan/main/school-website/scan-and-sweep.md F10).
     */
    keepLastLabel?: boolean;
}) {
    const { motion, popClass } = useChartMotion();
    const lastIndex = points.reduce((k, p, i) => (p.value !== null ? i : k), -1);
    if (lastIndex === -1) return <ChartEmpty kind="line" message={emptyMessage} height={height} />;
    const f = fmt(unit, currency);
    return (
        <div className="min-w-0" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid {...CHART_GRID_PROPS} />
                    <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval={keepLastLabel ? 'equidistantPreserveEnd' : 'equidistantPreserveStart'} minTickGap={4} />
                    <YAxis domain={headroomDomain(points.map((p) => p.value), unit, domain, headroom)} allowDecimals={false} {...CHART_AXIS_PROPS} tickFormatter={axisFmt(unit)} />
                    {/* filterNull off so hovering a gap says WHY it is a gap (recharts drops null entries by default). */}
                    <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ stroke: CHART_MONO.mark, strokeDasharray: '3 3' }} separator="" filterNull={false}
                        formatter={(v, _n, item) => [v === null || v === undefined ? (item.payload.gapNote ?? 'Nothing recorded') : `${f(Number(v))}${item.payload.note ? ` (${item.payload.note})` : ''}`, '']} />
                    <Area type="monotone" dataKey="value" name={name} stroke={CHART_MONO.line} strokeWidth={2} fill={CHART_MONO.line} connectNulls={false} {...motion}
                        dot={(p: { cx?: number; cy?: number; index?: number }) => p.cx !== undefined && p.cy !== undefined && points[p.index ?? -1]?.value !== null
                            ? <circle key={`d${p.index}`} cx={p.cx} cy={p.cy} r={p.index === lastIndex ? 4 : 2.5} fill={p.index === lastIndex ? seriesColor(0) : CHART_MONO.mark} stroke="none" className={p.index === lastIndex ? popClass : undefined} />
                            : <g key={`d${p.index}`} />}
                        activeDot={{ r: 4, fill: CHART_MONO.mark, stroke: 'none' }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/** One bar per category in its real unit; the lowest (or none) amber. Categories with no value are listed under it. */
export function CategoryBarChart({ bars, unit, currency, domain, height = 176, emptyMessage, highlight = 'lowest', highlightLabel, missingWord = 'Nothing yet', name = 'Value', headroom = true }: {
    bars: ChartPoint[]; unit?: string; currency?: string | null; domain?: [number, number]; height?: number; emptyMessage: string; headroom?: boolean;
    /** Which bar is amber: the lowest, the highest (the largest debt), none - or `highlightLabel` names it. */
    highlight?: 'lowest' | 'highest' | 'none'; highlightLabel?: string; missingWord?: string; name?: string;
}) {
    const { motion } = useChartMotion();
    const known = bars.filter((b) => b.value !== null);
    const missing = bars.filter((b) => b.value === null);
    if (known.length === 0) return <ChartEmpty message={emptyMessage} height={height} />;
    const extreme = highlightLabel ? null : known.length > 1 && highlight === 'lowest' ? Math.min(...known.map((b) => b.value!))
        : known.length > 1 && highlight === 'highest' ? Math.max(...known.map((b) => b.value!)) : null;
    // Amber marks ONE datum: when several bars share the lowest (or highest), none is marked (exam browser pass F15/F78).
    const lowest = extreme !== null && known.filter((b) => b.value === extreme).length === 1 ? extreme : null;
    const f = fmt(unit, currency);
    return (
        <div className="min-w-0">
            <div className="min-w-0" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={known} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval="equidistantPreserveEnd" minTickGap={2} />
                        <YAxis domain={headroomDomain(known.map((b) => b.value), unit, domain, headroom)} allowDecimals={false} {...CHART_AXIS_PROPS} tickFormatter={axisFmt(unit)} />
                        <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_BAR_CURSOR} separator=""
                            formatter={(v, _n, item) => [`${f(Number(v))}${item.payload.note ? ` (${item.payload.note})` : ''}`, '']} />
                        <Bar dataKey="value" name={name} radius={[3, 3, 0, 0]} {...motion} maxBarSize={32}>
                            {known.map((b) => <Cell key={b.label} fill={(highlightLabel ? b.label === highlightLabel && (b.value ?? 0) > 0 : b.value === lowest) ? seriesColor(0) : CHART_MONO.mark} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {missing.length > 0 && (
                <p className="mt-2 truncate text-xs text-neutral-500" title={missing.map((m) => m.label).join(', ')}>
                    {missingWord}: {missing.map((m) => m.label).join(', ')}
                </p>
            )}
        </div>
    );
}

/**
 * Two series of the SAME unit side by side per category (billed vs paid, needed vs available): two neutral shades,
 * a key under it, and the categories where the second falls short of the first can be marked amber (`shortAmber`).
 * Never two units - that is two charts.
 */
export function SplitBarChart({ bars, first, second, unit, currency, height = 176, emptyMessage, shortAmber = false, headroom = true }: {
    bars: { label: string; a: number | null; b: number | null }[];
    first: string;
    second: string;
    unit?: string;
    /** Money only: the school's currency code (null = bare figures). */
    currency?: string | null;
    height?: number;
    emptyMessage: string;
    shortAmber?: boolean;
    headroom?: boolean;
}) {
    const { motion } = useChartMotion();
    const known = bars.filter((x) => x.a !== null || x.b !== null);
    if (known.length === 0) return <ChartEmpty message={emptyMessage} height={height} />;
    const f = fmt(unit, currency);
    const A = '#525252';
    const B = '#a3a3a3';
    return (
        <div className="min-w-0">
            <div className="min-w-0" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={known} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barGap={2}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="label" {...CHART_AXIS_PROPS} interval="equidistantPreserveEnd" minTickGap={2} />
                        <YAxis domain={headroomDomain(known.flatMap((x) => [x.a, x.b]), unit, undefined, headroom)} allowDecimals={false} {...CHART_AXIS_PROPS} tickFormatter={axisFmt(unit)} />
                        <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_BAR_CURSOR} formatter={(v, n) => [v === null || v === undefined ? '-' : f(Number(v)), String(n)]} />
                        <Bar dataKey="a" name={first} fill={A} radius={[3, 3, 0, 0]} {...motion} maxBarSize={18} />
                        <Bar dataKey="b" name={second} radius={[3, 3, 0, 0]} {...motion} maxBarSize={18}>
                            {known.map((x) => <Cell key={x.label} fill={shortAmber && x.a !== null && x.b !== null && x.b < x.a ? seriesColor(0) : B} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: A }} />{first}</li>
                <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: B }} />{second}{shortAmber ? ' (amber when short)' : ''}</li>
            </ul>
        </div>
    );
}
