import type { CSSProperties, ReactNode } from "react";

import { cn } from "../../lib/utils";

/**
 * A decorative grainy gradient cover: blurred colour blobs with film grain on top.
 * Pure CSS (classes in styles/globals.css). Decorative only - never behind data,
 * state, tables, forms or anything printed (AGENTS.md colour carve-out, 2026-10-19).
 *
 * Every recipe follows the one that works: a muted base, one deep anchor corner,
 * a near-white highlight opposite, and a mid-tone between them.
 */
export type GrainTone =
	| "sage" | "lime" | "gold" | "clay" | "teal-night" | "ember"
	// The dark set (R5-18): one per auth screen. Same shape as teal-night and ember - a bright blob
	// top left, a near-black anchor bottom right, a warm highlight top right no lighter than ember's,
	// a deep tone bottom left - so the auth frame's scrim keeps white copy readable on every one.
	| "forest" | "rose-dusk" | "amber-night" | "lime-night" | "gold-night" | "copper" | "aurora" | "tide" | "olive" | "graphite";

/** The tones dark enough to carry white copy (under the auth frame's scrim). */
export const DARK_GRAIN_TONES = [
	"teal-night", "ember", "forest", "rose-dusk", "amber-night", "lime-night",
	"gold-night", "copper", "aurora", "tide", "olive", "graphite",
] as const satisfies readonly GrainTone[];
export type DarkGrainTone = (typeof DARK_GRAIN_TONES)[number];

const BLOB = (size: string, at: string, color: string) =>
	`radial-gradient(${size} at ${at}, ${color} 0, transparent 70%)`;

