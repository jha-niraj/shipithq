import {
	CHART_MONO,
	CHART_SERIES,
	CHART_STATUS,
} from "../../lib/chart-theme";

/**
 * Grain on every chart (Niraj, 2026-10-19: "use the same gradient for these charts").
 *
 * The GrainCover recipe carried onto chart marks: each bar, area and pie slice is
 * filled with a vertical gradient - a light creamy tint at the top, the validated
 * palette hue in the middle, a deeper tone at the base - with the same fractal-noise
 * grain laid over it.
 *
 * How it reaches every chart without touching each one: this component is mounted
 * ONCE per app (root layout) as a hidden SVG holding the gradients and the grain
 * filter under fixed ids, plus a stylesheet that swaps a mark's flat `fill="#hex"`
 * for the matching gradient. A CSS `fill` beats recharts' presentation attribute, so
 * charts keep passing plain hexes - and legends, tooltips and swatches (which read the
 * same prop) keep the solid validated colour.
 *
 * The validated hue stays the middle stop, so a bar still reads as that colour and the
 * palette's contrast / CVD validation (chart-theme.ts) still describes it. A hex that
 * is not listed here stays flat but still gets the grain. Add a colour to EXTRA when a
 * chart uses one outside the theme.
 *
 */

/** House colours used by charts outside the theme constants (greys, rating tones). */
const EXTRA = [
	"#525252", "#6b6b6b", "#8a8a8a", "#a3a3a3", "#b5b5b5", "#d4d4d4", "#e5e5e5",
	"#059669", "#e11d48", "#0f766e", "#b45309",
] as const;

const CREAM = "#fbf3df";
const DEEP = "#000000";

function rgb(hex: string): [number, number, number] {
	const h = hex.replace("#", "");
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function mix(hex: string, other: string, amount: number): string {
	const a = rgb(hex);
	const b = rgb(other);
	return (
		"#" +
		a
			.map((v, i) => Math.round(v + ((b[i] ?? 0) - v) * amount).toString(16).padStart(2, "0"))
			.join("")
	);
}

export const CHART_GRAIN_COLORS: readonly string[] = Array.from(
	new Set(
		[...CHART_SERIES, CHART_MONO.line, CHART_MONO.mark, ...Object.values(CHART_STATUS), ...EXTRA].map(
			(c) => c.toLowerCase(),
		),
	),
);

/** The grain filter id - applied by the stylesheet below to every bar group, area and slice. */
export const CHART_GRAIN_FILTER_ID = "gk-chart-grain";

const key = (hex: string) => hex.slice(1);

function stylesheet(): string {
	const rules: string[] = [];
	for (const c of CHART_GRAIN_COLORS) {
		const k = key(c);
		const sel = (inner: string) => `${inner}[fill="${c}" i]`;
		rules.push(
			`${sel(".recharts-bar-rectangle path")},${sel(".recharts-bar-rectangle .recharts-rectangle")},${sel(".recharts-pie-sector path")},${sel(".recharts-sector")}{fill:url(#gk-cg-v-${k})}`,
			`.gk-chart-hbars ${sel(".recharts-bar-rectangle path")}{fill:url(#gk-cg-h-${k})}`,
			`${sel(".recharts-area-area")}{fill:url(#gk-cg-a-${k});fill-opacity:1}`,
		);
	}
	rules.push(
		`.recharts-bar-rectangles,.recharts-area-area,.recharts-pie-sector{filter:url(#${CHART_GRAIN_FILTER_ID})}`,
		"@media print{.recharts-bar-rectangles,.recharts-area-area,.recharts-pie-sector{filter:none}}",
	);
	return rules.join("\n");
}

const CSS = stylesheet();

/**
 * Mount once per app, inside <body>. Server-safe (no hooks); renders nothing visible.
 */
export function ChartGrainDefs() {
	return (
		<>
			<style>{CSS}</style>
			<svg
				aria-hidden="true"
				focusable="false"
				width="0"
				height="0"
				style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
			>
				<defs>
					{CHART_GRAIN_COLORS.map((c) => {
						const k = key(c);
						const top = mix(c, CREAM, 0.34);
						const base = mix(c, DEEP, 0.22);
						return (
							<g key={c}>
								{/* Bars and slices: cream top, the hue, a deeper base. */}
								<linearGradient id={`gk-cg-v-${k}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={top} />
									<stop offset="50%" stopColor={c} />
									<stop offset="100%" stopColor={base} />
								</linearGradient>
								{/* Horizontal bars: deep at the baseline (left), light at the cap. */}
								<linearGradient id={`gk-cg-h-${k}`} x1="0" y1="0" x2="1" y2="0">
									<stop offset="0%" stopColor={base} />
									<stop offset="50%" stopColor={c} />
									<stop offset="100%" stopColor={top} />
								</linearGradient>
								{/* Areas: a soft wash under the line, fading out at the base. */}
								<linearGradient id={`gk-cg-a-${k}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={c} stopOpacity={0.32} />
									<stop offset="55%" stopColor={top} stopOpacity={0.14} />
									<stop offset="100%" stopColor={top} stopOpacity={0} />
								</linearGradient>
							</g>
						);
					})}
					{/* Film grain: grey fractal noise, soft-light over the mark, clipped to it. */}
					<filter
						id={CHART_GRAIN_FILTER_ID}
						x="0"
						y="0"
						width="1"
						height="1"
						colorInterpolationFilters="sRGB"
					>
						<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} stitchTiles="stitch" result="noise" />
						<feColorMatrix
							in="noise"
							type="matrix"
							values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"
							result="grey"
						/>
						<feBlend in="SourceGraphic" in2="grey" mode="soft-light" result="blend" />
						<feComposite in="blend" in2="SourceGraphic" operator="arithmetic" k1={0} k2={0.42} k3={0.58} k4={0} result="mixed" />
						<feComposite in="mixed" in2="SourceGraphic" operator="in" />
					</filter>
				</defs>
			</svg>
		</>
	);
}
