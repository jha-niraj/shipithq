"use client";

import LineChart, { Line } from "@repo/ui/components/charts/line-chart";
import Grid from "@repo/ui/components/charts/grid";
import { ChartTooltip } from "@repo/ui/components/charts/tooltip/chart-tooltip";
import type { ChartLine, SeriesPoint } from "@repo/db/progress";

/**
 * A Home line chart on the shared LineChart (plan/ui-pass UI-19, plan/home HOME-7/8).
 * Monochrome: the first line is ink, a second is grey, and a "previous period" line is
 * a lighter dashed grey.
 *
 * A score line only has points where something was scored, and the chart draws a line
 * through every row, so a chart of score lines keeps only the scored days; with fewer
 * than two it says so instead of drawing one dot.
 */

const STROKES = ["var(--chart-line-primary)", "var(--chart-line-secondary)"];

export interface TrendChartProps {
    series: SeriesPoint[];
    lines: ChartLine[];
    /** An extra key drawn as the previous period, light and dashed. */
    previousKey?: string;
    previousLabel?: string;
    bucket: "day" | "week";
    /** CSS aspect ratio of the plot. */
    aspectRatio?: string;
    className?: string;
}

function whenLabel(date: string, bucket: "day" | "week") {
    const d = new Date(`${date}T00:00:00Z`);
    const s = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return bucket === "week" ? `Week of ${s}` : s;
}

export default function TrendChart({ series, lines, previousKey, previousLabel = "Previous period", bucket, aspectRatio = "5 / 2", className }: TrendChartProps) {
    const scoreOnly = lines.length > 0 && lines.every((l) => l.kind === "score");
    const data = scoreOnly ? series.filter((p) => lines.some((l) => p[l.key] != null)) : series;

    if (scoreOnly && data.length < 2) {
        return (
            <div className={className} style={{ aspectRatio }}>
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-neutral-200 px-4 text-center text-xs text-neutral-500 dark:border-neutral-800">
                    {data.length === 1 ? "One score so far. The line starts with the second." : "No scores in this period yet."}
                </div>
            </div>
        );
    }

    const label = data.length
        ? `${lines.map((l) => l.label).join(" and ")}, ${whenLabel(String(data[0]!.date), bucket)} to ${whenLabel(String(data[data.length - 1]!.date), bucket)}`
        : lines.map((l) => l.label).join(" and ");

    return (
        <div role="img" aria-label={label} className={className}>
        <LineChart data={data} aspectRatio={aspectRatio} margin={{ top: 12, right: 12, bottom: 28, left: 12 }}>
            <Grid horizontal numTicksRows={4} />
            {previousKey && (
                <Line dataKey={previousKey} stroke="var(--chart-foreground-muted)" strokeWidth={1.5} dashFromIndex={0} dashArray="4,4" showHighlight={false} />
            )}
            {lines.map((l, i) => (
                <Line key={l.key} dataKey={l.key} stroke={STROKES[i] ?? STROKES[1]} strokeWidth={i === 0 ? 2.25 : 1.75} showMarkers={scoreOnly} />
            ))}
            <ChartTooltip
                rows={(point) => [
                    ...lines.map((l, i) => ({
                        color: STROKES[i] ?? STROKES[1]!,
                        label: l.label,
                        value: point[l.key] == null ? "-" : Number(point[l.key]).toLocaleString("en"),
                    })),
                    ...(previousKey ? [{ color: "var(--chart-foreground-muted)", label: previousLabel, value: Number(point[previousKey] ?? 0).toLocaleString("en") }] : []),
                ]}
                showDatePill
            />
        </LineChart>
        </div>
    );
}