const RECIPES: Record<GrainTone, string> = {
	sage: [
		BLOB("40% 50%", "18% 30%", "#d9d6bf"),
		BLOB("45% 55%", "78% 72%", "#2f7d6d"),
		BLOB("40% 40%", "50% 105%", "#e7d49c"),
		BLOB("35% 45%", "85% 15%", "#9fb7a2"),
		"#a9b59c",
	].join(", "),
	lime: [
		BLOB("42% 50%", "20% 24%", "#eef0dc"),
		BLOB("46% 54%", "80% 78%", "#56703f"),
		BLOB("36% 44%", "80% 14%", "#d6dca2"),
		BLOB("40% 45%", "12% 88%", "#a7b38a"),
		"#b9c2a0",
	].join(", "),
	gold: [
		BLOB("42% 50%", "16% 20%", "#f3e7c6"),
		BLOB("48% 55%", "84% 80%", "#5e4512"),
		BLOB("36% 44%", "76% 16%", "#e2a944"),
		BLOB("40% 45%", "14% 90%", "#9e9a6a"),
		BLOB("25% 30%", "52% 52%", "#ecd49a"),
		"#c7a764",
	].join(", "),
	clay: [
		BLOB("42% 50%", "18% 22%", "#f1e1c8"),
		BLOB("48% 55%", "82% 78%", "#8e3b46"),
		BLOB("38% 45%", "78% 14%", "#e7a77f"),
		BLOB("40% 45%", "12% 92%", "#b98377"),
		BLOB("25% 30%", "50% 50%", "#f3d9c3"),
		"#c79a8a",
	].join(", "),
	"teal-night": [
		BLOB("45% 55%", "22% 28%", "#2f7d6d"),
		BLOB("45% 55%", "82% 82%", "#0c1a18"),
		BLOB("28% 34%", "78% 18%", "#c9b98a"),
		BLOB("40% 45%", "12% 90%", "#173a35"),
		"#1f3a37",
	].join(", "),
	ember: [
		BLOB("44% 52%", "20% 26%", "#d9763f"),
		BLOB("46% 55%", "84% 84%", "#150d08"),
		BLOB("30% 36%", "76% 16%", "#f3c58a"),
		BLOB("40% 45%", "10% 90%", "#7a3a24"),
		"#3b2418",
	].join(", "),
	"forest": [
		BLOB("44% 52%", "20% 26%", "#3f9a78"),
		BLOB("46% 55%", "84% 84%", "#07140f"),
		BLOB("30% 36%", "76% 16%", "#cfc48a"),
		BLOB("40% 45%", "10% 90%", "#1d4a3a"),
		"#173328",
	].join(", "),
	"rose-dusk": [
		BLOB("44% 52%", "20% 26%", "#c75b6e"),
		BLOB("46% 55%", "84% 84%", "#14090b"),
		BLOB("30% 36%", "76% 16%", "#f0bfa8"),
		BLOB("40% 45%", "10% 90%", "#6e2a38"),
		"#3a1a21",
	].join(", "),
	"amber-night": [
		BLOB("44% 52%", "20% 26%", "#d79a2b"),
		BLOB("46% 55%", "84% 84%", "#120c03"),
		BLOB("30% 36%", "76% 16%", "#e9c27c"),
		BLOB("40% 45%", "10% 90%", "#6e4a12"),
		"#33240c",
	].join(", "),
	"lime-night": [
		BLOB("44% 52%", "20% 26%", "#8fae3c"),
		BLOB("46% 55%", "84% 84%", "#0b1206"),
		BLOB("30% 36%", "76% 16%", "#cfca84"),
		BLOB("40% 45%", "10% 90%", "#3d5220"),
		"#222e14",
	].join(", "),
	"gold-night": [
		BLOB("44% 52%", "20% 26%", "#a87f1f"),
		BLOB("46% 55%", "84% 84%", "#0f0b04"),
		BLOB("30% 36%", "76% 16%", "#e8c788"),
		BLOB("40% 45%", "10% 90%", "#5e4512"),
		"#2b2110",
	].join(", "),
	"copper": [
		BLOB("44% 52%", "20% 26%", "#cf6a4a"),
		BLOB("46% 55%", "84% 84%", "#120807"),
		BLOB("30% 36%", "76% 16%", "#ecbf98"),
		BLOB("40% 45%", "10% 90%", "#8e3b46"),
		"#301714",
	].join(", "),
	"aurora": [
		BLOB("44% 52%", "20% 26%", "#2f8f7c"),
		BLOB("46% 55%", "84% 84%", "#0a1412"),
		BLOB("30% 36%", "76% 16%", "#d9c47e"),
		BLOB("40% 45%", "10% 90%", "#6f8f2f"),
		"#16302b",
	].join(", "),
	"tide": [
		BLOB("44% 52%", "20% 26%", "#2f7d6d"),
		BLOB("46% 55%", "84% 84%", "#0c0a0b"),
		BLOB("30% 36%", "76% 16%", "#f0b8a8"),
		BLOB("40% 45%", "10% 90%", "#5a2a35"),
		"#1f2a2a",
	].join(", "),
	"olive": [
		BLOB("44% 52%", "20% 26%", "#8a8a3c"),
		BLOB("46% 55%", "84% 84%", "#0e0d05"),
		BLOB("30% 36%", "76% 16%", "#e3c487"),
		BLOB("40% 45%", "10% 90%", "#4d4a1c"),
		"#26250f",
	].join(", "),
	"graphite": [
		BLOB("44% 52%", "20% 26%", "#6b6b70"),
		BLOB("46% 55%", "84% 84%", "#0b0b0c"),
		BLOB("30% 36%", "76% 16%", "#dcc28c"),
		BLOB("40% 45%", "10% 90%", "#2e2e33"),
		"#1c1c1f",
	].join(", "),
};

export function GrainCover({
	tone = "sage",
	animate = false,
	className,
	style,
	children,
}: {
	tone?: GrainTone;
	/** Slow drift of the colour layer; off under prefers-reduced-motion. */
	animate?: boolean;
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
}) {
	return (
		<div className={cn("gk-grain", className)} style={style}>
			<div
				aria-hidden
				className={cn("gk-grain-blobs", animate && "gk-grain-drift")}
				style={{ background: RECIPES[tone] }}
			/>
			<div aria-hidden className="gk-grain-noise" />
			{children}
		</div>
	);
}
