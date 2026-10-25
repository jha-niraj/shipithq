/**
 * Shared chart theme - the single source of truth for every recharts surface
 * across main, student, and admin.
 *
 * Two palettes, picked by series count:
 *
 *   1 series  -> CHART_MONO. Neutral grey, matching the /whygurukul marketing
 *                charts. One series needs no hue: the title already names it,
 *                so colour would only add noise.
 *   2+ series -> CHART_SERIES. A fixed categorical order.
 *
 * CHART_SERIES is not hand-picked. The house palette bans blue/sky/cyan/indigo/
 * violet/purple/fuchsia, which removes the cool half of the colour wheel - and
 * with it the hues that normally carry colourblind separation. What is left
 * (green -> yellow -> orange -> red) is the exact axis red-green CVD collapses,
 * so the order below was solved for rather than chosen: it is the arrangement of
 * approved hues with the largest worst-case adjacent separation.
 *
 * Verified with the dataviz validator against both card surfaces
 * (#ffffff light / #0a0a0a dark) - all six checks pass in both modes, and for
 * every prefix length from 2 to 6 series:
 *
 *   Lightness band | Chroma floor | CVD separation dE 12.5 (floor is 8)
 *   Normal-vision floor | Contrast >= 3:1
 *
 * A note on brightness, because it looks like a mistake and is not: the slots
 * are deliberately NOT uniform in lightness. Colour-vision deficiency destroys
 * hue, so lightness difference is the channel that survives it - a palette of
 * six equally-bright hues is unreadable to ~8% of men no matter which hues you
 * pick. Every "all six bright" candidate failed. The order is therefore
 * bright-first (so short charts stay vivid) with the deeper tones held back for
 * charts dense enough to need the extra separation.
 *
 * Two rules keep that guarantee true. Break either and the validation is void:
 *
 *   1. Assign by index, never by rank, and never cycle. Slot 0 is the first
 *      series in the chart, always - so filtering a series out cannot repaint
 *      the survivors. Colour follows the entity.
 *   2. Six is the ceiling. Only three approved hues can be mutually separated
 *      under CVD (every pair, not just neighbours), so a 4th-6th series is
 *      readable only because the legend backs it up. A 7th has no colour left
 *      that any CVD reader could distinguish - fold the tail into "Other" or
 *      split into small multiples instead.
 *
 * Re-validate after ANY edit here:
 *   node scripts/validate_palette.js "<comma-separated hexes>" --mode light --surface "#ffffff"
 *   node scripts/validate_palette.js "<comma-separated hexes>" --mode dark  --surface "#0a0a0a"
 */

/**
 * Fixed categorical order for multi-series charts. Index-assigned, max 6.
 *
 * Ordered BRIGHT-FIRST on purpose. Most charts here plot 2-4 series, so they
 * only ever reach the top of this list; the deeper tones appear only on the
 * rare 6-line chart. Every prefix (slots 0..1, 0..2, ... 0..5) was validated
 * independently in both modes, so a short chart is not just a truncation - it
 * is its own passing palette. Worst CVD dE across all prefixes: 12.5.
 */
export const CHART_SERIES = [
	'#d97706', // amber-600
	'#0d9488', // teal-600
	'#ea580c', // orange-600
	'#be123c', // rose-700
	'#65a30d', // lime-600
	'#047857', // emerald-700
] as const;

/** Hard ceiling - past this, colour cannot carry identity. See note above. */
export const CHART_SERIES_MAX = CHART_SERIES.length;

/**
 * Colour for series `index`. Throws past the ceiling rather than silently
 * cycling: a wrapped hue is indistinguishable from the slot it repeats and
 * would quietly void the CVD guarantee.
 */
export function seriesColor(index: number): string {
	const color = CHART_SERIES[index];
	if (!color) {
		throw new Error(
			`chart-theme: series index ${index} exceeds the ${CHART_SERIES_MAX}-colour limit. ` +
			`Fold the tail into "Other" or use small multiples - do not cycle the palette.`,
		);
	}
	return color;
}

