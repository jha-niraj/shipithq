"use client"

import {
    Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"

// A chart the assistant drew with a ```chart fence (plan/ai-chat, AC-6). Loaded
// only when a reply contains one, so recharts stays out of the panel's bundle.
//
// Greys only: the palette is monochrome. Every mark is `currentColor`, set by the
// wrapper per theme, and series are told apart by opacity (and, for lines, by dash)
// rather than by hue.

export interface ChartSpec {
    type: "bar" | "line" | "pie"
    title?: string
    labels: string[]
    series: Array<{ name: string; data: number[] }>
    unit?: string
}

/** Validate a spec parsed from model output. Anything malformed is shown as code. */
export function readChartSpec(raw: unknown): ChartSpec | null {
    if (!raw || typeof raw !== "object") return null
    const s = raw as Partial<ChartSpec>
    if (s.type !== "bar" && s.type !== "line" && s.type !== "pie") return null
    if (!Array.isArray(s.labels) || s.labels.length === 0 || s.labels.length > 40) return null
    if (!Array.isArray(s.series) || s.series.length === 0 || s.series.length > 4) return null
    for (const series of s.series) {
        if (!series || typeof series.name !== "string" || !Array.isArray(series.data)) return null
        if (series.data.some((n) => typeof n !== "number" || !Number.isFinite(n))) return null
    }
    return {
        type: s.type,
        title: typeof s.title === "string" ? s.title.slice(0, 80) : undefined,
        labels: s.labels.map((l) => String(l).slice(0, 24)),
        series: s.series.map((x) => ({ name: x.name.slice(0, 32), data: x.data })),
        unit: typeof s.unit === "string" ? s.unit.slice(0, 16) : undefined,
    }
}

const OPACITY = [0.9, 0.55, 0.3, 0.15]
const DASH = [undefined, "5 4", "2 3", "8 3"]
const AXIS = { tick: { fill: "currentColor", fontSize: 11, opacity: 0.7 }, tickLine: false, axisLine: false } as const

function TooltipBox({ active, payload, label, unit }: {
    active?: boolean
    payload?: Array<{ name?: string | number; value?: unknown }>
    label?: string | number
    unit?: string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-900">
            {label !== undefined && <p className="mb-0.5 font-semibold text-neutral-900 dark:text-white">{label}</p>}
            {payload.map((p) => (
                <p key={String(p.name)} className="text-neutral-700 dark:text-neutral-300">
                    {p.name}: {Number(p.value ?? 0).toLocaleString()}{unit ? ` ${unit}` : ""}
                </p>
            ))}
        </div>
    )
}

export default function ChatChart({ spec }: { spec: ChartSpec }) {
    const data = spec.labels.map((label, i) => {
        const row: Record<string, string | number> = { label }
        for (const s of spec.series) row[s.name] = s.data[i] ?? 0
        return row
    })
    const short = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}k` : String(v))
    const legend = spec.series.length > 1

    return (
        <figure className="my-2 w-full rounded-xl border border-neutral-200 bg-white p-3 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
            {spec.title && <figcaption className="mb-2 text-sm font-semibold">{spec.title}</figcaption>}
            <ResponsiveContainer width="100%" height={180}>
                {spec.type === "pie" ? (
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey={spec.series[0]!.name}
                            nameKey="label"
                            outerRadius={66}
                            innerRadius={34}
                            stroke="var(--background, #fff)"
                            strokeWidth={2}
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill="currentColor" fillOpacity={Math.max(0.12, 0.9 - i * (0.75 / Math.max(1, data.length - 1)))} />
                            ))}
                        </Pie>
                        <Tooltip content={<TooltipBox unit={spec.unit} />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                ) : spec.type === "line" ? (
                    <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                        <XAxis dataKey="label" {...AXIS} />
                        <YAxis {...AXIS} tickFormatter={short} width={40} />
                        <Tooltip content={<TooltipBox unit={spec.unit} />} />
                        {legend && <Legend wrapperStyle={{ fontSize: 11 }} />}
                        {spec.series.map((s, i) => (
                            <Line
                                key={s.name}
                                dataKey={s.name}
                                type="monotone"
                                stroke="currentColor"
                                strokeOpacity={OPACITY[i]}
                                strokeDasharray={DASH[i]}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                ) : (
                    <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                        <XAxis dataKey="label" {...AXIS} />
                        <YAxis {...AXIS} tickFormatter={short} width={40} />
                        <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.06 }} content={<TooltipBox unit={spec.unit} />} />
                        {legend && <Legend wrapperStyle={{ fontSize: 11 }} />}
                        {spec.series.map((s, i) => (
                            <Bar key={s.name} dataKey={s.name} fill="currentColor" fillOpacity={OPACITY[i]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        ))}
                    </BarChart>
                )}
            </ResponsiveContainer>
        </figure>
    )
}