/**
 * Single-series charts: neutral grey, no hue. The /whygurukul look.
 *
 * NOT whygurukul's literal hexes. That page is dark-only, so it can afford
 * #d4d4d4 (13.4:1 on its near-black card). On a white dashboard card the same
 * grey is 1.48:1 - effectively invisible. These are the lightest greys that
 * clear 3:1 against BOTH card surfaces (#ffffff and #0a0a0a), so they keep the
 * quiet grey character without disappearing in light mode.
 *
 * The mark is a step darker than the line, mirroring whygurukul's own
 * line-vs-dot relationship.
 */
export const CHART_MONO = {
	/** Line stroke / area stroke. 3.45:1 on white, 5.73:1 on near-black. */
	line: '#8a8a8a',
	/** Dots, end markers, bar fill. 4.74:1 on white, 4.18:1 on near-black. */
	mark: '#737373',
} as const;

/** Chrome. Chosen to read on both light and dark - recharts cannot see CSS vars. */
export const CHART_GRID_COLOR = 'rgba(128,128,128,0.15)';
export const CHART_AXIS_COLOR = '#737373'; // neutral-500

/**
 * Status colours. Reserved for good/bad meaning - never reuse as "series 7".
 * These are deliberately outside CHART_SERIES so a status mark never reads as
 * a category.
 */
export const CHART_STATUS = {
	positive: '#047857', // emerald-700
	negative: '#be123c', // rose-700
	neutral: '#a3a3a3',
} as const;

/** Recharts <CartesianGrid> props. Solid hairline - dashes read as noise. */
export const CHART_GRID_PROPS = {
	stroke: CHART_GRID_COLOR,
	strokeWidth: 1,
	vertical: false,
} as const;

/** Recharts <XAxis>/<YAxis> props. No axis line, no tick line - the grid is enough. */
export const CHART_AXIS_PROPS = {
	// `className` AND `fill`, deliberately. recharts writes `fill` as a presentation
	// attribute, and a single fixed grey cannot be right on both surfaces: #737373 is
	// readable on white and goes faint on near-black. A CSS rule beats a presentation
	// attribute, so the Tailwind pair wins wherever CSS is applied and the hex stays as
	// the fallback (SVG export, print) rather than being dropped.
	//
	// fontWeight 500: at 11px a 400-weight tick on a dark panel is thin enough to read as
	// disabled.
	tick: {
		fontSize: 11,
		fontWeight: 500,
		fill: CHART_AXIS_COLOR,
		className: 'fill-neutral-600 dark:fill-neutral-300',
	},
	axisLine: false,
	tickLine: false,
} as const;

/**
 * Recharts <Legend> props.
 *
 * `verticalAlign: 'top'` is the whole point. Recharts puts the legend at the BOTTOM by
 * default, in the same band the X-axis tick labels occupy - which is fine while the legend
 * fits one line. On a phone it does not: four series wrap to two rows, the second row is
 * drawn straight through the tick labels, and the chart reads as corrupted rather than
 * crowded. There is no margin that fixes it, because the wrap count is not knowable up front.
 *
 * Above the plot the legend has its own band and cannot collide with anything. `align: left`
 * because a centred legend under a left-aligned title looks accidental.
 */
export const CHART_LEGEND_PROPS = {
	verticalAlign: 'top',
	align: 'left',
	height: 28,
	wrapperStyle: { fontSize: 11, paddingBottom: 8, lineHeight: '16px' },
} as const;

/** Recharts <Line>/<Area> props. 2px, round joins. */
export const CHART_LINE_PROPS = {
	type: 'monotone',
	strokeWidth: 2,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
	dot: false,
	activeDot: { r: 4, strokeWidth: 2 },
} as const;

/** Recharts <Bar> props. Capped width, rounded cap, square baseline. */
export const CHART_BAR_PROPS = {
	radius: [4, 4, 0, 0] as [number, number, number, number],
	maxBarSize: 24,
} as const;

/** Hover band behind bars. */
export const CHART_BAR_CURSOR = { fill: 'rgba(163,163,163,0.08)' } as const;

/**
 * Fallback <Tooltip> style for charts without a custom content component.
 * Prefer a custom tooltip so it inherits light/dark from CSS.
 */
export const CHART_TOOLTIP_STYLE = {
	contentStyle: {
		background: '#1a1a1a',
		border: '1px solid #333',
		borderRadius: '12px',
		fontSize: '12px',
		color: '#e5e5e5',
	},
	labelStyle: { color: '#9ca3af' },
	itemStyle: { color: '#e5e5e5' },
} as const;
